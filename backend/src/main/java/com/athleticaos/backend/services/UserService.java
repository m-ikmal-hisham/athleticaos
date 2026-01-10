package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.user.InviteUserRequest;
import com.athleticaos.backend.dtos.user.InviteUserResponse;
import com.athleticaos.backend.dtos.user.UserCreateRequest;
import com.athleticaos.backend.dtos.user.UserResponse;
import com.athleticaos.backend.dtos.user.UserRolesResponse;
import com.athleticaos.backend.dtos.user.UserUpdateRequest;
import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.entities.Role;
import com.athleticaos.backend.repositories.RoleRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final OrganisationRepository organisationRepository;
    private final PasswordEncoder passwordEncoder;
    private final PlayerTeamService playerTeamService;
    private final AuditLogger auditLogger;

    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers(UUID organisationId) {
        User currentUser = getCurrentUser();
        java.util.Set<UUID> accessibleOrgIds = resolveAccessibleOrganisationIds(currentUser);
        java.util.Set<UUID> targetIds = new java.util.HashSet<>();

        if (organisationId != null) {
            // Filter mode
            targetIds = resolveOrganisationHierarchy(organisationId);
            if (accessibleOrgIds != null) {
                targetIds.retainAll(accessibleOrgIds);
            }
        } else {
            // Default mode
            if (accessibleOrgIds != null) {
                targetIds.addAll(accessibleOrgIds);
            } else {
                // Super Admin with no filter
                return userRepository.findAll().stream()
                        .map(this::mapToResponse)
                        .collect(Collectors.toList());
            }
        }

        if (targetIds.isEmpty() && organisationId != null) {
            return Collections.emptyList();
        } else if (targetIds.isEmpty() && accessibleOrgIds != null && !accessibleOrgIds.isEmpty()) {
            return Collections.emptyList();
        }

        List<User> users = userRepository.findByOrganisation_IdIn(targetIds);

        return users.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private java.util.Set<UUID> resolveOrganisationHierarchy(UUID rootId) {
        java.util.Set<UUID> hierarchy = new java.util.HashSet<>();
        java.util.Queue<UUID> queue = new java.util.LinkedList<>();

        queue.add(rootId);
        hierarchy.add(rootId);

        while (!queue.isEmpty()) {
            UUID currentId = queue.poll();
            List<com.athleticaos.backend.entities.Organisation> children = organisationRepository
                    .findByParentOrgId(currentId);
            for (com.athleticaos.backend.entities.Organisation child : children) {
                if (!hierarchy.contains(child.getId())) {
                    hierarchy.add(child.getId());
                    queue.add(child.getId());
                }
            }
        }
        return hierarchy;
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public UserResponse getUserById(UUID id) {
        return userRepository.findById(id)
                .map(this::mapToResponse)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
    }

    @Transactional
    @SuppressWarnings("null")
    public UserResponse updateUser(UUID id, UserUpdateRequest request, HttpServletRequest httpRequest) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        if (request.getFirstName() != null) {
            user.setFirstName(request.getFirstName());
        }
        if (request.getLastName() != null) {
            user.setLastName(request.getLastName());
        }
        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new IllegalArgumentException("Email already exists");
            }
            user.setEmail(request.getEmail());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        if (request.getIsActive() != null) {
            user.setActive(request.getIsActive());
        }

        // Update Address
        if (request.getAddressLine1() != null)
            user.setAddressLine1(request.getAddressLine1());
        if (request.getAddressLine2() != null)
            user.setAddressLine2(request.getAddressLine2());
        if (request.getCity() != null)
            user.setCity(request.getCity());
        if (request.getPostcode() != null)
            user.setPostcode(request.getPostcode());
        if (request.getState() != null)
            user.setState(request.getState());
        if (request.getCountry() != null)
            user.setCountry(request.getCountry());

        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl());
        }

        // Update Organisation
        if (request.getOrganisationId() != null) {
            com.athleticaos.backend.entities.Organisation organisation = organisationRepository
                    .findById(request.getOrganisationId())
                    .orElseThrow(() -> new EntityNotFoundException("Organisation not found"));
            user.setOrganisation(organisation);
        }

        // Update Roles if provided
        if (request.getRoles() != null && !request.getRoles().isEmpty()) {
            java.util.Set<Role> newRoles = request.getRoles().stream()
                    .map(roleName -> {
                        String name = roleName.startsWith("ROLE_") ? roleName : "ROLE_" + roleName;
                        return roleRepository.findByName(name)
                                .orElseThrow(() -> new EntityNotFoundException("Role not found: " + name));
                    })
                    .collect(Collectors.toSet());
            user.setRoles(newRoles);
        }

        User savedUser = userRepository.save(user);
        auditLogger.logUserUpdated(savedUser, httpRequest);
        return mapToResponse(savedUser);
    }

    @Transactional
    public UserResponse createUser(UserCreateRequest request, HttpServletRequest httpRequest) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }

        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder
                        .encode(request.getPassword() != null ? request.getPassword() : "DefaultPass123!"))
                .isActive(true)
                .build();

        String roleName = request.getRole() != null
                ? (request.getRole().startsWith("ROLE_") ? request.getRole() : "ROLE_" + request.getRole())
                : "ROLE_PLAYER";

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new EntityNotFoundException("Role not found: " + roleName));

        user.setRoles(Collections.singleton(role));

        User savedUser = userRepository.save(user);
        auditLogger.logUserCreated(savedUser, httpRequest);
        return mapToResponse(savedUser);
    }

    @Transactional
    @SuppressWarnings("null")
    public UserResponse updateUserStatus(UUID id, String status, HttpServletRequest httpRequest) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        boolean isActive = "ACTIVE".equalsIgnoreCase(status) || "Active".equalsIgnoreCase(status);
        user.setActive(isActive);

        User savedUser = userRepository.save(user);
        auditLogger.logUserStatusChanged(savedUser, isActive, httpRequest);
        return mapToResponse(savedUser);
    }

    @Transactional
    public InviteUserResponse inviteUser(InviteUserRequest request, HttpServletRequest httpRequest) {
        User currentUser = getCurrentUser();

        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            User existingUser = userRepository.findByEmail(request.getEmail())
                    .orElseThrow(() -> new EntityNotFoundException("User not found"));
            return InviteUserResponse.builder()
                    .userId(existingUser.getId())
                    .email(existingUser.getEmail())
                    .role(existingUser.getRoles().stream().findFirst().map(Role::getName).orElse("UNKNOWN"))
                    .organisationId(
                            existingUser.getOrganisation() != null ? existingUser.getOrganisation().getId() : null)
                    .inviteStatus("EXISTS")
                    .message("User with this email already exists. Consider reassigning their role.")
                    .build();
        }

        // Normalize role name to include ROLE_ prefix
        String roleName = request.getRole().startsWith("ROLE_") ? request.getRole() : "ROLE_" + request.getRole();

        // Validate role permissions
        validateInvitePermissions(currentUser, roleName, request.getOrganisationId());

        // Fetch organisation
        @SuppressWarnings("null")
        com.athleticaos.backend.entities.Organisation organisation = organisationRepository
                .findById(request.getOrganisationId())
                .orElseThrow(() -> new EntityNotFoundException("Organisation not found"));

        // Fetch role
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new EntityNotFoundException("Role not found: " + roleName));

        // Create user with default password
        User newUser = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode("DefaultPass123!"))
                .isActive(true)
                .organisation(organisation)
                .roles(Collections.singleton(role))
                .build();

        @SuppressWarnings("null")
        User savedUser = userRepository.save(newUser);
        auditLogger.logUserInvited(savedUser, httpRequest);

        return InviteUserResponse.builder()
                .userId(savedUser.getId())
                .email(savedUser.getEmail())
                .role(roleName)
                .organisationId(organisation.getId())
                .inviteStatus("PENDING")
                .message("User invited successfully. Default password: DefaultPass123!")
                .build();
    }

    private void validateInvitePermissions(User currentUser, String targetRole, UUID targetOrgId) {
        boolean isSuperAdmin = currentUser.getRoles().stream()
                .anyMatch(r -> r.getName().equals("ROLE_SUPER_ADMIN") || r.getName().equals("SUPER_ADMIN"));

        // SUPER_ADMIN can invite anyone to any organisation
        if (isSuperAdmin) {
            return;
        }

        boolean isOrgAdmin = currentUser.getRoles().stream()
                .anyMatch(r -> r.getName().equals("ROLE_ORG_ADMIN") || r.getName().equals("ORG_ADMIN"));

        boolean isClubAdmin = currentUser.getRoles().stream()
                .anyMatch(r -> r.getName().equals("ROLE_CLUB_ADMIN") || r.getName().equals("CLUB_ADMIN"));

        // ORG_ADMIN can invite CLUB_ADMIN, COACH, PLAYER within their org hierarchy
        if (isOrgAdmin) {
            if (!targetRole.equals("ROLE_CLUB_ADMIN") && !targetRole.equals("ROLE_COACH")
                    && !targetRole.equals("ROLE_PLAYER")) {
                throw new IllegalArgumentException("ORG_ADMIN can only invite CLUB_ADMIN, COACH, or PLAYER roles");
            }

            // Check if target org is within accessible hierarchy
            java.util.Set<UUID> accessibleOrgIds = resolveAccessibleOrganisationIds(currentUser);
            if (accessibleOrgIds == null || !accessibleOrgIds.contains(targetOrgId)) {
                throw new IllegalArgumentException("Cannot invite user to organisation outside your hierarchy");
            }
            return;
        }

        // CLUB_ADMIN can invite COACH, PLAYER for their club only
        if (isClubAdmin) {
            if (!targetRole.equals("ROLE_COACH") && !targetRole.equals("ROLE_PLAYER")) {
                throw new IllegalArgumentException("CLUB_ADMIN can only invite COACH or PLAYER roles");
            }

            // Check if target org is their club
            if (currentUser.getOrganisation() == null || !currentUser.getOrganisation().getId().equals(targetOrgId)) {
                throw new IllegalArgumentException("CLUB_ADMIN can only invite users to their own club");
            }
            return;
        }

        throw new IllegalArgumentException("Insufficient permissions to invite users");
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public UserRolesResponse getUserRoles(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        List<String> roles = user.getRoles().stream()
                .map(role -> role.getName().replace("ROLE_", ""))
                .collect(Collectors.toList());

        String primaryRole = roles.isEmpty() ? "USER" : roles.get(0);

        return UserRolesResponse.builder()
                .roles(roles)
                .primaryRole(primaryRole)
                .build();
    }

    private UserResponse mapToResponse(User user) {
        // Get team IDs for this user
        List<UUID> teamIds = playerTeamService.getPlayerTeamIds(user.getId());

        // Get team names (simplified - in production you might want to fetch team
        // details)
        // Since we removed the direct relationship, we need to fetch this differently
        // or return empty for now
        // The PlayerTeamService handles the relationship between players and teams
        List<String> teamNames = Collections.emptyList(); // Fetch via PlayerTeamService if needed for UserResponse
                                                          // UserResponse

        return UserResponse.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .isActive(user.isActive())
                .status(user.isActive() ? "Active" : "Inactive")
                .roles(user.getRoles().stream().map(r -> r.getName()).collect(Collectors.toSet()))
                .organisationId(user.getOrganisation() != null ? user.getOrganisation().getId() : null)
                .organisationName(user.getOrganisation() != null ? user.getOrganisation().getName() : null)
                .teamIds(teamIds)
                .teamNames(teamNames)
                .addressLine1(user.getAddressLine1())
                .addressLine2(user.getAddressLine2())
                .city(user.getCity())
                .postcode(user.getPostcode())
                .state(user.getState())
                .country(user.getCountry())
                .address(user.getAddress())
                .avatarUrl(user.getAvatarUrl())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }

    public java.util.Set<UUID> resolveAccessibleOrganisationIds(User currentUser) {
        boolean isSuperAdmin = currentUser.getRoles().stream()
                .anyMatch(r -> r.getName().equals("ROLE_SUPER_ADMIN") || r.getName().equals("SUPER_ADMIN"));

        if (isSuperAdmin) {
            return null;
        }

        if (currentUser.getOrganisation() == null) {
            return Collections.emptySet();
        }

        java.util.Set<UUID> accessibleIds = new java.util.HashSet<>();
        java.util.Queue<UUID> queue = new java.util.LinkedList<>();

        UUID rootId = currentUser.getOrganisation().getId();
        queue.add(rootId);
        accessibleIds.add(rootId);

        while (!queue.isEmpty()) {
            UUID currentId = queue.poll();
            java.util.List<com.athleticaos.backend.entities.Organisation> children = organisationRepository
                    .findByParentOrgId(currentId);
            for (com.athleticaos.backend.entities.Organisation child : children) {
                if (!accessibleIds.contains(child.getId())) {
                    accessibleIds.add(child.getId());
                    queue.add(child.getId());
                }
            }
        }
        return accessibleIds;
    }

    public java.util.Set<UUID> getAccessibleOrgIdsForCurrentUser() {
        return resolveAccessibleOrganisationIds(getCurrentUser());
    }

    public User getCurrentUser() {
        String email = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication()
                .getName();
        return userRepository.findByEmail(email).orElseThrow(() -> new EntityNotFoundException("User not found"));
    }
}
