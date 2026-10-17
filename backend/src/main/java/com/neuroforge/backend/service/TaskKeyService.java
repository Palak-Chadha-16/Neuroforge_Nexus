package com.neuroforge.backend.service;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.neuroforge.backend.entity.Project;
import com.neuroforge.backend.entity.Task;
import com.neuroforge.backend.repository.ProjectRepository;
import com.neuroforge.backend.repository.TaskRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskKeyService {

    private static final Pattern KEY_PATTERN = Pattern.compile("^(.+)-(\\d+)$");

    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;

    /**
     * Generates the next unique, human-readable task key for the given project.
     * Uses pessimistic locking on the project to ensure database-safe concurrency across multiple instances.
     * Synchronizes with the highest existing task-key sequence so creating a task cannot produce a duplicate key.
     */
    @Transactional(propagation = Propagation.REQUIRED, isolation = Isolation.READ_COMMITTED)
    public synchronized String nextKey(Project project) {
        if (project == null || project.getId() == null) {
            throw new IllegalArgumentException("Project and project ID must not be null");
        }

        // Lock the project row pessimistically (SELECT ... FOR UPDATE)
        Project lockedProject = projectRepository.findByIdForUpdate(project.getId())
                .orElse(project);

        // Ensure project has a valid, unique project key
        if (lockedProject.getProjectKey() == null || lockedProject.getProjectKey().isBlank()) {
            lockedProject.setProjectKey(generateUniqueProjectKey(lockedProject));
            lockedProject = projectRepository.saveAndFlush(lockedProject);
        }

        String projectKey = lockedProject.getProjectKey();
        int currentCounter = lockedProject.getTaskCounter() != null ? lockedProject.getTaskCounter() : 0;

        // Synchronize with highest existing key sequence in the database
        int maxExisting = getMaxTaskKeySequence(lockedProject.getId(), projectKey);
        int next = Math.max(currentCounter, maxExisting) + 1;

        // Ensure candidate key is globally unique
        String candidateKey = projectKey + "-" + next;
        while (taskRepository.existsByTaskKey(candidateKey)) {
            next++;
            candidateKey = projectKey + "-" + next;
        }

        lockedProject.setTaskCounter(next);
        projectRepository.saveAndFlush(lockedProject);

        // Reflect updated state onto the caller's project reference
        project.setTaskCounter(next);
        project.setProjectKey(projectKey);

        return candidateKey;
    }

    /**
     * Backfills any tasks with null taskKey and synchronizes project task counters.
     * Safe, non-destructive, and idempotent.
     */
    @Transactional
    public void syncAllProjectsAndBackfillTasks() {
        List<Project> allProjects = projectRepository.findAll();
        for (Project project : allProjects) {
            boolean projectUpdated = false;
            if (project.getProjectKey() == null || project.getProjectKey().isBlank()) {
                project.setProjectKey(generateUniqueProjectKey(project));
                projectUpdated = true;
            }

            // Backfill tasks with null task_key for this project
            List<Task> nullKeyTasks = taskRepository.findTasksWithNullKeyByProjectId(project.getId());
            if (!nullKeyTasks.isEmpty()) {
                log.info("Backfilling {} tasks with null taskKey for project ID {}", nullKeyTasks.size(), project.getId());
                for (Task task : nullKeyTasks) {
                    String key = nextKey(project);
                    task.setTaskKey(key);
                    taskRepository.save(task);
                }
                projectUpdated = true;
            }

            // Sync counter with max sequence
            int maxSeq = getMaxTaskKeySequence(project.getId(), project.getProjectKey());
            int currentCounter = project.getTaskCounter() != null ? project.getTaskCounter() : 0;
            if (currentCounter < maxSeq) {
                project.setTaskCounter(maxSeq);
                projectUpdated = true;
            }

            if (projectUpdated) {
                projectRepository.saveAndFlush(project);
            }
        }
    }

    /**
     * Finds the maximum sequence number among existing task keys for a project.
     */
    public int getMaxTaskKeySequence(Long projectId, String projectKey) {
        if (projectId == null || projectKey == null) return 0;
        String cleanPrefix = projectKey.trim().toUpperCase();
        List<String> keys = taskRepository.findTaskKeysByProjectId(projectId);
        int max = 0;
        for (String key : keys) {
            if (key == null) continue;
            Matcher matcher = KEY_PATTERN.matcher(key.trim());
            if (matcher.matches()) {
                String prefix = matcher.group(1).trim().toUpperCase();
                if (prefix.equals(cleanPrefix)) {
                    try {
                        int seq = Integer.parseInt(matcher.group(2));
                        if (seq > max) {
                            max = seq;
                        }
                    } catch (NumberFormatException ignored) {}
                }
            }
        }
        return max;
    }

    /**
     * Generates a unique, non-null project key (prefix) that does not collide with other projects.
     * Handles empty or duplicate prefixes.
     */
    public String generateUniqueProjectKey(Project project) {
        String base = derivePrefix(project != null ? project.getCode() : null, project != null ? project.getName() : null);
        Long projectId = project != null ? project.getId() : null;

        if (!isProjectKeyTaken(base, projectId)) {
            return base;
        }

        // Try 3-letter combinations with suffixes A-Z
        String prefixTwo = base.length() >= 2 ? base.substring(0, 2) : (base + "X").substring(0, 2);
        for (char c = 'A'; c <= 'Z'; c++) {
            String candidate = prefixTwo + c;
            if (!isProjectKeyTaken(candidate, projectId)) {
                return candidate;
            }
        }

        // Try alphanumeric with numbers
        for (int i = 1; i <= 999; i++) {
            String suffix = String.valueOf(i);
            int keep = Math.max(1, 10 - suffix.length());
            String candidate = (base.length() > keep ? base.substring(0, keep) : base) + suffix;
            if (!isProjectKeyTaken(candidate, projectId)) {
                return candidate;
            }
        }

        return "PRJ" + (projectId != null ? projectId : System.currentTimeMillis() % 1000);
    }

    private boolean isProjectKeyTaken(String key, Long currentProjectId) {
        if (currentProjectId != null) {
            return projectRepository.existsByProjectKeyIgnoreCaseAndIdNot(key, currentProjectId);
        }
        return projectRepository.existsByProjectKeyIgnoreCase(key);
    }

    private String derivePrefix(String code, String name) {
        String source = (code != null && !code.isBlank()) ? code : name;
        String letters = source == null ? "" : source.replaceAll("[^A-Za-z0-9]", "");
        String prefix = letters;
        if (prefix.length() < 3) {
            prefix = prefix + "NEX";
        }
        return prefix.substring(0, Math.min(3, prefix.length())).toUpperCase();
    }
}
