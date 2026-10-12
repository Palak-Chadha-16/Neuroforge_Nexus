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
import com.neuroforge.backend.entity.Team;
import com.neuroforge.backend.entity.TeamMember;
import com.neuroforge.backend.entity.User;
import com.neuroforge.backend.exception.BusinessRuleException;
import com.neuroforge.backend.repository.ProjectRepository;
import com.neuroforge.backend.repository.TeamMemberRepository;
import com.neuroforge.backend.repository.TeamRepository;
import com.neuroforge.backend.repository.UserRepository;
import com.neuroforge.backend.security.AuthUser;
import com.neuroforge.backend.security.CurrentUser;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

/**
 * Teams belong to a project. Admin/PM only (enforced on the controller with @PreAuthorize).
 *  - Admin: every team
 *  - PM: teams of projects they manage or belong to; may create/edit/delete only for projects they manage
 * Members added to a team are also added to the project's member list, so they can see the project and be assigned tasks.
 */
@Service
@RequiredArgsConstructor
public class TeamService {

    private static final String DEFAULT_TEAM_ROLE = "Member";

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
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

    /** GET /api/teams/by-project/{projectId} */
    @Transactional(readOnly = true)
    public Optional<TeamDtos.Detail> findByProject(Long projectId) {
        AuthUser caller = CurrentUser.get();
        return teamRepository.findByProjectId(projectId).stream()
                .filter(t -> { try { assertCanView(caller, t); return true; } catch (Exception e) { return false; } })
                .findFirst()
                .map(this::toDetail);
    }

    /** GET /api/teams/{id} - team info + member list (Member, Email, Skill, Team Role). */
    @Transactional(readOnly = true)
    public TeamDtos.Detail get(Long id) {
        Team team = find(id);
        assertCanView(CurrentUser.get(), team);
        return toDetail(team);
    }

    /** POST /api/teams */
    @Transactional
    public TeamDtos.Detail create(TeamRequest request) {
        AuthUser caller = CurrentUser.get();

        if (request == null || request.getName() == null || request.getName().isBlank()) {
            throw new IllegalArgumentException("Team name is required");
        }

        Project project = null;
        if (request.getProjectId() != null) {
            project = projectRepository.findById(request.getProjectId())
                    .orElseThrow(() -> new EntityNotFoundException("Project not found with id " + request.getProjectId()));
            access.assertCanManageProjectTeam(caller, project);
            // Enforce one team per project
            if (!teamRepository.findByProjectId(request.getProjectId()).isEmpty()) {
                throw new BusinessRuleException("This project already has a team. Delete the existing team first.");
            }
        } else if (!caller.isAdmin()) {
            throw new IllegalArgumentException("Project is required for non-admin team creation");
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

        // Link the team back to the project so project.team_id is set
        if (project != null) {
            project.setTeam(team);
            projectRepository.save(project);
        }

        if (request.getTeamLeadId() != null) {
            User lead = resolveTeamLead(request.getTeamLeadId());
            attach(team, project, lead, "Team Lead");
        }

        if (request.getMemberIds() != null) {
            for (User member : resolveMembers(request.getMemberIds())) {
                attach(team, project, member, roleToTeamRole(member));
            }
        }

        return toDetail(team);
    }

    /** PUT /api/teams/{id} - name / Team ID / description / teamLead / members. */
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

        // Replace Team Lead: remove old one, add new one
        if (request.getTeamLeadId() != null) {
            teamMemberRepository.findByTeamId(id).stream()
                    .filter(m -> "Team Lead".equalsIgnoreCase(m.getTeamRole()))
                    .forEach(teamMemberRepository::delete);
            User lead = resolveTeamLead(request.getTeamLeadId());
            attach(team, team.getProject(), lead, "Team Lead");
        }

        // Replace members (non-lead): remove existing non-lead members, add new list
        if (request.getMemberIds() != null) {
            teamMemberRepository.findByTeamId(id).stream()
                    .filter(m -> !"Team Lead".equalsIgnoreCase(m.getTeamRole()))
                    .forEach(teamMemberRepository::delete);
            for (User member : resolveMembers(request.getMemberIds())) {
                attach(team, team.getProject(), member, roleToTeamRole(member));
            }
        }

        return toDetail(teamRepository.save(team));
    }

