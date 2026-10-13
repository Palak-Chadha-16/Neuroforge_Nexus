package com.neuroforge.backend.service;

import com.neuroforge.backend.dto.BugReportDtos.BugReportResponse;
import com.neuroforge.backend.dto.BugReportDtos.ActivityResponse;
import com.neuroforge.backend.dto.BugReportDtos.CommentResponse;
import com.neuroforge.backend.dto.BugReportDtos.CreateCommentRequest;
import com.neuroforge.backend.dto.BugReportDtos.CreateBugRequest;
import com.neuroforge.backend.dto.BugReportDtos.UpdateAssignmentRequest;
import com.neuroforge.backend.dto.BugReportDtos.UpdateBugRequest;
import com.neuroforge.backend.dto.BugReportDtos.UpdateStatusRequest;
import com.neuroforge.backend.entity.BugReport;
import com.neuroforge.backend.entity.BugReportActivity;
import com.neuroforge.backend.entity.BugReportComment;
import com.neuroforge.backend.entity.Project;
import com.neuroforge.backend.entity.Role;
import com.neuroforge.backend.entity.User;
import com.neuroforge.backend.repository.BugReportActivityRepository;
import com.neuroforge.backend.repository.BugReportCommentRepository;
import com.neuroforge.backend.repository.BugReportRepository;
import com.neuroforge.backend.repository.ProjectRepository;
import com.neuroforge.backend.repository.UserRepository;
import com.neuroforge.backend.security.AuthUser;
import com.neuroforge.backend.security.CurrentUser;

