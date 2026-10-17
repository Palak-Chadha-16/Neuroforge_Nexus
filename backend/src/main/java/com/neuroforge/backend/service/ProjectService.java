package com.neuroforge.backend.service;

import java.time.temporal.ChronoUnit;
import java.net.URI;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.neuroforge.backend.dto.ProjectDtos;
import com.neuroforge.backend.dto.ProjectRequest;
import com.neuroforge.backend.dto.TaskDtos;
import com.neuroforge.backend.entity.BoardStatus;
import com.neuroforge.backend.entity.Priority;
import com.neuroforge.backend.entity.Project;
import com.neuroforge.backend.entity.ProjectStatus;
import com.neuroforge.backend.entity.Role;
import com.neuroforge.backend.entity.Sprint;
import com.neuroforge.backend.entity.Task;
import com.neuroforge.backend.entity.Team;
import com.neuroforge.backend.entity.TeamMember;
import com.neuroforge.backend.entity.User;
import com.neuroforge.backend.exception.BusinessRuleException;
import com.neuroforge.backend.repository.ProjectRepository;
import com.neuroforge.backend.repository.SprintRepository;
import com.neuroforge.backend.repository.TaskDependencyRepository;
import com.neuroforge.backend.repository.TaskRepository;
import com.neuroforge.backend.repository.TeamMemberRepository;
import com.neuroforge.backend.repository.TeamRepository;
import com.neuroforge.backend.repository.UserRepository;
import com.neuroforge.backend.security.AuthUser;
import com.neuroforge.backend.security.CurrentUser;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final TaskRepository taskRepository;
    private final SprintRepository sprintRepository;
    private final TaskDependencyRepository taskDependencyRepository;
    private final com.neuroforge.backend.repository.SubtaskRepository subtaskRepository;
    private final com.neuroforge.backend.repository.ProjectMemberAssignmentRepository projectMemberAssignmentRepository;
    private final AccessService access;
    private final TaskKeyService taskKeyService;

    // ------------------------------------------------------------------ queries

    /** GET /api/projects - scoped by the caller's role in the query itself. */
    @Transactional(readOnly = true)
    public List<ProjectDtos.Summary> list() {
        AuthUser user = CurrentUser.get();
        return access.visibleProjects(user).stream()
                .map(p -> ProjectDtos.Summary.from(p,
                        p.getTeam() == null ? 0 : (int) teamMemberRepository.countByTeamId(p.getTeam().getId())))
                .toList();
    }

    /** GET /api/projects/{id} */
    @Transactional(readOnly = true)
    public ProjectDtos.Detail get(Long id) {
        Project project = find(id);
        access.assertCanView(CurrentUser.get(), project);
        return toDetail(project);
    }

    // ------------------------------------------------------------------ commands

    /** POST /api/projects (Admin / Project Manager). Status is always NOT_STARTED; priority is auto-suggested. */
    @Transactional
    public ProjectDtos.Detail create(ProjectRequest request) {
        AuthUser caller = CurrentUser.get();
        if (!(caller.isAdmin() || caller.isProjectManager())) {
            throw new AccessDeniedException("Only Admin or Project Manager can create projects");
        }

        validate(request);

        String code = clean(request.getCode());
        if (code != null && projectRepository.existsByCodeIgnoreCase(code)) {
            throw new BusinessRuleException("A project with Project ID '" + code + "' already exists");
        }

        Project project = new Project();
        project.setName(request.getName().trim());
        project.setDescription(request.getDescription());
        project.setCode(code);
        project.setStartDate(request.getStartDate());
        project.setEndDate(request.getEndDate());
        setRepository(project, request.getRepository());

        // Status: client can set initial status (defaults to NOT_STARTED)
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            project.setStatus(ProjectStatus.from(request.getStatus()).getLabel());
        } else {
            project.setStatus(ProjectStatus.NOT_STARTED.getLabel());
        }

        // Priority: auto-calculated from the date range, but the PM may override the suggested value.
        Priority priority = request.getPriority() != null && !request.getPriority().isBlank()
                ? Priority.parse(request.getPriority())
                : suggestPriority(request.getStartDate(), request.getEndDate());
        project.setPriority(priority.getLabel());

        // Admin/PM may default the manager to themselves; Project Lead must explicitly choose a Project Manager.
        Long managerId = request.getProjectManagerId();
        if (managerId == null) {
            if (caller.isProjectManager() || caller.isAdmin()) managerId = caller.userId();
            else throw new BusinessRuleException("A Project Manager must be selected when a Project Lead creates a project");
        }
        project.setProjectManager(resolveManager(managerId));

        if (request.getProjectLeadId() != null) {
            project.setProjectLead(resolveProjectLead(request.getProjectLeadId()));
        }

        project.setProjectKey(nextProjectKey(code, request.getName()));
        project.setTaskCounter(0);

        Project saved = projectRepository.save(project);

        if (request.getMemberIds() != null) {
            saved.getMembers().addAll(resolveUsers(request.getMemberIds()));
        }

        saved = projectRepository.save(saved);
        syncAssignments(saved);
        return toDetail(saved);
    }

    /** PUT /api/projects/{id} (Admin, or the PM who manages it). */
    @Transactional
    public ProjectDtos.Detail update(Long id, ProjectRequest request) {
        AuthUser caller = CurrentUser.get();
        Project project = find(id);
        access.assertCanManage(caller, project);

        validate(request);

        String code = clean(request.getCode());
        if (code != null && projectRepository.existsByCodeIgnoreCaseAndIdNot(code, id)) {
            throw new BusinessRuleException("A project with Project ID '" + code + "' already exists");
        }

        project.setName(request.getName().trim());
        project.setDescription(request.getDescription());
        project.setCode(code);
        project.setStartDate(request.getStartDate());
        project.setEndDate(request.getEndDate());
        if (request.getRepository() != null) {
            setRepository(project, request.getRepository());
        }

        // Priority stays editable; if not supplied the current value is kept.
        if (request.getPriority() != null && !request.getPriority().isBlank()) {
            project.setPriority(Priority.parse(request.getPriority()).getLabel());
        }

        if (request.getProjectLeadId() != null) {
            Long currentLeadId = project.getProjectLead() == null ? null : project.getProjectLead().getId();
            if (!request.getProjectLeadId().equals(currentLeadId)) {
                project.setProjectLead(resolveProjectLead(request.getProjectLeadId()));
            }
        }

        if (request.getTeamId() != null && (project.getTeam() == null || !request.getTeamId().equals(project.getTeam().getId()))) {
            project.setTeam(resolveOrCreateTeam(project, request.getTeamId()));
        }

        // Only an Admin may hand the project to a different manager.
        Long newManagerId = request.getProjectManagerId();
        Long currentManagerId = project.getProjectManager() == null ? null : project.getProjectManager().getId();
        if (newManagerId != null && !newManagerId.equals(currentManagerId)) {
            if (!caller.isAdmin()) {
                throw new AccessDeniedException("Only an Admin can change the Project Manager");
            }
            project.setProjectManager(resolveManager(newManagerId));
        }

        if (request.getMemberIds() != null) {
            replaceMembers(project, resolveUsers(request.getMemberIds()));
        }

        // Status: update if provided in request, otherwise keep or re-derive
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            project.setStatus(ProjectStatus.from(request.getStatus()).getLabel());
        } else if (project.getStatus() == null || project.getStatus().isBlank()) {
            project.setStatus(computeStatus(taskRepository.findByProjectId(id)).getLabel());
        }

        Project saved = projectRepository.save(project);
        syncAssignments(saved);
        return toDetail(saved);
    }

    /** DELETE /api/projects/{id} (Admin, or the PM who manages it). */
    @Transactional
    public void delete(Long id) {
        Project project = find(id);
        if (!CurrentUser.get().isAdmin()) {
            throw new AccessDeniedException("Only an Admin can delete projects");
        }

        List<Task> tasks = taskRepository.findByProjectId(id);

        // Delete all dependency and subtask records related to these tasks first.
        for (Task task : tasks) {
            Long taskId = task.getId();
            taskDependencyRepository.deleteByTaskId(taskId);
            taskDependencyRepository.deleteByDependsOnId(taskId);
            subtaskRepository.deleteByTaskId(taskId);
        }
        taskDependencyRepository.flush();
        subtaskRepository.flush();

        for (Task task : tasks) {
            taskRepository.delete(task);
        }
        taskRepository.flush();

        // Teams belong to a project: remove their members, then the teams.
        for (Team team : teamRepository.findByProjectId(id)) {
            teamMemberRepository.deleteByTeamId(team.getId());
            teamRepository.delete(team);
        }
        teamRepository.flush();

        List<Sprint> sprints = sprintRepository.findByProjectIdOrderByStartDateDesc(id);
        for (Sprint sprint : sprints) {
            sprintRepository.delete(sprint);
        }
        sprintRepository.flush();

        projectMemberAssignmentRepository.deleteByProjectId(id);

        // project_members rows are removed automatically (Project owns the join table).
        projectRepository.delete(project);
        projectRepository.flush();
    }

    @Transactional(readOnly = true)
    public List<ProjectDtos.MemberInfo> members(Long projectId) {
        Project project = find(projectId);
        access.assertCanView(CurrentUser.get(), project);
        return projectMemberAssignmentRepository.findByProjectIdOrderByAssignedAtAsc(projectId).stream()
                .map(ProjectDtos.MemberInfo::from).toList();
    }

    @Transactional
    public ProjectDtos.MemberInfo addMember(Long projectId, Long userId, String projectRole) {
        Project project = find(projectId);
        access.assertCanManageProjectTeam(CurrentUser.get(), project);
        if (projectMemberAssignmentRepository.findByProjectIdAndUserId(projectId, userId).isPresent()) {
            throw new BusinessRuleException("This user is already a member of the project");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found with id " + userId));
        if (!user.isActive()) throw new BusinessRuleException("Inactive users cannot be assigned to a project");
        validateProjectRole(projectRole);
        validateProjectRoleMatchesUser(user, projectRole);
        if ("Team Lead".equalsIgnoreCase(projectRole)
                && projectMemberAssignmentRepository
                    .existsByProjectIdAndProjectRoleIgnoreCaseAndUserIdNot(projectId, "Team Lead", userId)) {
            throw new BusinessRuleException("This project already has a Team Lead");
        }
        project.getMembers().add(user);
        projectRepository.save(project);
        syncTeamMember(project, user, projectRole);
        var assignment = new com.neuroforge.backend.entity.ProjectMemberAssignment();
        assignment.setProject(project);
        assignment.setUser(user);
        assignment.setProjectRole(normalizeProjectRole(projectRole));
        assignment.setMemberStatus("Active");
        return ProjectDtos.MemberInfo.from(projectMemberAssignmentRepository.save(assignment));
    }

    @Transactional
    public ProjectDtos.MemberInfo updateMember(Long projectId, Long userId, String projectRole) {
        Project project = find(projectId);
        access.assertCanManageProjectTeam(CurrentUser.get(), project);
        validateProjectRole(projectRole);
        var assignment = projectMemberAssignmentRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Project member was not found"));
        validateProjectRoleMatchesUser(assignment.getUser(), projectRole);
        if ("Team Lead".equalsIgnoreCase(projectRole)
                && !"Team Lead".equalsIgnoreCase(assignment.getProjectRole())
                && projectMemberAssignmentRepository
                    .existsByProjectIdAndProjectRoleIgnoreCaseAndUserIdNot(projectId, "Team Lead", userId)) {
            throw new BusinessRuleException("This project already has a Team Lead");
        }
        assignment.setProjectRole(normalizeProjectRole(projectRole));
        syncTeamMember(project, assignment.getUser(), projectRole);
        return ProjectDtos.MemberInfo.from(projectMemberAssignmentRepository.save(assignment));
    }

    @Transactional
    public ProjectDtos.MemberInfo updateMemberStatus(Long projectId, Long userId, String status) {
        Project project = find(projectId);
        if (!status.equals("Active") && !status.equals("Inactive") && !status.equals("In Meeting")) {
            throw new IllegalArgumentException("Invalid project member status");
        }
        AuthUser caller = CurrentUser.get();
        if (!caller.userId().equals(userId)) {
            access.assertCanManageProjectTeam(caller, project);
        }
        var assignment = projectMemberAssignmentRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Project member was not found"));
        assignment.setMemberStatus(status);
        return ProjectDtos.MemberInfo.from(projectMemberAssignmentRepository.save(assignment));
    }

    @Transactional
    public void removeMember(Long projectId, Long userId) {
        Project project = find(projectId);
        access.assertCanManageProjectTeam(CurrentUser.get(), project);
        if (taskRepository.existsByProjectIdAndAssigneeIdAndBoardStatusNot(projectId, userId, BoardStatus.DONE)) {
            throw new BusinessRuleException("The member still has unfinished tasks in this project");
        }
        project.getMembers().removeIf(user -> user.getId().equals(userId));
        projectRepository.save(project);
        projectMemberAssignmentRepository.deleteByProjectIdAndUserId(projectId, userId);
        for (Team team : teamRepository.findByProjectId(projectId)) {
            teamMemberRepository.findByTeamIdAndUserId(team.getId(), userId).ifPresent(teamMemberRepository::delete);
        }
    }

    private void validateProjectRoleMatchesUser(User user, String value) {
        if (user.getRole() == Role.UNASSIGNED) {
            throw new BusinessRuleException("UNASSIGNED users cannot be added to a project. Assign a system role first.");
        }
        String normalized = normalizeProjectRole(value);
        Role role = user.getRole();
        boolean ok = switch (normalized) {
            case "Team Lead" -> role == Role.TEAM_LEAD;
            case "Tester" -> role == Role.TESTER;
            case "QA" -> role == Role.QA;
            default -> role == Role.DEVELOPER || role == Role.TEAM_MEMBER;
        };
        if (!ok) throw new BusinessRuleException("Project role " + normalized + " does not match the user's system role " + role.getLabel());
    }

    private void validateProjectRole(String value) {
        String role = normalizeProjectRole(value);
        if (!Set.of("Team Lead", "Developer", "Tester", "QA").contains(role)) {
            throw new IllegalArgumentException("Project role must be Team Lead, Developer, Tester or QA");
        }
    }

    private String normalizeProjectRole(String value) {
        if (value == null || value.isBlank()) return "";
        String key = value.trim().replace('_', ' ').replace('-', ' ');
        if (key.equalsIgnoreCase("team lead")) return "Team Lead";
        if (key.equalsIgnoreCase("developer")) return "Developer";
        if (key.equalsIgnoreCase("tester")) return "Tester";
        if (key.equalsIgnoreCase("qa") || key.equalsIgnoreCase("qa specialist")) return "QA";
        return value.trim();
    }

    // ------------------------------------------------------------------ priority

    /**
     * Auto priority from the project duration:
     *   <= 2 weeks (14 days)  -> High
     *   <= 1 month (30 days)  -> Medium
     *   longer                -> Low
     * Missing dates -> Medium.
     */
    public static Priority suggestPriority(java.time.LocalDate start, java.time.LocalDate end) {
        if (start == null || end == null) {
            return Priority.MEDIUM;
        }
        long days = ChronoUnit.DAYS.between(start, end);
        if (days <= 14) {
            return Priority.HIGH;
        }
        if (days <= 30) {
            return Priority.MEDIUM;
        }
        return Priority.LOW;
    }

    public ProjectDtos.PrioritySuggestion suggestion(java.time.LocalDate start, java.time.LocalDate end) {
        if (start != null && end != null && end.isBefore(start)) {
            throw new IllegalArgumentException("End date cannot be before start date");
        }
        long days = start == null || end == null ? 0 : ChronoUnit.DAYS.between(start, end);
        return new ProjectDtos.PrioritySuggestion(suggestPriority(start, end).getLabel(), days);
    }

    // ------------------------------------------------------------------ status (auto-calculated)

    /**
     * Status rule, derived from the tasks:
     *   no tasks, or every task still To Do -> Not Started
     *   every task Done                     -> Completed
     *   anything else                       -> In Progress
     */
    public static ProjectStatus computeStatus(List<Task> tasks) {
        if (tasks.isEmpty()) {
            return ProjectStatus.NOT_STARTED;
        }
        boolean allDone = tasks.stream().allMatch(t -> t.getBoardStatus() == BoardStatus.DONE);
        if (allDone) {
            return ProjectStatus.COMPLETED;
        }
        boolean anyStarted = tasks.stream().anyMatch(t -> t.getBoardStatus() != BoardStatus.TODO);
        return anyStarted ? ProjectStatus.IN_PROGRESS : ProjectStatus.NOT_STARTED;
    }

    /** Called after every task create / update / delete / status change. */
    @Transactional
    public void recalculateStatus(Project project) {
        if ("On Hold".equalsIgnoreCase(project.getStatus())) {
            List<Task> tasks = taskRepository.findByProjectId(project.getId());
            if (!tasks.isEmpty() && tasks.stream().allMatch(t -> t.getBoardStatus() == BoardStatus.DONE)) {
                project.setStatus(ProjectStatus.COMPLETED.getLabel());
                projectRepository.save(project);
            }
            return;
        }

        List<Task> tasks = taskRepository.findByProjectId(project.getId());
        if (tasks.isEmpty()) {
            return;
        }

        boolean allDone = tasks.stream().allMatch(t -> t.getBoardStatus() == BoardStatus.DONE);
        if (allDone) {
            if (!ProjectStatus.COMPLETED.getLabel().equals(project.getStatus())) {
                project.setStatus(ProjectStatus.COMPLETED.getLabel());
                projectRepository.save(project);
            }
            return;
        }

        boolean anyActive = tasks.stream().anyMatch(t -> t.getBoardStatus() != BoardStatus.TODO);
        if (anyActive && ProjectStatus.NOT_STARTED.getLabel().equalsIgnoreCase(project.getStatus())) {
            project.setStatus(ProjectStatus.IN_PROGRESS.getLabel());
            projectRepository.save(project);
        }
    }

    @Transactional
    public void recalculateStatusByTaskId(Long taskId) {
        taskRepository.findById(taskId).ifPresent(task -> recalculateStatus(task.getProject()));
    }

    /** Dedicated atomic status update (PATCH /api/projects/{id}/status). */
    @Transactional
    public ProjectDtos.Detail updateStatus(Long id, String newStatus) {
        AuthUser caller = CurrentUser.get();
        Project project = find(id);
        access.assertCanManage(caller, project);

        ProjectStatus target = ProjectStatus.from(newStatus);
        project.setStatus(target.getLabel());
        Project saved = projectRepository.save(project);
        return toDetail(saved);
    }

    /** Run once at startup so projects that lack a status get an initial one. */
    @Transactional
    public void recalculateAllStatuses() {
        projectRepository.findAll().forEach(p -> {
            if (p.getStatus() == null || p.getStatus().isBlank()) {
                recalculateStatus(p);
            }
        });
    }

    // ------------------------------------------------------------------ helpers

    private Project find(Long id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Project not found with id " + id));
    }

    private void validate(ProjectRequest request) {
        if (request == null || request.getName() == null || request.getName().isBlank()) {
            throw new IllegalArgumentException("Project name is required");
        }
        if (request.getStartDate() != null && request.getEndDate() != null
                && request.getEndDate().isBefore(request.getStartDate())) {
            throw new IllegalArgumentException("End date cannot be before start date");
        }
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private User resolveProjectLead(Long leadId) {
        User lead = userRepository.findById(leadId)
                .orElseThrow(() -> new IllegalArgumentException("Project Lead not found with id " + leadId));
        if (lead.getRole() != Role.PROJECT_LEAD && lead.getRole() != Role.ADMIN) {
            throw new IllegalArgumentException("Project Lead must have the Project Lead or Admin role");
        }
        if (!lead.isActive()) {
            throw new IllegalArgumentException("The selected Project Lead is inactive");
        }
        return lead;
    }

    private Team resolveOrCreateTeam(Project project, Long teamId) {
        if (teamId == null) {
            return null; // No auto-creation: teams are created explicitly from the Teams page
        }
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found with id " + teamId));
        if (team.getProject() != null && !team.getProject().getId().equals(project.getId())) {
            throw new IllegalArgumentException("Selected team belongs to another project");
        }
        if (team.getProject() == null) {
            team.setProject(project);
            return teamRepository.save(team);
        }
        return team;
    }

    private void syncAssignments(Project project) {
        boolean projectMembersChanged = false;
        if (project.getTeam() != null) {
            for (TeamMember teamMember : teamMemberRepository.findByTeamId(project.getTeam().getId())) {
                User user = teamMember.getUser();
                if (project.getMembers().stream().noneMatch(member -> member.getId().equals(user.getId()))) {
                    project.getMembers().add(user);
                    projectMembersChanged = true;
                }
                if (projectMemberAssignmentRepository
                        .findByProjectIdAndUserId(project.getId(), user.getId()).isEmpty()) {
                    var assignment = new com.neuroforge.backend.entity.ProjectMemberAssignment();
                    assignment.setProject(project);
                    assignment.setUser(user);
                    assignment.setProjectRole(isAssignableProjectRole(teamMember.getTeamRole())
                            ? normalizeProjectRole(teamMember.getTeamRole())
                            : projectRoleFromUser(user));
                    assignment.setMemberStatus(user.isActive() ? "Active" : "Inactive");
                    projectMemberAssignmentRepository.save(assignment);
                }
            }
        }

        for (User user : project.getMembers()) {
            var existing = projectMemberAssignmentRepository.findByProjectIdAndUserId(project.getId(), user.getId());
            if (existing.isEmpty()) {
                var assignment = new com.neuroforge.backend.entity.ProjectMemberAssignment();
                assignment.setProject(project);
                assignment.setUser(user);
                assignment.setProjectRole(projectRoleFromUser(user));
                assignment.setMemberStatus(user.isActive() ? "Active" : "Inactive");
                projectMemberAssignmentRepository.save(assignment);
            }
            String role = existing.map(com.neuroforge.backend.entity.ProjectMemberAssignment::getProjectRole)
                    .orElseGet(() -> projectRoleFromUser(user));
            syncTeamMember(project, user, role);
        }
        if (projectMembersChanged) {
            projectRepository.save(project);
        }
    }

    private void syncTeamMember(Project project, User user, String projectRole) {
        if (project.getTeam() == null || user == null) return;
        if (!isAssignableProjectRole(projectRole)) return;
        String normalized = normalizeProjectRole(projectRole);
        TeamMember member = teamMemberRepository.findByTeamIdAndUserId(project.getTeam().getId(), user.getId())
                .orElseGet(() -> {
                    TeamMember tm = new TeamMember();
                    tm.setTeam(project.getTeam());
                    tm.setUser(user);
                    return tm;
                });
        member.setTeamRole(normalized);
        teamMemberRepository.save(member);
    }

    private boolean isAssignableProjectRole(String value) {
        if (value == null) return false;
        return Set.of("Team Lead", "Developer", "Tester", "QA").contains(normalizeProjectRole(value));
    }

    private String projectRoleFromUser(User user) {
        return switch (user.getRole()) {
            case TEAM_LEAD -> "Team Lead";
            case TESTER -> "Tester";
            case QA -> "QA";
            case PROJECT_LEAD -> "Project Lead";
            case PROJECT_MANAGER -> "Project Manager";
            case ADMIN -> "Admin";
            default -> "Developer";
        };
    }

    /** The project manager must be an existing, active user whose role is Project Manager or Admin. */
    private User resolveManager(Long managerId) {
        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new IllegalArgumentException("Project Manager not found with id " + managerId));
        if (manager.getRole() != Role.PROJECT_MANAGER && manager.getRole() != Role.ADMIN) {
            throw new IllegalArgumentException("Project Manager must be a user with the Project Manager or Admin role");
        }
        if (!manager.isActive()) {
            throw new IllegalArgumentException("The selected Project Manager is inactive");
        }
        return manager;
    }

    private Set<User> resolveUsers(List<Long> ids) {
        Set<Long> distinct = ids.stream().filter(id -> id != null).collect(Collectors.toCollection(LinkedHashSet::new));
        if (distinct.isEmpty()) {
            return new LinkedHashSet<>();
        }
        List<User> users = userRepository.findAllById(distinct);
        if (users.size() != distinct.size()) {
            throw new IllegalArgumentException("One or more selected members do not exist");
        }
        return new LinkedHashSet<>(users);
    }

    /** Replaces the member set; refuses to drop someone who still has unfinished tasks in this project. */
    private void replaceMembers(Project project, Set<User> newMembers) {
        Set<Long> newIds = newMembers.stream().map(User::getId).collect(Collectors.toSet());

        List<User> removed = project.getMembers().stream()
                .filter(member -> !newIds.contains(member.getId()))
                .toList();

        for (User user : removed) {
            if (taskRepository.existsByProjectIdAndAssigneeIdAndBoardStatusNot(
                    project.getId(), user.getId(), BoardStatus.DONE)) {
                throw new BusinessRuleException(user.getFullName()
                        + " still has unfinished tasks in this project. Reassign them before removing the member.");
            }
        }

        // A removed member also leaves this project's teams.
        for (Team team : teamRepository.findByProjectId(project.getId())) {
            for (User user : removed) {
                teamMemberRepository.findByTeamIdAndUserId(team.getId(), user.getId())
                        .ifPresent(teamMemberRepository::delete);
            }
        }
        for (User user : removed) {
            projectMemberAssignmentRepository.deleteByProjectIdAndUserId(project.getId(), user.getId());
        }

        project.getMembers().clear();
        project.getMembers().addAll(newMembers);
    }

    private ProjectDtos.Detail toDetail(Project project) {
        List<Task> tasks = new ArrayList<>(taskRepository.findByProjectId(project.getId()));
        tasks.sort(Comparator.comparing(Task::getId));

        int total = tasks.size();
        int completed = (int) tasks.stream().filter(t -> t.getBoardStatus() == BoardStatus.DONE).count();
        int percent = total == 0 ? 0 : Math.round(completed * 100f / total);

        List<ProjectDtos.PersonInfo> members = project.getMembers().stream()
                .sorted(Comparator.comparing(User::getFullName, String.CASE_INSENSITIVE_ORDER))
                .map(ProjectDtos.PersonInfo::from)
                .toList();

        return new ProjectDtos.Detail(
                project.getId(),
                project.getName(),
                project.getCode(),
                project.getProjectKey(),
                project.getDescription(),
                project.getStartDate(),
                project.getEndDate(),
                project.getStatus(),
                project.getPriority(),
                ProjectDtos.PersonInfo.from(project.getProjectManager()),
                ProjectDtos.PersonInfo.from(project.getProjectLead()),
                project.getTeam() == null ? null : project.getTeam().getId(),
                project.getTeam() == null ? null : project.getTeam().getName(),
                members,
                total,
                completed,
                percent,
                tasks.stream().map(TaskDtos.TaskResponse::from).toList(),
                project.getCreatedAt(),
                ProjectDtos.repositoryUrl(project));
    }

    private void setRepository(Project project, String repositoryUrl) {
        String value = clean(repositoryUrl);
        if (value == null) {
            project.setGithubOwner(null);
            project.setGithubRepository(null);
            return;
        }

        String normalized = value.contains("://") ? value : "https://" + value;
        try {
            URI uri = URI.create(normalized);
            String host = uri.getHost();
            String path = uri.getPath();
            if (!"https".equalsIgnoreCase(uri.getScheme())
                    || !"github.com".equalsIgnoreCase(host)
                    || uri.getPort() != -1
                    || uri.getUserInfo() != null
                    || uri.getQuery() != null
                    || uri.getFragment() != null
                    || path == null) {
                throw new IllegalArgumentException();
            }

            String[] parts = path.replaceAll("^/+|/+$", "").split("/");
            if (parts.length != 2) {
                throw new IllegalArgumentException();
            }
            String owner = parts[0];
            String repository = parts[1].replaceFirst("\\.git$", "");
            if (!owner.matches("[A-Za-z0-9-]{1,50}")
                    || !repository.matches("[A-Za-z0-9._-]{1,100}")) {
                throw new IllegalArgumentException();
            }

            project.setGithubOwner(owner);
            project.setGithubRepository(repository);
        } catch (IllegalArgumentException exception) {
            throw new BusinessRuleException("Repository must be a GitHub URL in the form https://github.com/owner/repository");
        }
    }

    private String nextProjectKey(String code, String name) {
        Project temp = new Project();
        temp.setCode(code);
        temp.setName(name);
        return taskKeyService.generateUniqueProjectKey(temp);
    }
}
