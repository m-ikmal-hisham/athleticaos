package com.athleticaos.backend.audit;

import com.athleticaos.backend.dtos.audit.AuditLogEntry;
import com.athleticaos.backend.entities.*;
import com.athleticaos.backend.services.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Helper component for creating audit log entries.
 * Provides convenience methods for common audit logging scenarios.
 */
@Component
@RequiredArgsConstructor
public class AuditLogger {

        private final AuditLogService auditLogService;

        // ==================== USER ACTIONS ====================

        public void logUserCreated(User user, HttpServletRequest request) {
                AuditLogEntry entry = AuditLogEntry.builder()
                                .actionType("USER_CREATED")
                                .entityType("USER")
                                .entityId(user.getId())
                                .entitySummary(String.format("User created: %s %s (%s)",
                                                user.getFirstName(), user.getLastName(), user.getEmail()))
                                .build();

                auditLogService.log(entry, getIpAddress(request), getUserAgent(request));
        }

        public void logUserUpdated(User user, HttpServletRequest request) {
                AuditLogEntry entry = AuditLogEntry.builder()
                                .actionType("USER_UPDATED")
                                .entityType("USER")
                                .entityId(user.getId())
                                .entitySummary(String.format("User updated: %s %s (%s)",
                                                user.getFirstName(), user.getLastName(), user.getEmail()))
                                .build();

                auditLogService.log(entry, getIpAddress(request), getUserAgent(request));
        }

        public void logUserInvited(User user, HttpServletRequest request) {
                AuditLogEntry entry = AuditLogEntry.builder()
                                .actionType("USER_INVITED")
                                .entityType("USER")
                                .entityId(user.getId())
                                .entitySummary(String.format("User invited: %s %s (%s) to %s",
                                                user.getFirstName(), user.getLastName(), user.getEmail(),
                                                user.getOrganisation() != null ? user.getOrganisation().getName()
                                                                : "No Organisation"))
                                .build();

                auditLogService.log(entry, getIpAddress(request), getUserAgent(request));
        }

        public void logUserStatusChanged(User user, boolean newStatus, HttpServletRequest request) {
                AuditLogEntry entry = AuditLogEntry.builder()
                                .actionType("USER_STATUS_CHANGED")
                                .entityType("USER")
                                .entityId(user.getId())
                                .entitySummary(String.format("User %s: %s %s (%s)",
                                                newStatus ? "activated" : "deactivated",
                                                user.getFirstName(), user.getLastName(), user.getEmail()))
                                .build();

                auditLogService.log(entry, getIpAddress(request), getUserAgent(request));
        }

        // ==================== TEAM ACTIONS ====================

        public void logTeamCreated(Team team, HttpServletRequest request) {
                AuditLogEntry entry = AuditLogEntry.builder()
                                .actionType("TEAM_CREATED")
                                .entityType("TEAM")
                                .entityId(team.getId())
                                .entitySummary(String.format("Team created: %s (%s %s)",
                                                team.getName(), team.getCategory(), team.getAgeGroup()))
                                .build();

                auditLogService.log(entry, getIpAddress(request), getUserAgent(request));
        }

        public void logTeamUpdated(Team team, HttpServletRequest request) {
                AuditLogEntry entry = AuditLogEntry.builder()
                                .actionType("TEAM_UPDATED")
                                .entityType("TEAM")
                                .entityId(team.getId())
                                .entitySummary(String.format("Team updated: %s", team.getName()))
                                .build();

                auditLogService.log(entry, getIpAddress(request), getUserAgent(request));
        }

        // ==================== TOURNAMENT ACTIONS ====================

        public void logTournamentCreated(Tournament tournament, HttpServletRequest request) {
                AuditLogEntry entry = AuditLogEntry.builder()
                                .actionType("TOURNAMENT_CREATED")
                                .entityType("TOURNAMENT")
                                .entityId(tournament.getId())
                                .entitySummary(String.format("Tournament created: %s", tournament.getName()))
                                .build();

                auditLogService.log(entry, getIpAddress(request), getUserAgent(request));
        }

        public void logTournamentUpdated(Tournament tournament, HttpServletRequest request) {
                AuditLogEntry entry = AuditLogEntry.builder()
                                .actionType("TOURNAMENT_UPDATED")
                                .entityType("TOURNAMENT")
                                .entityId(tournament.getId())
                                .entitySummary(String.format("Tournament updated: %s", tournament.getName()))
                                .build();

                auditLogService.log(entry, getIpAddress(request), getUserAgent(request));
        }

