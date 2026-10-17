package com.neuroforge.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.neuroforge.backend.entity.Project;
import com.neuroforge.backend.entity.Role;
import com.neuroforge.backend.entity.Subtask;
import com.neuroforge.backend.entity.Task;
import com.neuroforge.backend.entity.TaskDependency;
import com.neuroforge.backend.entity.User;
import com.neuroforge.backend.repository.ProjectRepository;
import com.neuroforge.backend.repository.SubtaskRepository;
import com.neuroforge.backend.repository.TaskDependencyRepository;
import com.neuroforge.backend.repository.TaskRepository;
import com.neuroforge.backend.repository.UserRepository;
import com.neuroforge.backend.security.JwtService;
import com.neuroforge.backend.service.TaskKeyService;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:neuroforge-security-test;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "app.jwt.secret=neuroforge-integration-test-secret-key-0123456789",
        "app.bootstrap-admin.password=TestBootstrapPassword1!",
        "neuroforge.chat.api-key="
})
@AutoConfigureMockMvc
public class TaskKeyAndIdIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private SubtaskRepository subtaskRepository;

    @Autowired
    private TaskDependencyRepository taskDependencyRepository;

    @Autowired
    private TaskKeyService taskKeyService;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User admin;
    private String adminToken;
    private User pm;
    private String pmToken;
    private User dev;
    private String devToken;

    @BeforeEach
    void setUp() {
        admin = createUser(Role.ADMIN);
        adminToken = jwtService.generateToken(admin);

        pm = createUser(Role.PROJECT_MANAGER);
        pmToken = jwtService.generateToken(pm);

        dev = createUser(Role.DEVELOPER);
        devToken = jwtService.generateToken(dev);
    }

    /** 1. Creating multiple tasks in the same project generates sequential keys and numeric IDs. */
    @Test
    void creatingMultipleTasksInSameProjectGeneratesSequentialKeys() throws Exception {
        Project project = createProject(pm, "Sequence Project", "SEQ");

        String body1 = mockMvc.perform(post("/api/tasks")
                        .header("Authorization", "Bearer " + pmToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"projectId":%d,"title":"Task 1","priority":"High"}
                                """.formatted(project.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.taskKey").value("SEQ-1"))
                .andReturn().getResponse().getContentAsString();

        String body2 = mockMvc.perform(post("/api/tasks")
                        .header("Authorization", "Bearer " + pmToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"projectId":%d,"title":"Task 2","priority":"Medium"}
                                """.formatted(project.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.taskKey").value("SEQ-2"))
                .andReturn().getResponse().getContentAsString();

        Long id1 = objectMapper.readTree(body1).get("id").asLong();
        Long id2 = objectMapper.readTree(body2).get("id").asLong();

        assertThat(id1).isPositive();
        assertThat(id2).isPositive();
        assertThat(id1).isNotEqualTo(id2);
    }

    /** 2. Creating tasks in different projects uses each project's respective prefix and counter. */
    @Test
    void creatingTasksInDifferentProjectsUsesRespectiveKeys() throws Exception {
        Project projA = createProject(pm, "Different Proj A", "DFA");
        Project projB = createProject(pm, "Different Proj B", "DFB");

        mockMvc.perform(post("/api/tasks")
                        .header("Authorization", "Bearer " + pmToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"projectId":%d,"title":"Task A1","priority":"Low"}
                                """.formatted(projA.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.taskKey").value("DFA-1"));

        mockMvc.perform(post("/api/tasks")
                        .header("Authorization", "Bearer " + pmToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"projectId":%d,"title":"Task B1","priority":"Low"}
                                """.formatted(projB.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.taskKey").value("DFB-1"));
    }

    /** 3. Existing tasks with missing task keys are backfilled safely without deleting/recreating records. */
    @Test
    void existingTasksWithMissingTaskKeysAreBackfilledSafely() {
        Project project = createProject(pm, "Backfill Project", "BFL");

        Task taskWithoutKey = new Task();
        taskWithoutKey.setTitle("Legacy Task without key");
        taskWithoutKey.setProject(project);
        taskWithoutKey.setTaskKey(null);
        taskWithoutKey.setStatus("To Do");
        taskWithoutKey = taskRepository.saveAndFlush(taskWithoutKey);

        Long originalId = taskWithoutKey.getId();

        taskKeyService.syncAllProjectsAndBackfillTasks();

        Task backfilled = taskRepository.findById(originalId).orElseThrow();
        assertThat(backfilled.getId()).isEqualTo(originalId);
        assertThat(backfilled.getTaskKey()).isNotNull();
        assertThat(backfilled.getTaskKey()).startsWith("BFL-");
        assertThat(backfilled.getTitle()).isEqualTo("Legacy Task without key");
    }

    /** 4. Counter synchronization: creating a task cannot produce a duplicate key when existing keys exceed counter. */
    @Test
    void counterSynchronizationPreventsDuplicateKeys() throws Exception {
        Project project = createProject(pm, "Sync Project", "SNC");

        // Existing tasks already created up to SNC-5
        for (int i = 1; i <= 5; i++) {
            Task task = new Task();
            task.setTitle("Existing " + i);
            task.setProject(project);
            task.setTaskKey("SNC-" + i);
            taskRepository.saveAndFlush(task);
        }

        // Project counter was accidentally reset to 0
        project.setTaskCounter(0);
        projectRepository.saveAndFlush(project);

        // Next task should automatically detect highest key SNC-5 and generate SNC-6
        mockMvc.perform(post("/api/tasks")
                        .header("Authorization", "Bearer " + pmToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"projectId":%d,"title":"Task after sync","priority":"Medium"}
                                """.formatted(project.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.taskKey").value("SNC-6"));
    }

    /** 5. Concurrent task creation: database-safe locking prevents duplicate task keys across multiple threads. */
    @Test
    void concurrentTaskCreationProducesUniqueKeysWithoutDuplicates() throws Exception {
        Project project = createProject(pm, "Concurrent Project", "CNC");

        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        List<Callable<String>> tasks = new ArrayList<>();

        for (int i = 0; i < threadCount; i++) {
            tasks.add(() -> taskKeyService.nextKey(project));
        }

        List<Future<String>> results = executor.invokeAll(tasks);
        executor.shutdown();

        Set<String> generatedKeys = Collections.synchronizedSet(new HashSet<>());
        for (Future<String> future : results) {
            String key = future.get();
            assertThat(key).startsWith("CNC-");
            boolean added = generatedKeys.add(key);
            assertThat(added).as("Key %s should be unique", key).isTrue();
        }

        assertThat(generatedKeys).hasSize(threadCount);
    }

    /** 6. Updating a task in the same project preserves its numeric ID and taskKey. */
    @Test
    void updatingTaskInSameProjectPreservesIdAndKey() throws Exception {
        Project project = createProject(pm, "Edit Project", "EDT");

        String createRes = mockMvc.perform(post("/api/tasks")
                        .header("Authorization", "Bearer " + pmToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"projectId":%d,"title":"Original Title","priority":"Low"}
                                """.formatted(project.getId())))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        JsonNode json = objectMapper.readTree(createRes);
        Long taskId = json.get("id").asLong();
        String originalKey = json.get("taskKey").asText();

        // Update title and priority on same project
        mockMvc.perform(put("/api/tasks/{id}", taskId)
                        .header("Authorization", "Bearer " + pmToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"projectId":%d,"title":"Updated Title","priority":"High"}
                                """.formatted(project.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(taskId))
                .andExpect(jsonPath("$.taskKey").value(originalKey))
                .andExpect(jsonPath("$.title").value("Updated Title"))
                .andExpect(jsonPath("$.priority").value("High"));
    }

    /** 7. Moving a task to another project generates a new key using destination counter and preserves numeric ID. */
    @Test
    void movingTaskToAnotherProjectGeneratesNewKeyAndPreservesNumericId() throws Exception {
        Project sourceProj = createProject(pm, "Source Project", "SRC");
        Project destProj = createProject(pm, "Dest Project", "DST");

        String createRes = mockMvc.perform(post("/api/tasks")
                        .header("Authorization", "Bearer " + pmToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"projectId":%d,"title":"Moving Task","priority":"Low"}
                                """.formatted(sourceProj.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.taskKey").value("SRC-1"))
                .andReturn().getResponse().getContentAsString();

        Long taskId = objectMapper.readTree(createRes).get("id").asLong();

        // Move to destProj
        mockMvc.perform(put("/api/tasks/{id}", taskId)
                        .header("Authorization", "Bearer " + pmToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"projectId":%d,"title":"Moving Task","priority":"High"}
                                """.formatted(destProj.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(taskId))
                .andExpect(jsonPath("$.taskKey").value("DST-1"))
                .andExpect(jsonPath("$.projectId").value(destProj.getId()));
    }

    /** 8. Retrieving and updating tasks by numeric ID. */
    @Test
    void retrievingAndUpdatingTasksByNumericId() throws Exception {
        Project project = createProject(pm, "Retrieve Project", "RTV");

        String createRes = mockMvc.perform(post("/api/tasks")
                        .header("Authorization", "Bearer " + pmToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"projectId":%d,"title":"Inspect Task","priority":"Medium"}
                                """.formatted(project.getId())))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        Long taskId = objectMapper.readTree(createRes).get("id").asLong();

        // GET by numeric ID
        mockMvc.perform(get("/api/tasks/{id}", taskId)
                        .header("Authorization", "Bearer " + pmToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(taskId))
                .andExpect(jsonPath("$.taskKey").value("RTV-1"));

        // PATCH status by numeric ID
        mockMvc.perform(patch("/api/tasks/{id}/status", taskId)
                        .header("Authorization", "Bearer " + pmToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"In Progress"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(taskId))
                .andExpect(jsonPath("$.status").value("In Progress"));
    }

    /** 9. Kanban boardcards, subtasks, and dependencies expose taskKey. */
    @Test
    void kanbanSubtasksAndDependenciesExposeTaskKey() throws Exception {
        Project project = createProject(pm, "Kanban Project", "KBN");

        Task blocker = new Task();
        blocker.setTitle("Blocker Task");
        blocker.setProject(project);
        blocker.setTaskKey("KBN-1");
        blocker.setStatus("To Do");
        blocker = taskRepository.saveAndFlush(blocker);

        Task blocked = new Task();
        blocked.setTitle("Blocked Task");
        blocked.setProject(project);
        blocked.setTaskKey("KBN-2");
        blocked.setStatus("To Do");
        blocked.setBlocked(true);
        blocked = taskRepository.saveAndFlush(blocked);

        taskDependencyRepository.saveAndFlush(new TaskDependency(blocked, blocker));

        // Dependency endpoint by numeric ID returns blocker's taskKey
        mockMvc.perform(get("/api/tasks/{taskId}/dependencies", blocked.getId())
                        .header("Authorization", "Bearer " + pmToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0]").value("KBN-1"));

        // Subtask endpoint returns taskKey
        Subtask subtask = new Subtask();
        subtask.setTitle("Decomposed work");
        subtask.setTask(blocked);
        subtask = subtaskRepository.saveAndFlush(subtask);

        mockMvc.perform(get("/api/tasks/{taskId}/subtasks", blocked.getId())
                        .header("Authorization", "Bearer " + pmToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].taskId").value(blocked.getId()))
                .andExpect(jsonPath("$[0].taskKey").value("KBN-2"));
    }

    /** 10. Unauthorized access and invalid task IDs return appropriate HTTP status codes. */
    @Test
    void unauthorizedAccessAndInvalidTaskIdsReturnExpectedErrors() throws Exception {
        Project privateProject = createProject(pm, "Private PM Project", "PVT");

        Task task = new Task();
        task.setTitle("Private Task");
        task.setProject(privateProject);
        task.setTaskKey("PVT-1");
        task = taskRepository.saveAndFlush(task);

        // Developer not member of project cannot view task
        mockMvc.perform(get("/api/tasks/{id}", task.getId())
                        .header("Authorization", "Bearer " + devToken))
                .andExpect(status().isForbidden());

        // Developer cannot create task
        mockMvc.perform(post("/api/tasks")
                        .header("Authorization", "Bearer " + devToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"projectId":%d,"title":"Dev forbidden task"}
                                """.formatted(privateProject.getId())))
                .andExpect(status().isForbidden());

        // Non-existent task ID returns 404
        mockMvc.perform(get("/api/tasks/{id}", 999999L)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());

        // Malformed task ID returns 400
        mockMvc.perform(get("/api/tasks/{id}", "not-a-number")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest());
    }

    private User createUser(Role role) {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        User user = new User();
        user.setFullName("User " + suffix);
        user.setLegacyName(user.getFullName());
        user.setUserCode("u" + suffix.substring(0, 10));
        user.setEmail(suffix + "@test.local");
        user.setPassword(passwordEncoder.encode("Password@123"));
        user.setRole(role);
        user.setActive(true);
        user.setAvailabilityStatus("Active");
        return userRepository.saveAndFlush(user);
    }

    private Project createProject(User manager, String name, String key) {
        Project project = new Project();
        project.setName(name);
        project.setProjectKey(key);
        project.setStatus("Not Started");
        project.setPriority("Medium");
        project.setTaskCounter(0);
        project.setProjectManager(manager);
        return projectRepository.saveAndFlush(project);
    }
}
