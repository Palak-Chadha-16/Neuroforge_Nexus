package com.neuroforge.backend;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Date;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import com.neuroforge.backend.entity.Role;
import com.neuroforge.backend.entity.Project;
import com.neuroforge.backend.entity.Sprint;
import com.neuroforge.backend.entity.Task;
import com.neuroforge.backend.entity.User;
import com.neuroforge.backend.repository.BugReportActivityRepository;
import com.neuroforge.backend.repository.BugReportCommentRepository;
import com.neuroforge.backend.repository.BugReportRepository;
import com.neuroforge.backend.repository.CalendarEventRepository;
import com.neuroforge.backend.repository.ProjectMemberAssignmentRepository;
import com.neuroforge.backend.repository.ProjectRepository;
import com.neuroforge.backend.repository.SprintRepository;
import com.neuroforge.backend.repository.TaskRepository;
import com.neuroforge.backend.repository.TeamMemberRepository;
import com.neuroforge.backend.repository.UserRepository;
import com.neuroforge.backend.security.JwtService;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

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
class BackendSecurityIntegrationTests {

    private static final String TEST_SECRET =
            "neuroforge-integration-test-secret-key-0123456789";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private TeamMemberRepository teamMemberRepository;

    @Autowired
    private ProjectMemberAssignmentRepository projectMemberAssignmentRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private SprintRepository sprintRepository;

    @Autowired
    private BugReportRepository bugReportRepository;

    @Autowired
    private BugReportCommentRepository commentRepository;

    @Autowired
    private BugReportActivityRepository activityRepository;

    @Autowired
    private CalendarEventRepository calendarEventRepository;

    private User caller;
    private User otherUser;

    @BeforeEach
    void createIsolatedUsers() {
        caller = createUser(Role.DEVELOPER);
        otherUser = createUser(Role.TESTER);
    }

