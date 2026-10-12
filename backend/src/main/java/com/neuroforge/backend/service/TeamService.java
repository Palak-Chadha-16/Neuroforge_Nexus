package com.neuroforge.backend.service;

import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.neuroforge.backend.dto.TeamDtos;
import com.neuroforge.backend.dto.TeamRequest;
import com.neuroforge.backend.entity.Project;
import com.neuroforge.backend.entity.ProjectMemberAssignment;
import com.neuroforge.backend.entity.Role;
import com.neuroforge.backend.entity.Team;
import com.neuroforge.backend.entity.TeamMember;
import com.neuroforge.backend.entity.User;
import com.neuroforge.backend.exception.BusinessRuleException;
import com.neuroforge.backend.repository.ProjectMemberAssignmentRepository;
import com.neuroforge.backend.repository.ProjectRepository;
import com.neuroforge.backend.repository.TeamMemberRepository;
import com.neuroforge.backend.repository.TeamRepository;
import com.neuroforge.backend.repository.UserRepository;
import com.neuroforge.backend.security.AuthUser;
import com.neuroforge.backend.security.CurrentUser;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

/**
 * Teams belong to a project. Admin/PM/PL/TL (enforced on the controller with @PreAuthorize).
 *  - Admin: every team
 *  - PM: teams of projects they manage or belong to; may create/edit/delete only for projects they manage
 * Members added to a team are also added to the project's member list, so they can see the project and be assigned tasks.
 */
@Service
@RequiredArgsConstructor
public class TeamService {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberAssignmentRepository projectMemberAssignmentRepository;
    private final AccessService access;

    // ------------------------------------------------------------------ teams

    /** GET /api/teams */
    @Transactional(readOnly = true)
    public List<TeamDtos.Summary> list() {
        AuthUser user = CurrentUser.get();

        List<Team> teams;
        if (user.isAdmin()) {
            teams = teamRepository.findAll();
        } else {
            List<Long> projectIds = access.visibleProjects(user).stream().map(Project::getId).toList();
            teams = projectIds.isEmpty() ? List.of() : teamRepository.findByProjectIdIn(projectIds);
        }

        return teams.stream()
                .sorted(Comparator.comparing(Team::getId))
                .map(team -> TeamDtos.Summary.from(team, teamMemberRepository.countByTeamId(team.getId())))
                .toList();
    }

    /** GET /api/teams/{id} - team info + member list (Member, Email, Skill, Team Role). */
    @Transactional(readOnly = true)
    public TeamDtos.Detail get(Long id) {
        Team team = find(id);
        assertCanView(CurrentUser.get(), team);
        return toDetail(team);
    }

    /** GET /api/teams/by-project/{projectId} - the single team for a project (empty → 404 from controller). */
    @Transactional(readOnly = true)
    public Optional<TeamDtos.Detail> findByProject(Long projectId) {
        AuthUser user = CurrentUser.get();
        return teamRepository.findByProjectId(projectId).stream()
                .filter(team -> {
                    try {
                        assertCanView(user, team);
                        return true;
                    } catch (AccessDeniedException e) {
                        return false;
                    }
                })
                .findFirst()
                .map(this::toDetail);
    }

    /** POST /api/teams */
    @Transactional
    public TeamDtos.Detail create(TeamRequest request) {
        AuthUser user = CurrentUser.get();

        if (request == null || request.getName() == null || request.getName().isBlank()) {
            throw new IllegalArgumentException("Team name is required");
        }
        if (request.getProjectId() == null) {
            throw new IllegalArgumentException("Project is required for team creation");
        }

        Project project = projectRepository.findById(request.getProjectId())
                .orElseThrow(() -> new EntityNotFoundException("Project not found with id " + request.getProjectId()));
        access.assertCanManage(user, project);

        // One team per project
        if (!teamRepository.findByProjectId(request.getProjectId()).isEmpty()) {
            throw new BusinessRuleException("This project already has a team. Delete the existing team first.");
        }

        String teamCode = request.getTeamCode() == null || request.getTeamCode().isBlank()
                ? nextTeamCode()
                : request.getTeamCode().trim();
        if (teamRepository.existsByTeamCodeIgnoreCase(teamCode)) {
            throw new BusinessRuleException("A team with Team ID '" + teamCode + "' already exists");
        }

        Team team = new Team();
        team.setName(request.getName().trim());
        team.setTeamCode(teamCode);
        team.setDescription(request.getDescription());
        team.setProject(project);
        team = teamRepository.save(team);

        if (request.getMemberIds() != null) {
            for (User member : resolveUsers(request.getMemberIds())) {
                attach(team, project, member, teamRoleForSystemRole(member));
            }
        }

        return toDetail(team);
    }

