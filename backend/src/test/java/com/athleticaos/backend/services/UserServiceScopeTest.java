package com.athleticaos.backend.services;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.user.UserResponse;
import com.athleticaos.backend.dtos.user.UserRolesResponse;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Role;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.RoleRepository;
import com.athleticaos.backend.repositories.UserRepository;
import com.athleticaos.backend.security.PasswordPolicy;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class UserServiceScopeTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private OrganisationRepository organisationRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private PlayerTeamService playerTeamService;
    @Mock
    private AuditLogger auditLogger;
    @Mock
    private PasswordPolicy passwordPolicy;

    @InjectMocks
    private UserService userService;

    private UUID callerId;
    private UUID targetId;
    private UUID callerOrgId;
    private UUID targetOrgId;
    private Organisation callerOrg;
    private Organisation targetOrg;
    private Role playerRole;
    private Role superAdminRole;
    private Role orgAdminRole;

    @BeforeEach
    void setUp() {
        callerId = UUID.randomUUID();
        targetId = UUID.randomUUID();
        callerOrgId = UUID.randomUUID();
        targetOrgId = UUID.randomUUID();

        callerOrg = Organisation.builder().id(callerOrgId).name("Caller Org").build();
        targetOrg = Organisation.builder().id(targetOrgId).name("Target Org").build();

        playerRole = Role.builder().name("ROLE_PLAYER").build();
        superAdminRole = Role.builder().name("ROLE_SUPER_ADMIN").build();
        orgAdminRole = Role.builder().name("ROLE_ORG_ADMIN").build();

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("caller@example.test", "password")
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getUserByIdInScope_superAdmin_readsAnyone() {
        User superAdmin = User.builder()
                .id(callerId)
                .email("caller@example.test")
                .roles(Set.of(superAdminRole))
                .build();

        User foreignUser = User.builder()
                .id(targetId)
                .email("target@example.test")
                .organisation(targetOrg)
                .roles(Set.of(playerRole))
                .build();

        when(userRepository.findByEmail("caller@example.test")).thenReturn(Optional.of(superAdmin));
        when(userRepository.findById(targetId)).thenReturn(Optional.of(foreignUser));

        UserResponse response = userService.getUserByIdInScope(targetId);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(targetId);
    }

    @Test
    void getUserByIdInScope_selfAllowedWithNoOrganisation() {
        User selfUser = User.builder()
                .id(callerId)
                .email("caller@example.test")
                .roles(Set.of(playerRole))
                .organisation(null)
                .build();

        when(userRepository.findByEmail("caller@example.test")).thenReturn(Optional.of(selfUser));
        when(userRepository.findById(callerId)).thenReturn(Optional.of(selfUser));

        UserResponse response = userService.getUserByIdInScope(callerId);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(callerId);
    }

    @Test
    void getUserByIdInScope_sameHierarchyAllowed() {
        User callerUser = User.builder()
                .id(callerId)
                .email("caller@example.test")
                .roles(Set.of(orgAdminRole))
                .organisation(callerOrg)
                .build();

        User targetUser = User.builder()
                .id(targetId)
                .email("target@example.test")
                .roles(Set.of(playerRole))
                .organisation(targetOrg)
                .build();

        // Target org is a child in the hierarchy of caller org
        when(organisationRepository.findByParentOrgId(callerOrgId)).thenReturn(List.of(targetOrg));
        when(organisationRepository.findByParentOrgId(targetOrgId)).thenReturn(Collections.emptyList());

        when(userRepository.findByEmail("caller@example.test")).thenReturn(Optional.of(callerUser));
        when(userRepository.findById(targetId)).thenReturn(Optional.of(targetUser));

        UserResponse response = userService.getUserByIdInScope(targetId);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(targetId);
    }

    @Test
    void getUserByIdInScope_differentOrganisation_throwsNotFound() {
        User callerUser = User.builder()
                .id(callerId)
                .email("caller@example.test")
                .roles(Set.of(orgAdminRole))
                .organisation(callerOrg)
                .build();

        User targetUser = User.builder()
                .id(targetId)
                .email("target@example.test")
                .roles(Set.of(playerRole))
                .organisation(targetOrg)
                .build();

        when(organisationRepository.findByParentOrgId(callerOrgId)).thenReturn(Collections.emptyList());

        when(userRepository.findByEmail("caller@example.test")).thenReturn(Optional.of(callerUser));
        when(userRepository.findById(targetId)).thenReturn(Optional.of(targetUser));

        assertThatThrownBy(() -> userService.getUserByIdInScope(targetId))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("User not found");
    }

    @Test
    void getUserByIdInScope_targetWithNoOrganisation_readByNonSuperAdminNonSelf_throwsNotFound() {
        User callerUser = User.builder()
                .id(callerId)
                .email("caller@example.test")
                .roles(Set.of(orgAdminRole))
                .organisation(callerOrg)
                .build();

        User targetUser = User.builder()
                .id(targetId)
                .email("target@example.test")
                .roles(Set.of(playerRole))
                .organisation(null)
                .build();

        when(organisationRepository.findByParentOrgId(callerOrgId)).thenReturn(Collections.emptyList());

        when(userRepository.findByEmail("caller@example.test")).thenReturn(Optional.of(callerUser));
        when(userRepository.findById(targetId)).thenReturn(Optional.of(targetUser));

        assertThatThrownBy(() -> userService.getUserByIdInScope(targetId))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("User not found");
    }

    @Test
    void getUserRolesInScope_superAdmin_readsAnyoneRoles() {
        User superAdmin = User.builder()
                .id(callerId)
                .email("caller@example.test")
                .roles(Set.of(superAdminRole))
                .build();

        User targetUser = User.builder()
                .id(targetId)
                .email("target@example.test")
                .organisation(targetOrg)
                .roles(Set.of(playerRole))
                .build();

        when(userRepository.findByEmail("caller@example.test")).thenReturn(Optional.of(superAdmin));
        when(userRepository.findById(targetId)).thenReturn(Optional.of(targetUser));

        UserRolesResponse response = userService.getUserRolesInScope(targetId);

        assertThat(response).isNotNull();
        assertThat(response.getRoles()).contains("PLAYER");
    }

    @Test
    void getUserRolesInScope_selfAllowedWithNoOrganisation() {
        User selfUser = User.builder()
                .id(callerId)
                .email("caller@example.test")
                .roles(Set.of(playerRole))
                .organisation(null)
                .build();

        when(userRepository.findByEmail("caller@example.test")).thenReturn(Optional.of(selfUser));
        when(userRepository.findById(callerId)).thenReturn(Optional.of(selfUser));

        UserRolesResponse response = userService.getUserRolesInScope(callerId);

        assertThat(response).isNotNull();
        assertThat(response.getRoles()).contains("PLAYER");
    }

    @Test
    void getUserRolesInScope_sameHierarchyAllowed() {
        User callerUser = User.builder()
                .id(callerId)
                .email("caller@example.test")
                .roles(Set.of(orgAdminRole))
                .organisation(callerOrg)
                .build();

        User targetUser = User.builder()
                .id(targetId)
                .email("target@example.test")
                .roles(Set.of(playerRole))
                .organisation(targetOrg)
                .build();

        when(organisationRepository.findByParentOrgId(callerOrgId)).thenReturn(List.of(targetOrg));
        when(organisationRepository.findByParentOrgId(targetOrgId)).thenReturn(Collections.emptyList());

        when(userRepository.findByEmail("caller@example.test")).thenReturn(Optional.of(callerUser));
        when(userRepository.findById(targetId)).thenReturn(Optional.of(targetUser));

        UserRolesResponse response = userService.getUserRolesInScope(targetId);

        assertThat(response).isNotNull();
        assertThat(response.getRoles()).contains("PLAYER");
    }

    @Test
    void getUserRolesInScope_differentOrganisation_throwsNotFound() {
        User callerUser = User.builder()
                .id(callerId)
                .email("caller@example.test")
                .roles(Set.of(orgAdminRole))
                .organisation(callerOrg)
                .build();

        User targetUser = User.builder()
                .id(targetId)
                .email("target@example.test")
                .roles(Set.of(playerRole))
                .organisation(targetOrg)
                .build();

        when(organisationRepository.findByParentOrgId(callerOrgId)).thenReturn(Collections.emptyList());

        when(userRepository.findByEmail("caller@example.test")).thenReturn(Optional.of(callerUser));
        when(userRepository.findById(targetId)).thenReturn(Optional.of(targetUser));

        assertThatThrownBy(() -> userService.getUserRolesInScope(targetId))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("User not found");
    }

    @Test
    void getUserRolesInScope_targetWithNoOrganisation_readByNonSuperAdminNonSelf_throwsNotFound() {
        User callerUser = User.builder()
                .id(callerId)
                .email("caller@example.test")
                .roles(Set.of(orgAdminRole))
                .organisation(callerOrg)
                .build();

        User targetUser = User.builder()
                .id(targetId)
                .email("target@example.test")
                .roles(Set.of(playerRole))
                .organisation(null)
                .build();

        when(organisationRepository.findByParentOrgId(callerOrgId)).thenReturn(Collections.emptyList());

        when(userRepository.findByEmail("caller@example.test")).thenReturn(Optional.of(callerUser));
        when(userRepository.findById(targetId)).thenReturn(Optional.of(targetUser));

        assertThatThrownBy(() -> userService.getUserRolesInScope(targetId))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("User not found");
    }
}