    /** DELETE /api/teams/{id} - clears project FK, removes members, then deletes the team. */
    @Transactional
    public void delete(Long id) {
        Team team = find(id);
        assertCanManage(CurrentUser.get(), team);

        // Clear the project's reference to this team so the FK doesn't block deletion
        if (team.getProject() != null) {
            Project project = team.getProject();
            project.setTeam(null);
            projectRepository.save(project);
        }

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

        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found with id " + userId));

        if (user.getRole() == com.neuroforge.backend.entity.Role.UNASSIGNED) {
            throw new BusinessRuleException("Cannot add an UNASSIGNED user to a team. Ask an Admin to assign a system role first.");
        }

        if (teamMemberRepository.findByTeamIdAndUserId(teamId, userId).isPresent()) {
            throw new BusinessRuleException("User is already a member of this team");
        }

        String role = teamRole == null || teamRole.isBlank() ? DEFAULT_TEAM_ROLE : teamRole.trim();
        return TeamDtos.MemberInfo.from(attach(team, team.getProject(), user, role));
    }

    @Transactional
    public TeamDtos.MemberInfo updateMemberRole(Long teamId, Long userId, String teamRole) {
        Team team = find(teamId);
        assertCanManage(CurrentUser.get(), team);

        if (teamRole == null || teamRole.isBlank()) {
            throw new IllegalArgumentException("Team role is required");
        }

        TeamMember member = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new EntityNotFoundException("This user is not a member of the team"));
        member.setTeamRole(teamRole.trim());
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

    /** Adds the user to the team and to the team's project (so the project/tasks are visible to them). */
    private TeamMember attach(Team team, Project project, User user, String teamRole) {
        if (project != null && !access.isMember(project, user.getId())) {
            project.getMembers().add(user);
        }

        TeamMember member = new TeamMember();
        member.setTeam(team);
        member.setUser(user);
        member.setTeamRole(teamRole);
        return teamMemberRepository.save(member);
    }

    private User resolveTeamLead(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found with id " + userId));
        if (user.getRole() != com.neuroforge.backend.entity.Role.TEAM_LEAD
                && user.getRole() != com.neuroforge.backend.entity.Role.ADMIN) {
            throw new BusinessRuleException("Team Lead must have the Team Lead system role");
        }
        if (user.getRole() == com.neuroforge.backend.entity.Role.UNASSIGNED) {
            throw new BusinessRuleException("Cannot add an UNASSIGNED user to a team.");
        }
        return user;
    }

    private Set<User> resolveMembers(List<Long> ids) {
        Set<Long> distinct = ids.stream().filter(id -> id != null).collect(Collectors.toCollection(LinkedHashSet::new));
        if (distinct.isEmpty()) return new LinkedHashSet<>();
        List<User> users = userRepository.findAllById(distinct);
        if (users.size() != distinct.size()) throw new IllegalArgumentException("One or more selected team members do not exist");
        for (User u : users) {
            com.neuroforge.backend.entity.Role r = u.getRole();
            if (r == com.neuroforge.backend.entity.Role.UNASSIGNED) {
                throw new BusinessRuleException("Cannot add UNASSIGNED user " + u.getFullName() + " to a team.");
            }
            if (r != com.neuroforge.backend.entity.Role.DEVELOPER
                    && r != com.neuroforge.backend.entity.Role.TESTER
                    && r != com.neuroforge.backend.entity.Role.QA
                    && r != com.neuroforge.backend.entity.Role.TEAM_MEMBER) {
                throw new BusinessRuleException(u.getFullName() + " must have a Developer, Tester or QA role to be added as a team member.");
            }
        }
        return new LinkedHashSet<>(users);
    }

    private String roleToTeamRole(User user) {
        return switch (user.getRole()) {
            case TESTER -> "Tester";
            case QA -> "QA";
            default -> "Developer";
        };
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
        if (user.isAdmin()) return;
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
