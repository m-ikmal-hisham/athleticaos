package com.athleticaos.backend.config;

import com.athleticaos.backend.entities.Role;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.repositories.RoleRepository;
import com.athleticaos.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class UserSeedConfig {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final Environment environment;

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

            // Read passwords from environment variables (fallback to "password123" for local dev)
            String adminPassword = environment.getProperty("ADMIN_PASSWORD", "password123");
            String ragbiAdminPassword = environment.getProperty("RAGBI_ADMIN_PASSWORD", "password123");

            // Seed Super Admin: admin@athleticaos.com
            seedSuperAdmin("admin@athleticaos.com", "Super", "Admin", adminPassword, superAdminRole);

            // Seed Super Admin: ragbionline@athleticaos.com
            seedSuperAdmin("ragbionline@athleticaos.com", "Ragbi", "Online", ragbiAdminPassword, superAdminRole);
        };
    }

    @SuppressWarnings("null")
    private void seedSuperAdmin(String email, String firstName, String lastName, String password, Role superAdminRole) {
        if (userRepository.findByEmail(email).isEmpty()) {
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
            log.info("Super admin user already exists: {}. Updating credentials and roles.", email);
            User existingAdmin = userRepository.findByEmail(email).get();
            existingAdmin.setPasswordHash(passwordEncoder.encode(password));
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
}
