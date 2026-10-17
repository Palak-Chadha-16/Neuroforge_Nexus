package com.neuroforge.backend.service;

import java.util.Comparator;
import java.util.List;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.neuroforge.backend.dto.TaskDtos.TaskResponse;
import com.neuroforge.backend.dto.TaskRequest;
import com.neuroforge.backend.entity.BoardStatus;
import com.neuroforge.backend.entity.Priority;
import com.neuroforge.backend.entity.Project;
import com.neuroforge.backend.entity.Sprint;
import com.neuroforge.backend.entity.SprintStatus;
import com.neuroforge.backend.entity.Task;
import com.neuroforge.backend.entity.TaskDependency;
import com.neuroforge.backend.entity.User;
import com.neuroforge.backend.exception.BusinessRuleException;
import com.neuroforge.backend.repository.ProjectRepository;
import com.neuroforge.backend.repository.SprintRepository;
import com.neuroforge.backend.repository.TaskDependencyRepository;
import com.neuroforge.backend.repository.TaskRepository;
import com.neuroforge.backend.repository.SubtaskRepository;
import com.neuroforge.backend.repository.UserRepository;
import com.neuroforge.backend.security.AuthUser;
import com.neuroforge.backend.security.CurrentUser;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

/**
 * Task rules:
 *  - list/detail are scoped by role
 *  - Admin: all tasks
 *  - Project Manager: tasks of projects they manage/belong to
 *  - Team Member: only tasks assigned to them AND belonging to projects they are a member of
 *  - Unassigned: no tasks, no access, until an Admin assigns a role
 *  - create/update/delete: Admin or the PM who manages the task's project
 *  - the assignee must be a MEMBER of the selected project
 *  - status changes go through updateStatus (Kanban drag & drop); a Team Member may only move their own tasks
 *  - project status is re-derived after every change
 */