    /** PUT /api/teams/{id} - name / Team ID / description. */
    @Transactional
    public TeamDtos.Detail update(Long id, TeamRequest request) {
        Team team = find(id);
        assertCanManage(CurrentUser.get(), team);

        if (request.getName() != null && !request.getName().isBlank()) {
            team.setName(request.getName().trim());
        }

        if (request.getTeamCode() != null && !request.getTeamCode().isBlank()) {
            String teamCode = request.getTeamCode().trim();
            if (teamRepository.existsByTeamCodeIgnoreCaseAndIdNot(teamCode, id)) {
                throw new BusinessRuleException("A team with Team ID '" + teamCode + "' already exists");
            }
            team.setTeamCode(teamCode);
        }

        if (request.getDescription() != null) {
            team.setDescription(request.getDescription());
        }

        return toDetail(teamRepository.save(team));
    }

    /** DELETE /api/teams/{id} - clears any project link, removes members, then deletes the team. */
    @Transactional
    public void delete(Long id) {
        Team team = find(id);
        assertCanManage(CurrentUser.get(), team);

        // Clear every project that still points to this team, so the FK doesn't block deletion
        projectRepository.findAll().stream()
                .filter(p -> p.getTeam() != null && id.equals(p.getTeam().getId()))
                .forEach(p -> {
                    p.setTeam(null);
                    projectRepository.save(p);
                });

        teamMemberRepository.deleteByTeamId(id);
        teamRepository.delete(team);
    }

    private String nextTeamCode() {
        int counter = 1;
        String code;
        do {
            code = String.format("TEAM-%02d", counter++);
        } while (teamRepository.existsByTeamCodeIgnoreCase(code));
        return code;
    }

    // ------------------------------------------------------------------ members

    @Transactional(readOnly = true)
    public List<TeamDtos.MemberInfo> getMembers(Long teamId) {
        Team team = find(teamId);
        assertCanView(CurrentUser.get(), team);
        return memberInfos(teamId);
    }

    @Transactional
    public TeamDtos.MemberInfo addMember(Long teamId, Long userId, String teamRole) {
        Team team = find(teamId);
        assertCanManage(CurrentUser.get(), team);
        requireProject(team);

        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found with id " + userId));

        if (teamMemberRepository.findByTeamIdAndUserId(teamId, userId).isPresent()) {
            throw new BusinessRuleException("User is already a member of this team");
        }

        String role = validateTeamRole(user, teamRole);
        assertTeamLeadAvailable(team.getProject(), userId, role);
        return TeamDtos.MemberInfo.from(attach(team, team.getProject(), user, role));
    }

