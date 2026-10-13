package com.neuroforge.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSetter;

import java.time.LocalDateTime;

public final class BugReportDtos {

    private BugReportDtos() {
    }

    public record CreateBugRequest(

            @NotBlank(message = "Title is required")
            @Size(max = 255, message = "Title cannot exceed 255 characters")
            String title,

            @NotBlank(message = "Description is required")
            String description,

            @NotNull(message = "Project is required")
            Long projectId,

            @NotBlank(message = "Module is required")
            @Size(max = 255, message = "Module cannot exceed 255 characters")
            String module,

            @NotBlank(message = "Environment is required")
            @Size(max = 50, message = "Environment cannot exceed 50 characters")
            String environment,

            @NotBlank(message = "Severity is required")
            @Size(max = 20, message = "Severity cannot exceed 20 characters")
            String severity,

            @NotBlank(message = "Priority is required")
            @Size(max = 20, message = "Priority cannot exceed 20 characters")
            String priority,

            Long assignedTo,

            String attachments
    ) {
    }

    public static final class UpdateBugRequest {
        @NotBlank(message = "Title is required")
        @Size(max = 255, message = "Title cannot exceed 255 characters")
        private String title;

        @NotBlank(message = "Description is required")
        private String description;

        @NotBlank(message = "Module is required")
        @Size(max = 255, message = "Module cannot exceed 255 characters")
        private String module;

        @NotBlank(message = "Environment is required")
        @Size(max = 50, message = "Environment cannot exceed 50 characters")
        private String environment;

        @NotBlank(message = "Severity is required")
        @Size(max = 20, message = "Severity cannot exceed 20 characters")
        private String severity;

        @NotBlank(message = "Priority is required")
        @Size(max = 20, message = "Priority cannot exceed 20 characters")
        private String priority;

        private Long assignedTo;
        private boolean assignedToProvided;
        private String attachments;

        public UpdateBugRequest() {}

        public String title() { return title; }
        public String description() { return description; }
        public String module() { return module; }
        public String environment() { return environment; }
        public String severity() { return severity; }
        public String priority() { return priority; }
        public Long assignedTo() { return assignedTo; }
        @JsonIgnore
        public boolean assignedToProvided() { return assignedToProvided; }
        public String attachments() { return attachments; }

        public void setTitle(String title) { this.title = title; }
        public void setDescription(String description) { this.description = description; }
        public void setModule(String module) { this.module = module; }
        public void setEnvironment(String environment) { this.environment = environment; }
        public void setSeverity(String severity) { this.severity = severity; }
        public void setPriority(String priority) { this.priority = priority; }
        public void setAttachments(String attachments) { this.attachments = attachments; }

        @JsonSetter("assignedTo")
        public void setAssignedTo(Long assignedTo) {
            assignedToProvided = true;
            this.assignedTo = assignedTo;
        }
    }

    public record UpdateStatusRequest(

            @NotBlank(message = "Status is required")
            @Size(max = 30, message = "Status cannot exceed 30 characters")
            String status,

            String retestResult
    ) {
    }

    public record UpdateAssignmentRequest(
            Long assignedTo
    ) {
    }

    public record CreateCommentRequest(
            @NotBlank(message = "Comment cannot be blank")
            @Size(max = 2000, message = "Comment cannot exceed 2000 characters")
            String text
    ) {
    }

    public record CommentResponse(
            Long id,
            Long authorId,
            String author,
            String text,
            LocalDateTime at
    ) {
    }

    public record ActivityResponse(
            Long id,
            String type,
            String actor,
            String text,
            String result,
            LocalDateTime at
    ) {
    }

    public record BugReportResponse(
            Long id,
            String bugKey,
            String title,
            String description,
            Long projectId,
            String module,
            String environment,
            String severity,
            String priority,
            String status,
            Long reportedBy,
            Long assignedTo,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            String attachments,
            String retestResult
    ) {
    }
}