@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final SubtaskRepository subtaskRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final TaskKeyService taskKeyService;
    private final SprintRepository sprintRepository;
    private final TaskDependencyRepository taskDependencyRepository;
    private final AccessService access;
    private final ProjectService projectService;
    private final BoardService boardService;

    // ------------------------------------------------------------------ queries

    /** GET /api/tasks */
    @Transactional(readOnly = true)
    public List<TaskResponse> list() {
        AuthUser user = CurrentUser.get();

        List<Task> tasks = switch (user.role()) {
            case ADMIN -> taskRepository.findAll();

            case PROJECT_MANAGER, PROJECT_LEAD, TEAM_LEAD -> {
                List<Long> projectIds = access.visibleProjects(user).stream()
                        .map(Project::getId)
                        .toList();

                yield projectIds.isEmpty()
                        ? List.<Task>of()
                        : taskRepository.findByProjectIdIn(projectIds);
            }

            case DEVELOPER, TESTER, QA, TEAM_MEMBER -> {
                List<Long> projectIds = access.visibleProjects(user).stream()
                        .map(Project::getId)
                        .toList();
                if (projectIds.isEmpty()) {
                    yield List.<Task>of();
                }
                yield taskRepository.findByProjectIdIn(projectIds).stream()
                        .filter(task -> task.getAssignee() != null
                                && task.getAssignee().getId().equals(user.userId()))
                        .toList();
            }

            case UNASSIGNED -> List.<Task>of();
        };

        return tasks.stream()
                .sorted(Comparator.comparing(Task::getId))
                .map(TaskResponse::from)
                .toList();
    }

    /** GET /api/tasks/{id} */
    @Transactional
    public TaskResponse get(Long id) {
        AuthUser user = CurrentUser.get();
        Task task = find(id);
        assertCanView(user, task);
        if (task.getTaskKey() == null || task.getTaskKey().isBlank()) {
            task.setTaskKey(taskKeyService.nextKey(task.getProject()));
            task = taskRepository.saveAndFlush(task);
        }
        return TaskResponse.from(task);
    }

    // ------------------------------------------------------------------ commands

    /**
     * POST /api/tasks.
     * New tasks always start in "To Do" (status is not accepted at creation).
     * With no sprintId the task joins the project's ACTIVE sprint, if there is one.
     */
    @Transactional
    public TaskResponse create(TaskRequest request) {
        AuthUser user = CurrentUser.get();

        validateTaskRequest(request);

        Project project = getProject(request.getProjectId());
        access.assertCanManage(user, project);

        Task task = new Task();
        applyBasicTaskInformation(task, request);
        task.setProject(project);
        setAssignee(task, request.getAssigneeId(), project, false);
        task.setTaskKey(taskKeyService.nextKey(project));
        task.setStoryPoints(request.getStoryPoints() != null ? request.getStoryPoints() : 0);

        task.setBoardStatus(BoardStatus.TODO);
        task.setStatus(BoardStatus.TODO.getLabel());
        task.setBoardPosition(0);

        Sprint sprint = findSprintForNewTask(request, project);

        if (sprint != null) {
            validateSprintBelongsToProject(sprint, project);
            task.setSprint(sprint);
            task.setBoardPosition(
                    getNextBoardPosition(sprint.getId(), BoardStatus.TODO)
            );
        }

        Task saved = taskRepository.save(task);
        projectService.recalculateStatus(project);

        return TaskResponse.from(saved);
    }

    /** PUT /api/tasks/{id} (Admin / managing PM). */
    @Transactional
    public TaskResponse update(Long id, TaskRequest request) {
        AuthUser user = CurrentUser.get();

        validateTaskRequest(request);

        Task task = find(id);
        Project oldProject = task.getProject();

        access.assertCanManage(user, oldProject);

        Project project = getProject(request.getProjectId());

        boolean projectChanged = !oldProject.getId().equals(project.getId());

        if (projectChanged) {
            access.assertCanManage(user, project);
        }

        Sprint currentSprint = task.getSprint();

        applyBasicTaskInformation(task, request);

        // If the project changes:
        // generate a new task key, remove dependencies, and remove the old sprint.
        if (projectChanged) {
            String newKey = taskKeyService.nextKey(project);
            task.setProject(project);
            task.setTaskKey(newKey);
            task.setSprint(null);
            task.setBoardPosition(0);
            currentSprint = null;
            taskDependencyRepository.deleteByTaskId(id);
            taskDependencyRepository.deleteByDependsOnId(id);
        } else {
            if (task.getTaskKey() == null || task.getTaskKey().isBlank()) {
                task.setTaskKey(taskKeyService.nextKey(project));
            }
        }

        setAssignee(
                task,
                request.getAssigneeId(),
                project,
                !projectChanged
        );

        if (request.getStoryPoints() != null) {
            task.setStoryPoints(request.getStoryPoints());
        }

        boolean statusChanged = false;

        if (request.getStatus() != null && !request.getStatus().isBlank()) {

            BoardStatus target = toBoardStatus(request.getStatus());

            if (target != task.getBoardStatus()) {
                applyStatus(task, target);
                statusChanged = true;
            }
        }

        // sprintId: null keeps the existing sprint.
        if (request.getSprintId() != null) {

            Sprint requestedSprint = sprintRepository.findById(
                    request.getSprintId()
            ).orElseThrow(() ->
                    new EntityNotFoundException(
                            "Sprint not found with id " + request.getSprintId()
                    )
            );

            validateSprintBelongsToProject(
                    requestedSprint,
                    project
            );

            if (currentSprint == null
                    || !currentSprint.getId().equals(requestedSprint.getId())) {

                task.setSprint(requestedSprint);

                task.setBoardPosition(
                        getNextBoardPosition(
                                requestedSprint.getId(),
                                task.getBoardStatus()
                        )
                );
            }
        }

        Task saved = taskRepository.save(task);

        if (statusChanged) {

            boardService.recalculateBlocked(saved);

            taskDependencyRepository
                    .findByDependsOnId(id)
                    .forEach(dependency ->
                            boardService.recalculateBlocked(
                                    dependency.getTask()
                            )
                    );
        }

        projectService.recalculateStatus(project);

        if (projectChanged) {
            projectService.recalculateStatus(oldProject);
        }

        return TaskResponse.from(saved);
    }

    /**
     * PATCH /api/tasks/{id}/status - Kanban drag & drop.
     * Admin: any task.
     * PM: tasks of projects they manage.
     * Team Member: only their own tasks in projects they are members of.
     */
    @Transactional
    public TaskResponse updateStatus(Long id, String rawStatus) {

        AuthUser user = CurrentUser.get();

        Task task = find(id);

        BoardStatus target = toBoardStatus(rawStatus);

        assertCanMove(user, task);

        if (task.getBoardStatus() != target) {

            applyStatus(task, target);

            taskRepository.save(task);

            boardService.recalculateBlocked(task);

            taskDependencyRepository
                    .findByDependsOnId(id)
                    .forEach(dependency ->
                            boardService.recalculateBlocked(
                                    dependency.getTask()
                            )
                    );

            projectService.recalculateStatus(
                    task.getProject()
            );
        }

        return TaskResponse.from(task);
    }

    /** DELETE /api/tasks/{id} (Admin / managing PM). */
    @Transactional
    public void delete(Long id) {

        AuthUser user = CurrentUser.get();

        Task task = find(id);

        Project project = task.getProject();

        access.assertCanManage(user, project);

        taskDependencyRepository.deleteByTaskId(id);
        taskDependencyRepository.deleteByDependsOnId(id);
        subtaskRepository.deleteByTaskId(id);

        taskRepository.delete(task);
        taskRepository.flush();

        projectService.recalculateStatus(project);
    }

    // ------------------------------------------------------------------ authorisation helpers

    private void assertCanView(AuthUser user, Task task) {

        boolean allowed = switch (user.role()) {

            case ADMIN -> true;

            case PROJECT_MANAGER, PROJECT_LEAD, TEAM_LEAD ->
                    access.canView(user, task.getProject());

            case DEVELOPER, TESTER, QA, TEAM_MEMBER ->
                    access.canView(user, task.getProject());

            case UNASSIGNED -> false;
        };

        if (!allowed) {
            throw new AccessDeniedException(
                    "You do not have access to this task"
            );
        }
    }

    private void assertCanMove(AuthUser user, Task task) {

        boolean allowed = switch (user.role()) {

            case ADMIN -> true;

            case PROJECT_MANAGER, PROJECT_LEAD ->
                    access.canManage(user, task.getProject())
                            || isAssignee(user, task);

            case TEAM_LEAD ->
                    access.isTeamLead(task.getProject(), user.userId())
                            || isAssignee(user, task);

            case DEVELOPER, TESTER, QA, TEAM_MEMBER ->
                    isAssignee(user, task);

            case UNASSIGNED -> false;
        };

        if (!allowed) {
            throw new AccessDeniedException(
                    user.isExecutionRole()
                            ? "You can only move tasks assigned to you"
                            : "You do not have permission to move this task"
            );
        }
    }

    private boolean isAssignee(
            AuthUser user,
            Task task
    ) {

        return task.getAssignee() != null
                && task.getAssignee()
                        .getId()
                        .equals(user.userId());
    }

    // ------------------------------------------------------------------ business helpers

    private Task find(Long id) {

        if (id == null) {
            throw new IllegalArgumentException(
                    "Task ID cannot be null"
            );
        }

        return taskRepository.findById(id)
                .orElseThrow(() ->
                        new EntityNotFoundException(
                                "Task not found with id " + id
                        )
                );
    }

    private Project getProject(Long projectId) {

        if (projectId == null) {
            throw new IllegalArgumentException(
                    "Project ID is required"
            );
        }

        return projectRepository.findById(projectId)
                .orElseThrow(() ->
                        new EntityNotFoundException(
                                "Project not found with id " + projectId
                        )
                );
    }

    /**
     * Sets the assignee after checking server-side
     * that the user is a member of the project.
     *
     * keepIfUnchanged:
     * when editing a task on the same project,
     * the current assignee is accepted as-is.
     */
    private void setAssignee(
            Task task,
            Long assigneeId,
            Project project,
            boolean keepIfUnchanged
    ) {

        if (assigneeId == null) {
            task.setAssignee(null);
            return;
        }

        if (keepIfUnchanged
                && task.getAssignee() != null
                && task.getAssignee()
                        .getId()
                        .equals(assigneeId)) {

            return;
        }

        User assignee = userRepository.findById(assigneeId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Assignee not found with id " + assigneeId
                        )
                );

        if (!access.isMember(project, assigneeId)) {
            throw new IllegalArgumentException(
                    "Assignee must be a member of the selected project"
            );
        }

        task.setAssignee(assignee);
    }

    private void applyStatus(
            Task task,
            BoardStatus target
    ) {

        if (target == BoardStatus.DONE) {

            List<String> open =
                    openDependencyKeys(task.getId());

            if (!open.isEmpty()) {

                throw new BusinessRuleException(
                        task.getTaskKey()
                                + " cannot be completed. Waiting on "
                                + String.join(", ", open)
                );
            }
        }

        task.setBoardStatus(target);
        task.setStatus(target.getLabel());

        task.setBoardPosition(
                (int) taskRepository
                        .countByProjectIdAndBoardStatus(
                                task.getProject().getId(),
                                target
                        )
        );
    }

    private List<String> openDependencyKeys(
            Long taskId
    ) {

        return taskDependencyRepository
                .findByTaskId(taskId)
                .stream()
                .map(TaskDependency::getDependsOn)
                .filter(dependsOn ->
                        dependsOn.getBoardStatus()
                                != BoardStatus.DONE
                )
                .map(Task::getTaskKey)
                .toList();
    }

    private void applyBasicTaskInformation(
            Task task,
            TaskRequest request
    ) {

        task.setTitle(
                request.getTitle().trim()
        );

        task.setDescription(
                request.getDescription()
        );

        task.setPriority(
                Priority.parseOrDefault(
                        request.getPriority(),
                        Priority.MEDIUM
                ).getLabel()
        );

        task.setDueDate(
                request.getDueDate()
        );
    }

    private Sprint findSprintForNewTask(
            TaskRequest request,
            Project project
    ) {

        if (request.getSprintId() != null) {

            return sprintRepository.findById(
                    request.getSprintId()
            ).orElseThrow(() ->
                    new EntityNotFoundException(
                            "Sprint not found with id "
                                    + request.getSprintId()
                    )
            );
        }

        return sprintRepository
                .findByProjectIdAndStatus(
                        project.getId(),
                        SprintStatus.ACTIVE
                )
                .orElse(null);
    }

    private void validateSprintBelongsToProject(
            Sprint sprint,
            Project project
    ) {

        if (sprint.getProject() == null
                || sprint.getProject().getId() == null
                || !sprint.getProject()
                        .getId()
                        .equals(project.getId())) {

            throw new IllegalArgumentException(
                    "Sprint does not belong to the selected project"
            );
        }

        if (sprint.getStatus()
                == SprintStatus.COMPLETED) {

            throw new IllegalArgumentException(
                    "Cannot add a task to a completed sprint"
            );
        }
    }

    private int getNextBoardPosition(
            Long sprintId,
            BoardStatus boardStatus
    ) {

        return taskRepository
                .findBySprintIdAndBoardStatusOrderByBoardPositionAsc(
                        sprintId,
                        boardStatus
                )
                .size();
    }

    private void validateTaskRequest(
            TaskRequest request
    ) {

        if (request == null) {
            throw new IllegalArgumentException(
                    "Task request cannot be null"
            );
        }

        if (request.getTitle() == null
                || request.getTitle().isBlank()) {

            throw new IllegalArgumentException(
                    "Task title is required"
            );
        }

        if (request.getProjectId() == null) {

            throw new IllegalArgumentException(
                    "Project ID is required"
            );
        }

        if (request.getStoryPoints() != null
                && request.getStoryPoints() < 0) {

            throw new IllegalArgumentException(
                    "Story points cannot be negative"
            );
        }
    }

    /** "To Do" / TODO / TO_DO, "In Progress" / IN_PROGRESS, "In Review" / IN_REVIEW, "Done" / DONE. */
    private BoardStatus toBoardStatus(
            String status
    ) {

        if (status == null || status.isBlank()) {

            throw new IllegalArgumentException(
                    "Status is required"
            );
        }

        return switch (
                status.trim()
                        .toUpperCase()
                        .replace(' ', '_')
        ) {

            case "TODO", "TO_DO" ->
                    BoardStatus.TODO;

            case "IN_PROGRESS" ->
                    BoardStatus.IN_PROGRESS;

            case "IN_REVIEW", "READY_FOR_TESTING", "IN_TESTING", "IN_QA" ->
                    BoardStatus.IN_REVIEW;

            case "DONE", "COMPLETED" ->
                    BoardStatus.DONE;

            default ->
                    throw new IllegalArgumentException(
                            "Unsupported task status '"
                                    + status
                                    + "'. Allowed: To Do, In Progress, In Review, Done"
                    );
        };
    }
}