    @Test
    void loginAcceptsValidCredentialsAndRejectsInvalidCredentials() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"identifier":"%s","password":"CorrectPassword1!"}
                                """.formatted(caller.getEmail())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"identifier":"%s","password":"WrongPassword1!"}
                                """.formatted(caller.getEmail())))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void missingInvalidAndExpiredTokensAreRejected() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer not-a-jwt"))
                .andExpect(status().isUnauthorized());

        String expiredToken = Jwts.builder()
                .subject(caller.getId().toString())
                .claim("userId", caller.getId())
                .claim("role", caller.getRole().name())
                .claim("email", caller.getEmail())
                .issuedAt(Date.from(Instant.now().minusSeconds(120)))
                .expiration(Date.from(Instant.now().minusSeconds(60)))
                .signWith(Keys.hmacShaKeyFor(TEST_SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + expiredToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void profileReadsAndSelfUpdatesAreScopedAndCannotChangeRole() throws Exception {
        String token = jwtService.generateToken(caller);
        mockMvc.perform(get("/api/users/{id}/profile", caller.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/users/{id}/profile", otherUser.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/users/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Updated Test User","accessRole":"ADMIN","active":false}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("DEVELOPER"))
                .andExpect(jsonPath("$.fullName").value("Updated Test User"));

        User refreshed = userRepository.findById(caller.getId()).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(refreshed.getRole()).isEqualTo(Role.DEVELOPER);
        org.assertj.core.api.Assertions.assertThat(refreshed.isActive()).isTrue();
    }

    @Test
    void nonAdminCannotReadUserDirectoryOrChangeRoles() throws Exception {
        String token = jwtService.generateToken(caller);
        mockMvc.perform(get("/api/users").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/users/{id}/status", otherUser.getId())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"active":false,"status":"Inactive"}
                                """))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/teams")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/tasks")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/users/{id}/role", caller.getId())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"role":"ADMIN"}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void bugReportsCommentsActivityAndSummaryPersistAndRespectProjectAccess() throws Exception {
        User admin = createUser(Role.ADMIN);
        Project project = createProject(admin);
        String adminToken = jwtService.generateToken(admin);

        String createResponse = mockMvc.perform(post("/api/bugs")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title":"Persistence regression",
                                  "description":"Bug description",
                                  "projectId":%d,
                                  "module":"API",
                                  "environment":"Integration",
                                  "severity":"High",
                                  "priority":"High",
                                  "reportedBy":999999
                                }
                                """.formatted(project.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reportedBy").value(admin.getId()))
                .andReturn().getResponse().getContentAsString();

        long bugId = objectMapper.readTree(createResponse).get("id").asLong();
        mockMvc.perform(post("/api/bugs/{id}/comments", bugId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"text":"Verified on integration database"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.authorId").value(admin.getId()));

        mockMvc.perform(patch("/api/bugs/{id}/status", bugId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"In Progress"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("In Progress"));

        mockMvc.perform(get("/api/bugs/{id}/comments", bugId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].text").value("Verified on integration database"));

        mockMvc.perform(get("/api/bugs/{id}/activity", bugId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3));

        mockMvc.perform(get("/api/bugs/{id}", bugId)
                        .header("Authorization", "Bearer " + jwtService.generateToken(caller)))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/bugs/{id}/summary", bugId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isServiceUnavailable());

        org.assertj.core.api.Assertions.assertThat(bugReportRepository.findById(bugId)).isPresent();
        org.assertj.core.api.Assertions.assertThat(commentRepository.findByBugIdOrderByCreatedAtAscIdAsc(bugId))
                .hasSize(1);
        org.assertj.core.api.Assertions.assertThat(activityRepository.findByBugIdOrderByCreatedAtAscIdAsc(bugId))
                .hasSize(3);
    }

    @Test
    void manualCalendarEventsSupportCrudAndDoNotAllowCrossUserPersonalAssignment() throws Exception {
        String token = jwtService.generateToken(caller);
        String createResponse = mockMvc.perform(post("/api/calendar")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title":"Planning",
                                  "eventDate":"2027-11-10T12:00:00",
                                  "type":"MEETING",
                                  "priority":"HIGH"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.source").value("MANUAL"))
                .andReturn().getResponse().getContentAsString();
        long eventId = objectMapper.readTree(createResponse).get("id").asLong();

        mockMvc.perform(patch("/api/calendar/{id}/date", eventId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"eventDate":"2027-11-12T16:30:00"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eventDate").value("2027-11-12T16:30:00"));
        mockMvc.perform(get("/api/calendar/{id}", eventId)
                        .header("Authorization", "Bearer " + jwtService.generateToken(otherUser)))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/calendar/{id}", eventId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title":"Edited planning",
                                  "eventDate":"2027-11-13T09:00:00",
                                  "type":"MEETING",
                                  "priority":"MEDIUM"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Edited planning"));

        mockMvc.perform(post("/api/calendar")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title":"Private event",
                                  "eventDate":"2027-11-14T12:00:00",
                                  "type":"MEETING",
                                  "priority":"MEDIUM",
                                  "assignedTo":%d
                                }
                                """.formatted(otherUser.getId())))
                .andExpect(status().isForbidden());

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/calendar/{id}", eventId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        org.assertj.core.api.Assertions.assertThat(calendarEventRepository.findById(eventId)).isEmpty();
    }

    @Test
    void aiCalendarRequestsPersistEventsRescheduleUniqueMatchesAndClarifyAmbiguity() throws Exception {
        String token = jwtService.generateToken(caller);

        mockMvc.perform(post("/api/chat")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"message":"Schedule meeting called Design Review 2027-11-10 at 3 PM"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reply").value(org.hamcrest.Matchers.containsString("Scheduled")));

        org.assertj.core.api.Assertions.assertThat(calendarEventRepository.findByCreatedBy(caller.getId()))
                .anySatisfy(event -> org.assertj.core.api.Assertions.assertThat(event.getSource()).isEqualTo("AI"));

        mockMvc.perform(post("/api/chat")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"message":"Reschedule Design Review to 2027-11-12 at 4 PM"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reply").value(org.hamcrest.Matchers.containsString("Rescheduled")));

        mockMvc.perform(post("/api/calendar")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title":"Planning Alpha",
                                  "eventDate":"2027-11-20T10:00:00",
                                  "type":"MEETING"
                                }
                                """))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/calendar")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title":"Planning Beta",
                                  "eventDate":"2027-11-21T10:00:00",
                                  "type":"MEETING"
                                }
                                """))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/chat")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"message":"Reschedule meeting to 2027-11-25"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reply").value(org.hamcrest.Matchers.containsString("multiple")));
    }

    @Test
    void githubRepositoryUpdatesAreReturnedFromPersistedProjectData() throws Exception {
        User admin = createUser(Role.ADMIN);
        Project project = createProject(admin);

        mockMvc.perform(put("/api/projects/{id}", project.getId())
                        .header("Authorization", "Bearer " + jwtService.generateToken(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name":"Updated integration project",
                                  "repository":"https://github.com/neuroforge/demo-repo.git"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.repository").value("https://github.com/neuroforge/demo-repo"));

        Project saved = projectRepository.findById(project.getId()).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(saved.getGithubOwner()).isEqualTo("neuroforge");
        org.assertj.core.api.Assertions.assertThat(saved.getGithubRepository()).isEqualTo("demo-repo");
    }

    @Test
    void visibleTaskAndSprintDeadlinesAppearAsSystemCalendarEvents() throws Exception {
        User admin = createUser(Role.ADMIN);
        Project project = createProject(admin);

        Task task = new Task();
        task.setTitle("Integration task deadline");
        task.setProject(project);
        task.setTaskKey("IT-" + UUID.randomUUID().toString().substring(0, 8));
        task.setDueDate(LocalDate.of(2027, 11, 10));
        taskRepository.saveAndFlush(task);

        Sprint sprint = Sprint.builder()
                .project(project)
                .name("Integration sprint")
                .startDate(LocalDate.of(2027, 11, 1))
                .endDate(LocalDate.of(2027, 11, 14))
                .build();
        sprintRepository.saveAndFlush(sprint);

        mockMvc.perform(get("/api/calendar")
                        .header("Authorization", "Bearer " + jwtService.generateToken(admin)))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Task deadline: Integration task deadline")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Sprint end: Integration sprint")));
    }

    @Test
    void projectManagersCannotAccessAnotherManagersProjectOrTasks() throws Exception {
        User projectManager = createUser(Role.PROJECT_MANAGER);
        User otherManager = createUser(Role.PROJECT_MANAGER);
        Project ownProject = createProject(projectManager);
        Project privateProject = createProject(otherManager);
        Task privateTask = createTask(privateProject, null);
        String managerToken = jwtService.generateToken(projectManager);

        mockMvc.perform(get("/api/projects/{id}", ownProject.getId())
                        .header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/projects/{id}", privateProject.getId())
                        .header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/tasks/{id}", privateTask.getId())
                        .header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void projectManagerScopeAlsoLimitsProjectAndTaskCollections() throws Exception {
        User projectManager = createUser(Role.PROJECT_MANAGER);
        User otherManager = createUser(Role.PROJECT_MANAGER);
        Project ownProject = createProject(projectManager);
        Project privateProject = createProject(otherManager);
        Task ownTask = createTask(ownProject, null);
        Task privateTask = createTask(privateProject, null);
        String managerToken = jwtService.generateToken(projectManager);

        mockMvc.perform(get("/api/projects")
                        .header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(ownProject.getId()));
        mockMvc.perform(get("/api/tasks")
                        .header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(ownTask.getId()));
    }

    @Test
    void executionUsersCanMoveOnlyTasksAssignedToThemAndAdminsCanChangeRoles() throws Exception {
        User admin = createUser(Role.ADMIN);
        Project project = createProject(admin);
        project.getMembers().add(otherUser);
        project = projectRepository.saveAndFlush(project);
        Task assignedTask = createTask(project, otherUser);

        mockMvc.perform(get("/api/tasks/{id}", assignedTask.getId())
                        .header("Authorization", "Bearer " + jwtService.generateToken(caller)))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/tasks/{id}/status", assignedTask.getId())
                        .header("Authorization", "Bearer " + jwtService.generateToken(caller))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"In Progress"}
                                """))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/tasks/{id}/status", assignedTask.getId())
                        .header("Authorization", "Bearer " + jwtService.generateToken(otherUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"In Progress"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assigneeId").value(otherUser.getId()));

        mockMvc.perform(patch("/api/users/{id}/role", caller.getId())
                        .header("Authorization", "Bearer " + jwtService.generateToken(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"role":"TESTER"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("TESTER"));
    }

    @Test
    void teamAssignmentsPersistAsProjectMembersWithValidatedRoles() throws Exception {
        User projectManager = createUser(Role.PROJECT_MANAGER);
        User teamLead = createUser(Role.TEAM_LEAD);
        User developer = createUser(Role.DEVELOPER);
        User inactiveDeveloper = createUser(Role.DEVELOPER);
        inactiveDeveloper.setActive(false);
        userRepository.saveAndFlush(inactiveDeveloper);
        String managerToken = jwtService.generateToken(projectManager);

        String projectBody = mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Team assignment %s","projectManagerId":%d}
                                """.formatted(UUID.randomUUID(), projectManager.getId())))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long projectId = objectMapper.readTree(projectBody).get("id").asLong();

        String userOptionsBody = mockMvc.perform(get("/api/users/options")
                        .header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        var userOptions = objectMapper.readTree(userOptionsBody);
        var optionRoles = new java.util.ArrayList<String>();
        var optionUserIds = new java.util.ArrayList<Long>();
        userOptions.forEach(option -> {
            optionRoles.add(option.get("role").asText());
            optionUserIds.add(option.get("id").asLong());
        });
        org.assertj.core.api.Assertions.assertThat(optionRoles)
                .contains("TEAM_LEAD", "DEVELOPER");
        org.assertj.core.api.Assertions.assertThat(optionUserIds)
                .doesNotContain(inactiveDeveloper.getId());

        String teamBody = mockMvc.perform(post("/api/teams")
                        .header("Authorization", "Bearer " + managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"projectId":%d,"name":"Delivery team"}
                                """.formatted(projectId)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long teamId = objectMapper.readTree(teamBody).get("id").asLong();

        mockMvc.perform(post("/api/teams/{teamId}/members", teamId)
                        .header("Authorization", "Bearer " + managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"userId":%d,"teamRole":"Team Lead"}
                                """.formatted(teamLead.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.memberId").isNumber())
                .andExpect(jsonPath("$.userId").value(teamLead.getId()))
                .andExpect(jsonPath("$.fullName").value(teamLead.getFullName()))
                .andExpect(jsonPath("$.teamRole").value("Team Lead"));

        mockMvc.perform(post("/api/teams/{teamId}/members", teamId)
                        .header("Authorization", "Bearer " + managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"userId":%d,"teamRole":"Developer"}
                                """.formatted(developer.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.teamRole").value("Developer"));

        mockMvc.perform(post("/api/teams/{teamId}/members", teamId)
                        .header("Authorization", "Bearer " + managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"userId":%d,"teamRole":"Developer"}
                                """.formatted(developer.getId())))
                .andExpect(status().isConflict());

        org.assertj.core.api.Assertions.assertThat(
                projectMemberAssignmentRepository.findByProjectIdAndUserId(projectId, teamLead.getId()))
                .hasValueSatisfying(assignment ->
                        org.assertj.core.api.Assertions.assertThat(assignment.getProjectRole()).isEqualTo("Team Lead"));
        org.assertj.core.api.Assertions.assertThat(
                projectMemberAssignmentRepository.findByProjectIdAndUserId(projectId, developer.getId()))
                .hasValueSatisfying(assignment ->
                        org.assertj.core.api.Assertions.assertThat(assignment.getProjectRole()).isEqualTo("Developer"));

        mockMvc.perform(get("/api/projects/{projectId}/members", projectId)
                        .header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));

        mockMvc.perform(get("/api/teams/{teamId}/members", teamId)
                        .header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[*].teamRole",
                        org.hamcrest.Matchers.hasItems("Team Lead", "Developer")));

        mockMvc.perform(put("/api/projects/{projectId}", projectId)
                        .header("Authorization", "Bearer " + managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Updated team assignment project"}
                                """))
                .andExpect(status().isOk());
        org.assertj.core.api.Assertions.assertThat(projectMemberAssignmentRepository
                .findByProjectIdAndUserId(projectId, teamLead.getId())).isPresent();

        mockMvc.perform(post("/api/teams/{teamId}/members", teamId)
                        .header("Authorization", "Bearer " + managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"userId":%d,"teamRole":"Manager"}
                                """.formatted(teamLead.getId())))
                .andExpect(status().isConflict());

        mockMvc.perform(post("/api/teams/{teamId}/members", teamId)
                        .header("Authorization", "Bearer " + jwtService.generateToken(caller))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"userId":%d,"teamRole":"Developer"}
                                """.formatted(otherUser.getId())))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/teams/{teamId}/members/{userId}", teamId, teamLead.getId())
                        .header("Authorization", "Bearer " + managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"teamRole":"Team Lead"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.teamRole").value("Team Lead"));

        mockMvc.perform(get("/api/projects/{projectId}/members", projectId)
                        .header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/teams/{teamId}/members/{userId}", teamId, teamLead.getId())
                        .header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isNoContent());
        org.assertj.core.api.Assertions.assertThat(teamMemberRepository
                .findByTeamIdAndUserId(teamId, teamLead.getId())).isEmpty();
        org.assertj.core.api.Assertions.assertThat(projectMemberAssignmentRepository
                .findByProjectIdAndUserId(projectId, teamLead.getId())).isPresent();
    }

    @Test
    void projectManagerOwnershipIsSeparateFromValidatedMemberRoles() throws Exception {
        User projectManager = createUser(Role.PROJECT_MANAGER);
        User tester = createUser(Role.TESTER);
        String managerToken = jwtService.generateToken(projectManager);

        String projectBody = mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Role separation %s"}
                                """.formatted(UUID.randomUUID())))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long projectId = objectMapper.readTree(projectBody).get("id").asLong();

        mockMvc.perform(get("/api/projects/{id}", projectId)
                        .header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.projectManager.id").value(projectManager.getId()));

        mockMvc.perform(post("/api/projects/{projectId}/members", projectId)
                        .header("Authorization", "Bearer " + managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"userId":%d,"projectRole":"Project Manager"}
                                """.formatted(projectManager.getId())))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/projects/{projectId}/members", projectId)
                        .header("Authorization", "Bearer " + managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"userId":%d,"projectRole":"Tester"}
                                """.formatted(tester.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.projectRole").value("Tester"));

        mockMvc.perform(get("/api/projects/{projectId}/members", projectId)
                        .header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].projectRole").value("Tester"));
    }

    @Test
    void adminCanManageProjectAndTeamTheyDoNotOwn() throws Exception {
        // Setup: projectOwner owns a project; admin does not own it
        User projectOwner = createUser(Role.PROJECT_MANAGER);
        User admin = createUser(Role.ADMIN);
        User teamLead = createUser(Role.TEAM_LEAD);
        User developer = createUser(Role.DEVELOPER);
        String adminToken = jwtService.generateToken(admin);

        // Owner creates the project
        String projectBody = mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + jwtService.generateToken(projectOwner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Admin cross-project %s","projectManagerId":%d}
                                """.formatted(UUID.randomUUID(), projectOwner.getId())))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long projectId = objectMapper.readTree(projectBody).get("id").asLong();

        // Admin can view it
        mockMvc.perform(get("/api/projects/{id}", projectId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // Admin can update it (even though they are not the owner)
        mockMvc.perform(put("/api/projects/{id}", projectId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Admin updated cross-project"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Admin updated cross-project"));

        // Admin can create a team for a project they don't own
        String teamBody = mockMvc.perform(post("/api/teams")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"projectId":%d,"name":"Admin cross team"}
                                """.formatted(projectId)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long teamId = objectMapper.readTree(teamBody).get("id").asLong();

        // Admin can add a team lead to the team
        mockMvc.perform(post("/api/teams/{teamId}/members", teamId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"userId":%d,"teamRole":"Team Lead"}
                                """.formatted(teamLead.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.teamRole").value("Team Lead"));

        // Admin can add a developer
        mockMvc.perform(post("/api/teams/{teamId}/members", teamId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"userId":%d,"teamRole":"Developer"}
                                """.formatted(developer.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.teamRole").value("Developer"));

        // Duplicate member rejection
        mockMvc.perform(post("/api/teams/{teamId}/members", teamId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"userId":%d,"teamRole":"Developer"}
                                """.formatted(developer.getId())))
                .andExpect(status().isConflict());

        // Invalid team role (mismatched system role — developer cannot be Team Lead)
        mockMvc.perform(post("/api/teams/{teamId}/members", teamId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"userId":%d,"teamRole":"Team Lead"}
                                """.formatted(developer.getId())))
                .andExpect(status().isConflict());

        // updateMemberRole persists change
        mockMvc.perform(put("/api/teams/{teamId}/members/{userId}", teamId, teamLead.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"teamRole":"Team Lead"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.teamRole").value("Team Lead"));

        // Verify persistence after retrieval
        mockMvc.perform(get("/api/teams/{teamId}/members", teamId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[*].teamRole", org.hamcrest.Matchers.hasItems("Team Lead", "Developer")));

        // Verify project assignments were created
        org.assertj.core.api.Assertions.assertThat(
                projectMemberAssignmentRepository.findByProjectIdAndUserId(projectId, teamLead.getId()))
                .hasValueSatisfying(a -> org.assertj.core.api.Assertions.assertThat(a.getProjectRole()).isEqualTo("Team Lead"));
        org.assertj.core.api.Assertions.assertThat(
                projectMemberAssignmentRepository.findByProjectIdAndUserId(projectId, developer.getId()))
                .hasValueSatisfying(a -> org.assertj.core.api.Assertions.assertThat(a.getProjectRole()).isEqualTo("Developer"));

        // Admin can remove a member
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/teams/{teamId}/members/{userId}", teamId, developer.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        // Admin can update project member status
        mockMvc.perform(patch("/api/projects/{projectId}/members/{userId}/status", projectId, teamLead.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"In Meeting"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("In Meeting"));

        // Admin can create tasks on a project they do not own
        String taskBody = mockMvc.perform(post("/api/tasks")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"projectId":%d,"title":"Admin cross-project task","priority":"High"}
                                """.formatted(projectId)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long taskId = objectMapper.readTree(taskBody).get("id").asLong();

        // Admin can create sprints on a project they do not own
        mockMvc.perform(post("/api/projects/{projectId}/sprints", projectId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Admin Sprint 1","startDate":"2027-01-01","endDate":"2027-01-14","capacityPoints":20}
                                """))
                .andExpect(status().isCreated());

        // Admin can change the Project Manager to another manager
        User newManager = createUser(Role.PROJECT_MANAGER);
        mockMvc.perform(put("/api/projects/{id}", projectId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Admin updated cross-project","projectManagerId":%d}
                                """.formatted(newManager.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.projectManager.id").value(newManager.getId()));

        // Admin can delete task
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/tasks/{id}", taskId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // Admin can delete the team
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/teams/{id}", teamId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        // Admin can delete the project
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/projects/{id}", projectId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());
        org.assertj.core.api.Assertions.assertThat(projectRepository.findById(projectId)).isEmpty();
    }

    private User createUser(Role role) {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        User user = new User();
        user.setFullName("Integration " + suffix);
        user.setLegacyName(user.getFullName());
        user.setUserCode("it" + suffix.substring(0, 10));
        user.setEmail(suffix + "@example.test");
        user.setPassword(passwordEncoder.encode("CorrectPassword1!"));
        user.setRole(role);
        user.setActive(true);
        user.setAvailabilityStatus("Active");
        return userRepository.saveAndFlush(user);
    }

    private Project createProject(User manager) {
        Project project = new Project();
        project.setName("Integration project " + UUID.randomUUID());
        project.setStatus("Not Started");
        project.setPriority("Medium");
        project.setTaskCounter(0);
        project.setProjectManager(manager);
        return projectRepository.saveAndFlush(project);
    }

    private Task createTask(Project project, User assignee) {
        Task task = new Task();
        task.setTitle("Integration assigned task");
        task.setProject(project);
        task.setTaskKey("IT-" + UUID.randomUUID().toString().substring(0, 8));
        task.setAssignee(assignee);
        return taskRepository.saveAndFlush(task);
    }
}
