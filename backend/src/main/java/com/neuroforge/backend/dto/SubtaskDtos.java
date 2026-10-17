package com.neuroforge.backend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.neuroforge.backend.entity.Subtask;

public final class SubtaskDtos {
    private SubtaskDtos() {}

    public record UserRef(Long id, String fullName, String email, String skill) {}
    public record TeamRef(Long id, String name, String teamCode) {}
    public record SubtaskResponse(
            Long id, Long taskId, String taskKey, String title, String description,
            Long assigneeId, UserRef assignee,
            Long teamId, TeamRef team,
            String status, String priority, LocalDate dueDate,
            LocalDateTime createdAt, LocalDateTime updatedAt) {
        public static SubtaskResponse from(Subtask s) {
            var user = s.getAssignee();
            var team = s.getTeam();
            var task = s.getTask();
            return new SubtaskResponse(
                    s.getId(),
                    task == null ? null : task.getId(),
                    task == null ? null : task.getTaskKey(),
                    s.getTitle(),
                    s.getDescription(),
                    user == null ? null : user.getId(),
                    user == null ? null : new UserRef(user.getId(), user.getFullName(), user.getEmail(), user.getSkill() == null ? null : user.getSkill().getLabel()),
                    team == null ? null : team.getId(),
                    team == null ? null : new TeamRef(team.getId(), team.getName(), team.getTeamCode()),
                    s.getStatus(), s.getPriority(), s.getDueDate(), s.getCreatedAt(), s.getUpdatedAt());
        }
    }

    public record StatusRequest(String status) {}
}