import jakarta.persistence.EntityNotFoundException;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class BugReportService {

    private static final Set<String> STATUSES = Set.of(
            "New", "Triaged", "Assigned", "In Progress", "Fixed", "Retest", "Reopened", "Closed");
    private static final Map<String, Set<String>> STATUS_TRANSITIONS = Map.of(
            "New", Set.of("Triaged"),
            "Triaged", Set.of("Assigned"),
            "Assigned", Set.of("In Progress"),
            "In Progress", Set.of("Fixed"),
            "Fixed", Set.of("Retest"),
            "Retest", Set.of("Closed", "Reopened"),
            "Reopened", Set.of("In Progress"),
            "Closed", Set.of("Reopened"));

    private final BugReportRepository bugReportRepository;
    private final BugReportActivityRepository activityRepository;
    private final BugReportCommentRepository commentRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final AccessService accessService;

    // ------------------------------------------------------------------
    // READ
    // ------------------------------------------------------------------

    /**
     * Get all bugs visible to the current authenticated user.
     */
    @Transactional(readOnly = true)
    public List<BugReportResponse> getVisibleBugs() {

        AuthUser user = CurrentUser.get();

        List<Project> visibleProjects =
                accessService.visibleProjects(user);

        if (visibleProjects.isEmpty()) {
            return List.of();
        }

        return visibleProjects.stream()
                .flatMap(project ->
                        bugReportRepository
                                .findByProjectIdOrderByCreatedAtDesc(
                                        project.getId()
                                )
                                .stream()
                )
                .map(this::toResponse)
                .toList();
    }

    /**
     * Get all bugs belonging to one project.
     */
    @Transactional(readOnly = true)
    public List<BugReportResponse> getProjectBugs(Long projectId) {

        AuthUser user = CurrentUser.get();

        Project project = getProject(projectId);

        accessService.assertCanView(user, project);

        return bugReportRepository
                .findByProjectIdOrderByCreatedAtDesc(projectId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Get one bug.
     */
    @Transactional(readOnly = true)
    public BugReportResponse getBug(Long id) {

        AuthUser user = CurrentUser.get();

        BugReport bug = getBugEntity(id);

        Project project = getProject(bug.getProjectId());

        accessService.assertCanView(user, project);

        return toResponse(bug);
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> getComments(Long id) {
        getBug(id);
        return commentRepository.findByBugIdOrderByCreatedAtAscIdAsc(id).stream()
                .map(this::toCommentResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ActivityResponse> getActivity(Long id) {
        getBug(id);
        return activityRepository.findByBugIdOrderByCreatedAtAscIdAsc(id).stream()
                .map(this::toActivityResponse)
                .toList();
    }

    public CommentResponse addComment(Long id, CreateCommentRequest request) {
        BugReport bug = getBugEntity(id);
        Project project = getProject(bug.getProjectId());
        AuthUser caller = CurrentUser.get();
        accessService.assertCanView(caller, project);

        User author = userRepository.findById(caller.userId())
                .orElseThrow(() -> new EntityNotFoundException("Current user no longer exists"));
        BugReportComment comment = new BugReportComment();
        comment.setBugId(id);
        comment.setAuthorId(author.getId());
        comment.setAuthorName(author.getFullName());
        comment.setText(request.text().trim());
        BugReportComment saved = commentRepository.save(comment);
        logActivity(bug, "comment", "commented on this bug", null);
        return toCommentResponse(saved);
    }

    // ------------------------------------------------------------------
    // CREATE
    // ------------------------------------------------------------------

    /**
     * Create a new bug.
     *
     * Anyone who can view the project can report (Unassigned cannot view anything).
     * reportedBy is ALWAYS taken from the authenticated user.
     * Only users allowed to assign can set assignedTo at creation.
     */
    public BugReportResponse createBug(CreateBugRequest request) {

        AuthUser user = CurrentUser.get();

        Project project = getProject(request.projectId());

        accessService.assertCanView(user, project);

        if (request.assignedTo() != null && !canAssign(user, project)) {
            throw new AccessDeniedException("You cannot assign bugs in this project");
        }
        Long assignedTo = request.assignedTo();

        validateAssignment(assignedTo, project);

        BugReport bug = new BugReport();

        bug.setBugKey("BUG-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        bug.setTitle(request.title().trim());
        bug.setDescription(request.description().trim());
        bug.setProjectId(project.getId());
        bug.setModule(request.module().trim());
        bug.setEnvironment(request.environment().trim());
        bug.setSeverity(request.severity().trim());
        bug.setPriority(request.priority().trim());
        bug.setStatus("New");

        /*
         * IMPORTANT:
         * Never take reportedBy from the frontend.
         */
        bug.setReportedBy(user.userId());

        bug.setAssignedTo(assignedTo);
        bug.setAttachments(request.attachments());

        BugReport saved = bugReportRepository.saveAndFlush(bug);
        String bugKey = "BUG-" + saved.getId();
        if (bugReportRepository.existsByBugKey(bugKey)) {
            bugKey = "BUG-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        }
        saved.setBugKey(bugKey);
        saved = bugReportRepository.save(saved);
        logActivity(saved, "created", "reported this bug", null);
        if (assignedTo != null) {
            logAssignmentActivity(saved, assignedTo);
        }
        return toResponse(saved);
    }

    // ------------------------------------------------------------------
    // UPDATE
    // ------------------------------------------------------------------

    /**
     * Update bug information.
     * Allowed: Admin / PM / Lead of the project, or the person who reported the bug.
     * Assignment is changed here only by users who are allowed to assign.
     */
    public BugReportResponse updateBug(
            Long id,
            UpdateBugRequest request
    ) {

        AuthUser user = CurrentUser.get();

        BugReport bug = getBugEntity(id);

        Project project = getProject(bug.getProjectId());

        assertCanEdit(user, project, bug);

        List<String> changedFields = new java.util.ArrayList<>();
        if (!bug.getTitle().equals(request.title().trim())) changedFields.add("title");
        if (!bug.getDescription().equals(request.description().trim())) changedFields.add("description");
        if (!bug.getModule().equals(request.module().trim())) changedFields.add("module");
        if (!bug.getEnvironment().equals(request.environment().trim())) changedFields.add("environment");
        if (!bug.getSeverity().equals(request.severity().trim())) changedFields.add("severity");
        if (!bug.getPriority().equals(request.priority().trim())) changedFields.add("priority");

        bug.setTitle(request.title().trim());
        bug.setDescription(request.description().trim());
        bug.setModule(request.module().trim());
        bug.setEnvironment(request.environment().trim());
        bug.setSeverity(request.severity().trim());
        bug.setPriority(request.priority().trim());

        if (request.assignedToProvided() && canAssign(user, project)) {
            validateAssignment(request.assignedTo(), project);
            if (!java.util.Objects.equals(bug.getAssignedTo(), request.assignedTo())) {
                bug.setAssignedTo(request.assignedTo());
                logAssignmentActivity(bug, request.assignedTo());
            }
        } else if (request.assignedToProvided()) {
            throw new AccessDeniedException("You cannot assign bugs in this project");
        }

        BugReport saved = bugReportRepository.save(bug);
        if (!changedFields.isEmpty()) {
            logActivity(saved, "update", "updated " + String.join(", ", changedFields), null);
        }
        return toResponse(saved);
    }

    /**
     * Update bug status.
     * Every role follows the canonical transition graph; permissions determine
     * which edges each role may use.
     */
    public BugReportResponse updateStatus(
            Long id,
            UpdateStatusRequest request
    ) {

        AuthUser user = CurrentUser.get();

        BugReport bug = getBugEntity(id);

        Project project = getProject(bug.getProjectId());

        accessService.assertCanView(user, project);
        String nextStatus = request.status().trim();
        if (!STATUSES.contains(nextStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported bug status");
        }

        String previousStatus = bug.getStatus();
        if (!STATUS_TRANSITIONS.getOrDefault(previousStatus, Set.of()).contains(nextStatus)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Bug status cannot transition from " + previousStatus + " to " + nextStatus);
        }
        assertCanChangeStatus(user, project, bug, previousStatus, nextStatus, request.retestResult());

        String result = request.retestResult();
        boolean completingRetest = "Retest".equals(previousStatus)
                && ("Closed".equals(nextStatus) || "Reopened".equals(nextStatus));
        if (completingRetest) {
            bug.setRetestResult(result);
        } else {
            bug.setRetestResult(null);
        }
        bug.setStatus(nextStatus);

        BugReport saved = bugReportRepository.save(bug);
        String activityText = completingRetest
                ? "recorded a " + result.toLowerCase() + " retest and moved this bug to " + nextStatus
                : "moved this bug from " + previousStatus + " to " + saved.getStatus();
        logActivity(saved, completingRetest ? "retest" : "status", activityText, completingRetest ? result : null);
        return toResponse(saved);
    }

    /**
     * Assign or reassign a bug.
     * Allowed: Admin / PM / Lead, or the Team Lead of that project.
     */
    public BugReportResponse updateAssignment(
            Long id,
            UpdateAssignmentRequest request
    ) {

        AuthUser user = CurrentUser.get();

        BugReport bug = getBugEntity(id);

        Project project = getProject(bug.getProjectId());

        assertCanAssign(user, project);

        validateAssignment(request.assignedTo(), project);

        if (java.util.Objects.equals(bug.getAssignedTo(), request.assignedTo())) {
            return toResponse(bug);
        }
        bug.setAssignedTo(request.assignedTo());
        BugReport saved = bugReportRepository.save(bug);
        logAssignmentActivity(saved, request.assignedTo());
        return toResponse(saved);
    }

    // ------------------------------------------------------------------
    // DELETE
    // ------------------------------------------------------------------

    /**
     * Delete a bug. Admin / PM / Lead only.
     */
    public void deleteBug(Long id) {

        AuthUser user = CurrentUser.get();

        BugReport bug = getBugEntity(id);

        Project project = getProject(bug.getProjectId());

        accessService.assertCanManage(user, project);

        bugReportRepository.delete(bug);
    }

    // ------------------------------------------------------------------
    // PERMISSION HELPERS
    // ------------------------------------------------------------------

    private void assertCanEdit(AuthUser user, Project project, BugReport bug) {

        if (accessService.canManage(user, project)) {
            return;
        }

        if (user.role().isExecutionRole()
                && accessService.isMember(project, user.userId())
                && user.userId().equals(bug.getReportedBy())) {
            return;
        }

        throw new AccessDeniedException("You can edit only bugs you reported");
    }

    private boolean canAssign(AuthUser user, Project project) {

        if (accessService.canManage(user, project)) {
            return true;
        }

        return user.role() == Role.TEAM_LEAD
                && accessService.isTeamLead(project, user.userId());
    }

    private void assertCanAssign(AuthUser user, Project project) {

        if (!canAssign(user, project)) {
            throw new AccessDeniedException("You cannot assign bugs in this project");
        }
    }

    private void assertCanChangeStatus(
            AuthUser user,
            Project project,
            BugReport bug,
            String previousStatus,
            String newStatus,
            String retestResult
    ) {
        boolean completingRetest = "Retest".equals(previousStatus)
                && ("Closed".equals(newStatus) || "Reopened".equals(newStatus));
        if (retestResult != null && !Set.of("Passed", "Failed").contains(retestResult)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Retest result must be Passed or Failed");
        }
        if (completingRetest) {
            if (retestResult == null || !Set.of("Passed", "Failed").contains(retestResult)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A retest result is required");
            }
            if (("Closed".equals(newStatus) && !"Passed".equals(retestResult))
                    || ("Reopened".equals(newStatus) && !"Failed".equals(retestResult))) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "Retest result does not match the requested status");
            }
        } else if (retestResult != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Retest results are only valid when completing a retest");
        }

        if (accessService.canManage(user, project)) return;
        Role role = user.role();
        if (role == Role.TEAM_LEAD && accessService.isTeamLead(project, user.userId())
                && (("New".equals(previousStatus) && "Triaged".equals(newStatus))
                || ("Triaged".equals(previousStatus) && "Assigned".equals(newStatus)))) {
            return;
        }
        if ((role == Role.DEVELOPER || role == Role.TEAM_MEMBER)
                && accessService.isMember(project, user.userId())
                && user.userId().equals(bug.getAssignedTo())
                && (("Assigned".equals(previousStatus) && "In Progress".equals(newStatus))
                || ("In Progress".equals(previousStatus) && "Fixed".equals(newStatus))
                || ("Reopened".equals(previousStatus) && "In Progress".equals(newStatus)))) {
            return;
        }
        if ((role == Role.TESTER || role == Role.QA)
                && accessService.isMember(project, user.userId())
                && (("Fixed".equals(previousStatus) && "Retest".equals(newStatus))
                || ("Retest".equals(previousStatus)
                && ("Closed".equals(newStatus) || "Reopened".equals(newStatus)))
                || ("Closed".equals(previousStatus) && "Reopened".equals(newStatus)))) {
            return;
        }

        throw new AccessDeniedException("Your role cannot move this bug from " + previousStatus + " to " + newStatus);
    }

    /**
     * Make sure the assigned user belongs to the project.
     */
    private void validateAssignment(
            Long assignedTo,
            Project project
    ) {

        if (assignedTo == null) {
            return;
        }

        User assignee = userRepository.findById(assignedTo)
                .orElseThrow(() -> new EntityNotFoundException("Assigned user not found: " + assignedTo));
        if (!assignee.isActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assigned user must be active");
        }
        if (!assignee.getRole().isExecutionRole()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assigned user must have an execution role");
        }
        if (!accessService.isMember(project, assignedTo)) {
            throw new AccessDeniedException(
                    "The assigned user is not a member of this project"
            );
        }
    }

    // ------------------------------------------------------------------
    // INTERNAL HELPERS
    // ------------------------------------------------------------------

    private Project getProject(Long projectId) {

        return projectRepository
                .findById(projectId)
                .orElseThrow(() ->
                        new EntityNotFoundException(
                                "Project not found: " + projectId
                        )
                );
    }

    private BugReport getBugEntity(Long id) {

        return bugReportRepository
                .findById(id)
                .orElseThrow(() ->
                        new EntityNotFoundException(
                                "Bug report not found: " + id
                        )
                );
    }

    private BugReportResponse toResponse(BugReport bug) {

        return new BugReportResponse(
                bug.getId(),
                bug.getBugKey(),
                bug.getTitle(),
                bug.getDescription(),
                bug.getProjectId(),
                bug.getModule(),
                bug.getEnvironment(),
                bug.getSeverity(),
                bug.getPriority(),
                bug.getStatus(),
                bug.getReportedBy(),
                bug.getAssignedTo(),
                bug.getCreatedAt(),
                bug.getUpdatedAt(),
                bug.getAttachments(),
                bug.getRetestResult()
        );
    }

    private void logActivity(BugReport bug, String type, String text, String result) {
        AuthUser caller = CurrentUser.get();
        User actor = userRepository.findById(caller.userId())
                .orElseThrow(() -> new EntityNotFoundException("Current user no longer exists"));
        BugReportActivity activity = new BugReportActivity();
        activity.setBugId(bug.getId());
        activity.setActorId(actor.getId());
        activity.setActorName(actor.getFullName());
        activity.setType(type);
        activity.setText(text);
        activity.setResult(result);
        activityRepository.save(activity);
    }

    private void logAssignmentActivity(BugReport bug, Long assignedTo) {
        String assignee = assignedTo == null
                ? "Unassigned"
                : userRepository.findById(assignedTo)
                        .map(User::getFullName)
                        .orElseThrow(() -> new EntityNotFoundException("Assigned user not found: " + assignedTo));
        logActivity(bug, "assignment", "assigned this bug to " + assignee, null);
    }

    private CommentResponse toCommentResponse(BugReportComment comment) {
        return new CommentResponse(
                comment.getId(),
                comment.getAuthorId(),
                comment.getAuthorName(),
                comment.getText(),
                comment.getCreatedAt());
    }

    private ActivityResponse toActivityResponse(BugReportActivity activity) {
        return new ActivityResponse(
                activity.getId(),
                activity.getType(),
                activity.getActorName(),
                activity.getText(),
                activity.getResult(),
                activity.getCreatedAt());
    }
}