        // ==================== MATCH ACTIONS ====================

        public void logMatchCreated(Match match, HttpServletRequest request) {
                AuditLogEntry entry = AuditLogEntry.builder()
                                .actionType("MATCH_CREATED")
                                .entityType("MATCH")
                                .entityId(match.getId())
                                .entitySummary(String.format("Match created: %s vs %s on %s",
                                                match.getHomeTeam().getName(),
                                                match.getAwayTeam().getName(),
                                                match.getMatchDate()))
                                .build();

                auditLogService.log(entry, getIpAddress(request), getUserAgent(request));
        }

        public void logMatchUpdated(Match match, HttpServletRequest request) {
                AuditLogEntry entry = AuditLogEntry.builder()
                                .actionType("MATCH_UPDATED")
                                .entityType("MATCH")
                                .entityId(match.getId())
                                .entitySummary(String.format("Match updated: %s vs %s",
                                                match.getHomeTeam().getName(),
                                                match.getAwayTeam().getName()))
                                .build();

                auditLogService.log(entry, getIpAddress(request), getUserAgent(request));
        }

        public void logMatchScoreUpdated(Match match, HttpServletRequest request) {
                AuditLogEntry entry = AuditLogEntry.builder()
                                .actionType("MATCH_SCORE_UPDATED")
                                .entityType("MATCH")
                                .entityId(match.getId())
                                .entitySummary(String.format("Match score updated: %s %d - %d %s",
                                                match.getHomeTeam().getName(),
                                                match.getHomeScore() != null ? match.getHomeScore() : 0,
                                                match.getAwayScore() != null ? match.getAwayScore() : 0,
                                                match.getAwayTeam().getName()))
                                .build();

                auditLogService.log(entry, getIpAddress(request), getUserAgent(request));
        }

        public void logMatchStatusChanged(Match match, HttpServletRequest request) {
                AuditLogEntry entry = AuditLogEntry.builder()
                                .actionType("MATCH_STATUS_CHANGED")
                                .entityType("MATCH")
                                .entityId(match.getId())
                                .entitySummary(String.format("Match status changed to %s: %s vs %s",
                                                match.getStatus(),
                                                match.getHomeTeam().getName(),
                                                match.getAwayTeam().getName()))
                                .build();

                auditLogService.log(entry, getIpAddress(request), getUserAgent(request));
        }

        // ==================== MATCH EVENT ACTIONS ====================

        public void logMatchEventAdded(MatchEvent event, HttpServletRequest request) {
                AuditLogEntry entry = AuditLogEntry.builder()
                                .actionType("MATCH_EVENT_ADDED")
                                .entityType("MATCH_EVENT")
                                .entityId(event.getId())
                                .entitySummary(String.format("Match event added: %s at %d min",
                                                event.getEventType(), event.getMinute()))
                                .build();

                auditLogService.log(entry, getIpAddress(request), getUserAgent(request));
        }

        // ==================== SUSPENSION ACTIONS ====================

        public void logSuspensionCreated(PlayerSuspension suspension, HttpServletRequest request) {
                AuditLogEntry entry = AuditLogEntry.builder()
                                .actionType("SUSPENSION_CREATED")
                                .entityType("PLAYER_SUSPENSION")
                                .entityId(suspension.getId())
                                .entitySummary(String.format("Player suspended: %s %s - %s",
                                                suspension.getPlayer().getFirstName(),
                                                suspension.getPlayer().getLastName(),
                                                suspension.getReason()))
                                .build();

                auditLogService.log(entry, getIpAddress(request), getUserAgent(request));
        }

        // ==================== AUTHENTICATION ACTIONS ====================

        public void logLoginSuccess(User user, HttpServletRequest request) {
                AuditLogEntry entry = AuditLogEntry.builder()
                                .actionType("LOGIN_SUCCESS")
                                .entityType("USER")
                                .entityId(user.getId())
                                .entitySummary(String.format("User logged in: %s", user.getEmail()))
                                .build();

                auditLogService.log(entry, getIpAddress(request), getUserAgent(request));
        }

        // ==================== HELPER METHODS ====================

        private String getIpAddress(HttpServletRequest request) {
                if (request == null) {
                        return null;
                }

                String ipAddress = request.getHeader("X-Forwarded-For");
                if (ipAddress == null || ipAddress.isEmpty()) {
                        ipAddress = request.getRemoteAddr();
                }
                return ipAddress;
        }

        private String getUserAgent(HttpServletRequest request) {
                if (request == null) {
                        return null;
                }
                return request.getHeader("User-Agent");
        }
}
