package com.neuroforge.backend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import com.neuroforge.backend.entity.Project;
import com.neuroforge.backend.entity.ProjectMemberAssignment;
import com.neuroforge.backend.entity.User;

public final class ProjectDtos {
    private ProjectDtos() {}

    public record Summary(
            Long id, String name, String code, String projectKey,
            LocalDate startDate, LocalDate endDate, String status, String priority,
            PersonInfo projectManager, PersonInfo projectLead, Long teamId, String teamName,
            int teamMemberCount,
            List<PersonInfo> members, String repository) {
        public static Summary from(Project project, int teamMemberCount) {
            List<PersonInfo> members = project.getMembers().stream().map(PersonInfo::from).toList();
            return new Summary(project.getId(), project.getName(), project.getCode(), project.getProjectKey(),
                    project.getStartDate(), project.getEndDate(), project.getStatus(), project.getPriority(),
                    PersonInfo.from(project.getProjectManager()), PersonInfo.from(project.getProjectLead()),
                    project.getTeam() == null ? null : project.getTeam().getId(),
                    project.getTeam() == null ? null : project.getTeam().getName(),
                    teamMemberCount,
                    members, repositoryUrl(project));
        }
        /** Overload kept for callers that don’t have a member count (defaults to 0). */
        public static Summary from(Project project) {
            return from(project, 0);
        }
    }

    public record PersonInfo(Long id, String userCode, String fullName, String email, String skill, String role) {
        public static PersonInfo from(User user) {
            return user == null ? null : new PersonInfo(
                    user.getId(), user.getUserCode(), user.getFullName(), user.getEmail(),
                    user.getSkill() == null ? null : user.getSkill().getLabel(), user.getRole().name());
        }
    }

    public record MemberInfo(Long id, Long userId, String userCode, String fullName, String email,
                              String skill, String projectRole, String status, LocalDateTime assignedAt) {
        public static MemberInfo from(ProjectMemberAssignment assignment) {
            User user = assignment.getUser();
            return new MemberInfo(assignment.getId(), user.getId(), user.getUserCode(), user.getFullName(),
                    user.getEmail(), user.getSkill() == null ? null : user.getSkill().getLabel(),
                    assignment.getProjectRole(), assignment.getMemberStatus(), assignment.getAssignedAt());
        }
    }

    public record Detail(
            Long id, String name, String code, String projectKey, String description,
            LocalDate startDate, LocalDate endDate, String status, String priority,
            PersonInfo projectManager, PersonInfo projectLead,
            Long teamId, String teamName,
            List<PersonInfo> members, int totalTasks, int completedTasks, int progressPercent,
            List<TaskDtos.TaskResponse> tasks, LocalDateTime createdAt, String repository) {}

    public static String repositoryUrl(Project project) {
        if (project.getGithubOwner() == null || project.getGithubRepository() == null) {
            return "";
        }
        return "https://github.com/" + project.getGithubOwner() + "/" + project.getGithubRepository();
    }

    public record PrioritySuggestion(String priority, long durationDays) {}
}
