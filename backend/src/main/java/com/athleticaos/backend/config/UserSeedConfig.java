package com.athleticaos.backend.config;

import com.athleticaos.backend.entities.Role;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.repositories.RoleRepository;
import com.athleticaos.backend.repositories.UserRepository;
import com.athleticaos.backend.security.PasswordPolicy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class UserSeedConfig {

    static final String RESET_FLAG = "athleticaos.seed.reset-admin-passwords";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final Environment environment;
    private final PasswordPolicy passwordPolicy;

    @Bean
    @SuppressWarnings("null")
    public CommandLineRunner seedUsers() {
        return args -> {
            log.info("Seeding users...");

            // Ensure ROLE_SUPER_ADMIN exists
            Role superAdminRole = roleRepository.findByName("ROLE_SUPER_ADMIN")
                    .orElseGet(() -> {
                        log.info("Creating ROLE_SUPER_ADMIN");
                        return roleRepository.save(Role.builder().name("ROLE_SUPER_ADMIN").build());
                    });

            // Ensure ROLE_ORG_ADMIN exists
            roleRepository.findByName("ROLE_ORG_ADMIN")
                    .orElseGet(() -> {
                        log.info("Creating ROLE_ORG_ADMIN");
                        return roleRepository.save(Role.builder().name("ROLE_ORG_ADMIN").build());
                    });

            // Ensure ROLE_CLUB_ADMIN exists
            roleRepository.findByName("ROLE_CLUB_ADMIN")
                    .orElseGet(() -> {
                        log.info("Creating ROLE_CLUB_ADMIN");
                        return roleRepository.save(Role.builder().name("ROLE_CLUB_ADMIN").build());
                    });

            // Ensure ROLE_COACH exists
            roleRepository.findByName("ROLE_COACH")
                    .orElseGet(() -> {
                        log.info("Creating ROLE_COACH");
                        return roleRepository.save(Role.builder().name("ROLE_COACH").build());
                    });

            // Ensure ROLE_PLAYER exists
            roleRepository.findByName("ROLE_PLAYER")
                    .orElseGet(() -> {
                        log.info("Creating ROLE_PLAYER");
                        return roleRepository.save(Role.builder().name("ROLE_PLAYER").build());
                    });

            // Passwords come only from the environment; there is deliberately no code fallback.
            boolean resetPasswords = environment.getProperty(RESET_FLAG, Boolean.class, false);

            // Seed Super Admin: admin@athleticaos.com
            seedSuperAdmin("admin@athleticaos.com", "Super", "Admin", "ADMIN_PASSWORD", resetPasswords, superAdminRole);

            // Seed Super Admin: ragbionline@athleticaos.com
            seedSuperAdmin("ragbionline@athleticaos.com", "Ragbi", "Online", "RAGBI_ADMIN_PASSWORD", resetPasswords,
                    superAdminRole);
        };
    }

    /**
     * Creates the super admin if missing (only when its env var is set). An existing admin's password is
     * left alone unless {@value #RESET_FLAG}=true is set for a single boot — it is no longer reset on every start.
     */
    @SuppressWarnings("null")
    private void seedSuperAdmin(String email, String firstName, String lastName, String passwordEnvVar,
            boolean resetPassword, Role superAdminRole) {
        String password = environment.getProperty(passwordEnvVar);
        boolean passwordProvided = password != null && !password.isBlank() && isAcceptable(password, email, passwordEnvVar);

        if (userRepository.findByEmail(email).isEmpty()) {
            if (!passwordProvided) {
                log.warn("Super admin {} not created: {} is not set or not acceptable", email, passwordEnvVar);
                return;
            }
            log.info("Creating super admin user: {}", email);
            User admin = User.builder()
                    .email(email)
                    .passwordHash(passwordEncoder.encode(password))
                    .firstName(firstName)
                    .lastName(lastName)
                    .isActive(true)
                    .roles(new HashSet<>(Collections.singletonList(superAdminRole)))
                    .build();
            userRepository.save(admin);
            log.info("Super admin created successfully: {}", email);
        } else {
            log.info("Super admin user already exists: {}. Ensuring roles.", email);
            User existingAdmin = userRepository.findByEmail(email).get();
            if (resetPassword) {
                if (passwordProvided) {
                    existingAdmin.setPasswordHash(passwordEncoder.encode(password));
                    existingAdmin.setMustChangePassword(false);
                    // Revokes the admin's existing sessions
                    existingAdmin.setPasswordChangedAt(LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS));
                    log.warn("Super admin {} password reset from {} ({}=true). Unset the flag after this boot.",
                            email, passwordEnvVar, RESET_FLAG);
                } else {
                    log.warn("{}=true but {} is not set or not acceptable; {} left unchanged",
                            RESET_FLAG, passwordEnvVar, email);
                }
            }
            existingAdmin.setFirstName(firstName);
            existingAdmin.setLastName(lastName);

            // Ensure role is present
            Set<Role> roles = existingAdmin.getRoles();
            if (roles == null) {
                roles = new HashSet<>();
            }
            roles.add(superAdminRole);
            existingAdmin.setRoles(roles);

            userRepository.save(existingAdmin);
            log.info("Super admin updated successfully: {}", email);
        }
    }

    private boolean isAcceptable(String password, String email, String passwordEnvVar) {
        try {
            passwordPolicy.validate(password, email);
            return true;
        } catch (IllegalArgumentException e) {
            log.error("{} rejected by password policy: {}", passwordEnvVar, e.getMessage());
            return false;
        }
    }
}
