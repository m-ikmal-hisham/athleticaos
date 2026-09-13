package com.athleticaos.backend.config;

import com.athleticaos.backend.entities.Role;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.repositories.RoleRepository;
import com.athleticaos.backend.repositories.UserRepository;
import com.athleticaos.backend.security.PasswordPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Collections;
import java.util.HashSet;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class UserSeedConfigTest {

    private static final String STRONG_PASSWORD = "Violet-Kettle-Harbour-58";
    private static final String WEAK_PASSWORD = "short";

    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Spy  private PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);
    @Spy  private PasswordPolicy passwordPolicy = new PasswordPolicy();

    private MockEnvironment environment;
    private Role superAdminRole;

    @BeforeEach
    void setUp() {
        environment = new MockEnvironment();
        superAdminRole = Role.builder().id(1).name("ROLE_SUPER_ADMIN").build();

        // All existing roles found
        when(roleRepository.findByName("ROLE_SUPER_ADMIN")).thenReturn(Optional.of(superAdminRole));
        when(roleRepository.findByName("ROLE_ORG_ADMIN")).thenReturn(Optional.of(Role.builder().id(2).name("ROLE_ORG_ADMIN").build()));
        when(roleRepository.findByName("ROLE_CLUB_ADMIN")).thenReturn(Optional.of(Role.builder().id(3).name("ROLE_CLUB_ADMIN").build()));
        when(roleRepository.findByName("ROLE_COACH")).thenReturn(Optional.of(Role.builder().id(4).name("ROLE_COACH").build()));
        when(roleRepository.findByName("ROLE_PLAYER")).thenReturn(Optional.of(Role.builder().id(5).name("ROLE_PLAYER").build()));
    }

    private UserSeedConfig createConfig() {
        return new UserSeedConfig(userRepository, roleRepository, passwordEncoder, environment, passwordPolicy);
    }

    @Test
    void envVarsUnsetAndAdminsMissing_noUserSaved() throws Exception {
        // Neither ADMIN_PASSWORD nor RAGBI_ADMIN_PASSWORD set
        when(userRepository.findByEmail("admin@athleticaos.com")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("ragbionline@athleticaos.com")).thenReturn(Optional.empty());

        createConfig().seedUsers().run();

        verify(userRepository, never()).save(any());
    }

    @Test
    void adminExistsEnvSetFlagAbsent_passwordHashUnchanged() throws Exception {
        environment.setProperty("ADMIN_PASSWORD", STRONG_PASSWORD);

        String originalHash = passwordEncoder.encode("Other-Strong-Pass-21");
        User existingAdmin = User.builder()
                .id(UUID.randomUUID())
                .email("admin@athleticaos.com")
                .passwordHash(originalHash)
                .isActive(true)
                .roles(new HashSet<>(Collections.singleton(superAdminRole)))
                .build();
        when(userRepository.findByEmail("admin@athleticaos.com")).thenReturn(Optional.of(existingAdmin));
        when(userRepository.findByEmail("ragbionline@athleticaos.com")).thenReturn(Optional.empty());

        createConfig().seedUsers().run();

        // The password hash should remain unchanged (no reset without flag)
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getPasswordHash()).isEqualTo(originalHash);
    }

    @Test
    void resetFlagTrueWithPolicyValidEnvValue_hashChangesAndTimestampSet() throws Exception {
        environment.setProperty("ADMIN_PASSWORD", STRONG_PASSWORD);
        environment.setProperty(UserSeedConfig.RESET_FLAG, "true");

        String originalHash = passwordEncoder.encode("Other-Strong-Pass-21");
        User existingAdmin = User.builder()
                .id(UUID.randomUUID())
                .email("admin@athleticaos.com")
                .passwordHash(originalHash)
                .isActive(true)
                .roles(new HashSet<>(Collections.singleton(superAdminRole)))
                .build();
        when(userRepository.findByEmail("admin@athleticaos.com")).thenReturn(Optional.of(existingAdmin));
        when(userRepository.findByEmail("ragbionline@athleticaos.com")).thenReturn(Optional.empty());

        createConfig().seedUsers().run();

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        // Hash should be different from the original
        assertThat(saved.getPasswordHash()).isNotEqualTo(originalHash);
        assertThat(passwordEncoder.matches(STRONG_PASSWORD, saved.getPasswordHash())).isTrue();
        assertThat(saved.getPasswordChangedAt()).isNotNull();
    }

    @Test
    void resetFlagTrueWithWeakEnvValue_hashUnchanged() throws Exception {
        environment.setProperty("ADMIN_PASSWORD", WEAK_PASSWORD);
        environment.setProperty(UserSeedConfig.RESET_FLAG, "true");

        String originalHash = passwordEncoder.encode("Other-Strong-Pass-21");
        User existingAdmin = User.builder()
                .id(UUID.randomUUID())
                .email("admin@athleticaos.com")
                .passwordHash(originalHash)
                .isActive(true)
                .roles(new HashSet<>(Collections.singleton(superAdminRole)))
                .build();
        when(userRepository.findByEmail("admin@athleticaos.com")).thenReturn(Optional.of(existingAdmin));
        when(userRepository.findByEmail("ragbionline@athleticaos.com")).thenReturn(Optional.empty());

        createConfig().seedUsers().run();

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        // Hash should remain unchanged because the password was rejected by policy
        assertThat(captor.getValue().getPasswordHash()).isEqualTo(originalHash);
    }
}
