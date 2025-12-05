package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.audit.AuditLogResponse;
import com.athleticaos.backend.dtos.user.UserResponse;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.services.AuditLogService;
import com.athleticaos.backend.services.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Set;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.athleticaos.backend.security.SecurityConfig;
import org.springframework.context.annotation.Import;

import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

@WebMvcTest(AuditController.class)
@Import(SecurityConfig.class)
@EnableMethodSecurity
public class AuditControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuditLogService auditLogService;

    @MockBean
    private UserService userService;

    @MockBean
    private com.athleticaos.backend.security.JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private org.springframework.security.core.userdetails.UserDetailsService userDetailsService;

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    void getRecentGlobal_SuperAdmin_ShouldSucceed() throws Exception {
        when(auditLogService.getRecentGlobal(any(Pageable.class)))
                .thenReturn(Page.empty());

        mockMvc.perform(get("/api/v1/audit/recent/global"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ORG_ADMIN")
    void getRecentGlobal_OrgAdmin_ShouldFail() throws Exception {
        mockMvc.perform(get("/api/v1/audit/recent/global"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ORG_ADMIN")
    void getRecentForOrg_AuthorizedOrgAdmin_ShouldSucceed() throws Exception {
        UUID orgId = UUID.randomUUID();
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(Set.of(orgId));
        when(auditLogService.getRecentForOrg(eq(orgId), any(Pageable.class)))
                .thenReturn(Page.empty());

        mockMvc.perform(get("/api/v1/audit/recent/org/" + orgId))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ORG_ADMIN")
    void getRecentForOrg_UnauthorizedOrgAdmin_ShouldFail() throws Exception {
        UUID orgId = UUID.randomUUID();
        UUID otherOrgId = UUID.randomUUID();
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(Set.of(otherOrgId));

        mockMvc.perform(get("/api/v1/audit/recent/org/" + orgId))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    void getRecentForOrg_SuperAdmin_ShouldSucceed() throws Exception {
        UUID orgId = UUID.randomUUID();
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(null); // Super admin returns null or all
        when(auditLogService.getRecentForOrg(eq(orgId), any(Pageable.class)))
                .thenReturn(Page.empty());

        mockMvc.perform(get("/api/v1/audit/recent/org/" + orgId))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "user")
    void getRecentForUser_OwnLogs_ShouldSucceed() throws Exception {
        UUID userId = UUID.randomUUID();
        User currentUser = new User();
        currentUser.setId(userId);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(auditLogService.getRecentForUser(eq(userId), any(Pageable.class)))
                .thenReturn(Page.empty());

        mockMvc.perform(get("/api/v1/audit/recent/user/" + userId))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "admin", roles = "ORG_ADMIN")
    void getRecentForUser_OtherUserInAccessibleOrg_ShouldSucceed() throws Exception {
        UUID currentUserId = UUID.randomUUID();
        UUID targetUserId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();

        User currentUser = new User();
        currentUser.setId(currentUserId);

        // Use UserResponse for the target user as returned by getUserById
        UserResponse targetUserResponse = UserResponse.builder()
                .id(targetUserId)
                .organisationId(orgId)
                .build();

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(userService.getUserById(targetUserId)).thenReturn(targetUserResponse);
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(Set.of(orgId));
        when(auditLogService.getRecentForUser(eq(targetUserId), any(Pageable.class)))
                .thenReturn(Page.empty());

        mockMvc.perform(get("/api/v1/audit/recent/user/" + targetUserId))
                .andExpect(status().isOk());
    }
}