    @Transactional
    public TeamDtos.MemberInfo updateMemberRole(Long teamId, Long userId, String teamRole) {
        Team team = find(teamId);
        assertCanManage(CurrentUser.get(), team);
        requireProject(team);

        TeamMember member = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new EntityNotFoundException("This user is not a member of the team"));
        User user = member.getUser();
        if (teamRole == null || teamRole.isBlank()) {
            throw new IllegalArgumentException("Team role is required");
        }
        String role = validateTeamRole(user, teamRole);
        assertTeamLeadAvailable(team.getProject(), userId, role);
        String previousRole = member.getTeamRole();
        member.setTeamRole(role);
        projectMemberAssignmentRepository.findByProjectIdAndUserId(team.getProject().getId(), userId)
                .ifPresent(assignment -> {
                    if (assignment.getProjectRole().equalsIgnoreCase(previousRole)) {
                        assignment.setProjectRole(role);
                        projectMemberAssignmentRepository.save(assignment);
                    }
                });
        return TeamDtos.MemberInfo.from(teamMemberRepository.save(member));
    }

    @Transactional
    public void removeMember(Long teamId, Long userId) {
        Team team = find(teamId);
        assertCanManage(CurrentUser.get(), team);

        TeamMember member = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new EntityNotFoundException("This user is not a member of the team"));
        teamMemberRepository.delete(member);
    }

    // ------------------------------------------------------------------ helpers

    private Team find(Long id) {
        return teamRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Team not found with id " + id));
    }

    private void requireProject(Team team) {
        if (team.getProject() == null) {
            throw new BusinessRuleException("A project is required for team membership");
        }
    }

    /** Adds the user to both memberships without overwriting an existing project assignment. */
    private TeamMember attach(Team team, Project project, User user, String teamRole) {
        if (project == null) {
            throw new BusinessRuleException("A project is required for team membership");
        }
        if (!user.isActive()) {
            throw new BusinessRuleException("Inactive users cannot be assigned to a team");
        }
        String role = validateTeamRole(user, teamRole);

        if (project.getMembers().stream().noneMatch(member -> member.getId().equals(user.getId()))) {
            project.getMembers().add(user);
            projectRepository.save(project);
        }

        if (projectMemberAssignmentRepository.findByProjectIdAndUserId(project.getId(), user.getId()).isEmpty()) {
            ProjectMemberAssignment assignment = new ProjectMemberAssignment();
            assignment.setProject(project);
            assignment.setUser(user);
            assignment.setProjectRole(role);
            assignment.setMemberStatus("Active");
            projectMemberAssignmentRepository.save(assignment);
        }

        TeamMember member = new TeamMember();
        member.setTeam(team);
        member.setUser(user);
        member.setTeamRole(role);
        return teamMemberRepository.save(member);
    }

    private String validateTeamRole(User user, String value) {
        String role = value == null || value.isBlank()
                ? teamRoleForSystemRole(user)
                : switch (value.trim().replace('_', ' ').replace('-', ' ').toLowerCase()) {
                    case "team lead" -> "Team Lead";
                    case "developer" -> "Developer";
                    case "tester" -> "Tester";
                    case "qa" -> "QA";
                    default -> throw new BusinessRuleException(
                            "Team role must be Team Lead, Developer, Tester or QA");
                };
        Role systemRole = user.getRole();
        boolean matches = switch (role) {
            case "Team Lead" -> systemRole == Role.TEAM_LEAD;
            case "Developer" -> systemRole == Role.DEVELOPER || systemRole == Role.TEAM_MEMBER;
            case "Tester" -> systemRole == Role.TESTER;
            case "QA" -> systemRole == Role.QA;
            default -> false;
        };
        if (!matches) {
            throw new BusinessRuleException(
                    "Team role " + role + " does not match the user's system role " + systemRole.getLabel());
        }
        return role;
    }

    private String teamRoleForSystemRole(User user) {
        return switch (user.getRole()) {
            case TEAM_LEAD -> "Team Lead";
            case TESTER -> "Tester";
            case QA -> "QA";
            case DEVELOPER, TEAM_MEMBER -> "Developer";
            default -> throw new BusinessRuleException(
                    "Only Team Leads, Developers, Testers and QA users can be assigned to a team");
        };
    }

    private void assertTeamLeadAvailable(Project project, Long userId, String teamRole) {
        if ("Team Lead".equals(teamRole)
                && projectMemberAssignmentRepository.existsByProjectIdAndProjectRoleIgnoreCaseAndUserIdNot(
                        project.getId(), "Team Lead", userId)) {
            throw new BusinessRuleException("This project already has a Team Lead");
        }
    }

    private Set<User> resolveUsers(List<Long> ids) {
        Set<Long> distinct = ids.stream().filter(id -> id != null).collect(Collectors.toCollection(LinkedHashSet::new));
        if (distinct.isEmpty()) {
            return new LinkedHashSet<>();
        }
        List<User> users = userRepository.findAllById(distinct);
        if (users.size() != distinct.size()) {
            throw new IllegalArgumentException("One or more selected team members do not exist");
        }
        return new LinkedHashSet<>(users);
    }

    private void assertCanView(AuthUser user, Team team) {
        if (user.isAdmin()) {
            return;
        }
        if (team.getProject() == null) {
            throw new AccessDeniedException("You do not have access to this team");
        }
        access.assertCanView(user, team.getProject());
    }

    private void assertCanManage(AuthUser user, Team team) {
        if (user.isAdmin()) {
            return;
        }
        if (team.getProject() == null) {
            throw new AccessDeniedException("Only an Admin can manage a team that is not linked to a project");
        }
        access.assertCanManageProjectTeam(user, team.getProject());
    }

    private List<TeamDtos.MemberInfo> memberInfos(Long teamId) {
        return teamMemberRepository.findByTeamId(teamId).stream()
                .sorted(Comparator.comparing((TeamMember m) -> m.getUser().getFullName(), String.CASE_INSENSITIVE_ORDER))
                .map(TeamDtos.MemberInfo::from)
                .toList();
    }

    private TeamDtos.Detail toDetail(Team team) {
        Project project = team.getProject();
        List<TeamDtos.MemberInfo> members = memberInfos(team.getId());
        TeamDtos.MemberInfo lead = members.stream()
                .filter(m -> "Team Lead".equalsIgnoreCase(m.teamRole()))
                .findFirst().orElse(null);
        return new TeamDtos.Detail(
                team.getId(),
                team.getName(),
                team.getTeamCode(),
                team.getDescription(),
                project == null ? null : project.getId(),
                project == null ? null : project.getName(),
                project == null ? null : project.getCode(),
                lead == null ? null : lead.userId(),
                lead == null ? null : lead.fullName(),
                members);
    }
}