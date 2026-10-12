package com.neuroforge.backend.service;

import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
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
 * Teams belong to a project. Admin/PM only (enforced on the controller with @PreAuthorize).
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

        TeamMember