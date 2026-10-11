package com.neuroforge.backend.service;

import java.util.Comparator;
import java.util.List;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.neuroforge.backend.entity.Project;
import com.neuroforge.backend.entity.Role;
import com.neuroforge.backend.repository.ProjectRepository;
import com.neuroforge.backend.security.AuthUser;

import lombok.RequiredArgsConstructor;

/** Central server-side data-scope rules. Frontend checks are only a convenience layer. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AccessService {

    private final ProjectRepository projectRepository;

    public List<Project> visibleProjects(AuthUser user) {
        List<Project> projects = switch (user.role()) {
            case ADMIN -> projectRepository.findAll();
            case PROJECT_MANAGER -> projectRepository.findManagedOrMemberOf(user.userId());
            case PROJECT_LEAD -> projectRepository.findLedOrMemberOf(user.userId());
            case TEAM_LEAD -> projectRepository.findTeamLeadProjects(user.userId());
            case DEVELOPER, TESTER, QA, TEAM_MEMBER -> projectRepository.findByMemberId(user.userId());
            case UNASSIGNED -> List.of();
        };
        return projects.stream()
                .sorted(Comparator.comparing(Project::getId))
                .toList();
    }

    public boolean isMember(Project project, Long userId) {
        if (project == null || userId == null) return false;
        if (isManager(project, userId) || isProjectLead(project, userId)) {
            return true;
        }
        if (project.getMembers() != null && project.getMembers().stream()
                .anyMatch(member -> member.getId().equals(userId))) {
            return true;
        }
        if (project.getTeam() != null && project.getTeam().getMembers() != null) {
            return project.getTeam().getMembers().stream()
                    .anyMatch(tm -> tm.getUser() != null && userId.equals(tm.getUser().getId()));
        }
        return false;
    }

    public boolean isManager(Project project, Long userId) {
        return project.getProjectManager() != null
                && project.getProjectManager().getId().equals(userId);
    }

    public boolean isProjectLead(Project project, Long userId) {
        return project.getProjectLead() != null
                && project.getProjectLead().getId().equals(userId);
    }

    public boolean isTeamLead(Project project, Long userId) {
        if (project == null || project.getTeam() == null || project.getTeam().getId() == null
                || project.getTeam().getMembers() == null) return false;
        return project.getTeam().getMembers().stream()
                .anyMatch(member -> member.getUser() != null && member.getUser().getId().equals(userId)
                        && "Team Lead".equalsIgnoreCase(member.getTeamRole()));
    }

    public boolean canView(AuthUser user, Project project) {
        Role role = user.role();
        if (role == Role.ADMIN) return true;
        if (role == Role.PROJECT_MANAGER) {
            return isManager(project, user.userId()) || isMember(project, user.userId());
        }
        if (role == Role.PROJECT_LEAD) {
            return isProjectLead(project, user.userId()) || isMember(project, user.userId());
        }
        if (role == Role.TEAM_LEAD) {
            return isTeamLead(project, user.userId()) || isMember(project, user.userId());
        }
        if (role == Role.UNASSIGNED) {
            return false;
        }
        return isMember(project, user.userId());
    }

    /** Full project/task/sprint management scope. */
    public boolean canManage(AuthUser user, Project project) {
        return switch (user.role()) {
            case ADMIN -> true;
            case PROJECT_MANAGER -> isManager(project, user.userId());
            case PROJECT_LEAD -> isProjectLead(project, user.userId());
            default -> false;
        };
    }

    /** Team membership management inside a project workspace. */
    public boolean canManageProjectTeam(AuthUser user, Project project) {
        return switch (user.role()) {
            case ADMIN -> true;
            case PROJECT_MANAGER -> isManager(project, user.userId());
            case PROJECT_LEAD -> isProjectLead(project, user.userId());
            case TEAM_LEAD -> isTeamLead(project, user.userId());
            default -> false;
        };
    }

    public void assertCanView(AuthUser user, Project project) {
        if (!canView(user, project)) {
            throw new AccessDeniedException("You do not have access to this project");
        }
    }

    public void assertCanManage(AuthUser user, Project project) {
        if (!canManage(user, project)) {
            throw new AccessDeniedException("You do not manage this project");
        }
    }

    public void assertCanManageProjectTeam(AuthUser user, Project project) {
        if (!canManageProjectTeam(user, project)) {
            throw new AccessDeniedException("You do not have permission to manage this project team");
        }
    }
}