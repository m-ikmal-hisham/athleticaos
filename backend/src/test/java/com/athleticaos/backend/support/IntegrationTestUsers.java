package com.athleticaos.backend.support;

import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Role;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.repositories.RoleRepository;
import com.athleticaos.backend.repositories.UserRepository;

import java.util.HashSet;
import java.util.Set;

/**
 * Real user rows for integration tests that sign in with {@code @WithMockUser}.
 *
 * Since SEC-04 the admin services resolve the caller's organisation scope from the database
 * (UserService.getCurrentUser), so the mock user's name must belong to an existing user with
 * the matching role. Use the constants as the {@code username} of {@code @WithMockUser} and
 * call {@link #ensure} in {@code @BeforeEach}.
 */
public final class IntegrationTestUsers {

    public static final String SUPER_ADMIN = "it-super-admin@example.test";
    public static final String PLAYER_NO_ORG = "it-player-no-org@example.test";

    private IntegrationTestUsers() {
    }

    public static User ensure(UserRepository users, RoleRepository roles, String email, String roleName,
            Organisation organisation) {
        return users.findByEmail(email).orElseGet(() -> {
            Role role = roles.findByName(roleName)
                    .orElseThrow(() -> new IllegalStateException("Role not seeded: " + roleName));
            Set<Role> roleSet = new HashSet<>();
            roleSet.add(role);
            return users.saveAndFlush(User.builder()
                    .email(email)
                    .passwordHash("not-a-real-hash")
                    .firstName("Integration")
                    .lastName("Test")
                    .organisation(organisation)
                    .roles(roleSet)
                    .build());
        });
    }

    public static User ensureSuperAdmin(UserRepository users, RoleRepository roles) {
        return ensure(users, roles, SUPER_ADMIN, "ROLE_SUPER_ADMIN", null);
    }
}
