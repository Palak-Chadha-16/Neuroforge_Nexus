package com.neuroforge.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.neuroforge.backend.entity.Role;
import com.neuroforge.backend.entity.Skill;
import com.neuroforge.backend.entity.User;
import com.neuroforge.backend.repository.UserRepository;
import com.neuroforge.backend.service.ProjectService;

import lombok.RequiredArgsConstructor;

/**
 * Runs once at startup:
 *  1. Signup can only create DEVELOPERs, so if there is no Admin yet, create the first one from
 *     the app.bootstrap-admin.* properties (skipped when the password is blank).
 *  2. Re-derive every project's status from its tasks (old rows had a manually chosen status).
 */
@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ProjectService projectService;
    private final com.neuroforge.backend.service.TaskKeyService taskKeyService;

    @Value("${app.bootstrap-admin.full-name:System Admin}")
    private String fullName;

    @Value("${app.bootstrap-admin.user-id:admin}")
    private String userCode;

    @Value("${app.bootstrap-admin.email:}")
    private String email;

    @Value("${app.bootstrap-admin.contact-number:}")
    private String contactNumber;

    @Value("${app.bootstrap-admin.password:}")
    private String password;

    @Override
    public void run(ApplicationArguments args) {
        createFirstAdminIfMissing();
        taskKeyService.syncAllProjectsAndBackfillTasks();
        projectService.recalculateAllStatuses();
    }

    private void createFirstAdminIfMissing() {
        if (userRepository.countByRole(Role.ADMIN) > 0) {
            return;
        }
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            log.warn("No Admin exists and app.bootstrap-admin.email/password are not set. "
                    + "Set them (or promote a user with SQL) to get an Admin account.");
            return;
        }
        if (userRepository.existsByEmailIgnoreCase(email) || userRepository.existsByUserCodeIgnoreCase(userCode)) {
            log.warn("Bootstrap admin email/user id already belongs to a non-admin user; promote that user with SQL instead.");
            return;
        }

        User admin = new User();
        admin.setFullName(fullName);
        admin.setLegacyName(fullName);
        admin.setUserCode(userCode);
        admin.setEmail(email.trim().toLowerCase());
        admin.setContactNumber(contactNumber == null || contactNumber.isBlank() ? null : contactNumber);
        admin.setSkill(Skill.FULL_STACK_DEVELOPER);
        admin.setPassword(passwordEncoder.encode(password));
        admin.setRole(Role.ADMIN);
        admin.setActive(true);
        admin.setAvailabilityStatus("Active");
        userRepository.save(admin);

        log.info("Created first Admin account '{}' ({})", userCode, admin.getEmail());
    }
}
