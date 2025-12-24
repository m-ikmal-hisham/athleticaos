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
                String summary;
                if (event.getPlayer() != null) {
                        summary = String.format("Match event added: %s by %s %s (%s) at %d min",
                                        event.getEventType(),
                                        event.getPlayer().getPerson().getFirstName(),
                                        event.getPlayer().getPerson().getLastName(),
                                        event.getTeam().getName(),
                                        event.getMinute());
                } else {
                        summary = String.format("Match event added: %s for %s at %d min",
                                        event.getEventType(),
                                        event.getTeam().getName(),
                                        event.getMinute());
                }

                AuditLogEntry entry = AuditLogEntry.builder()
                                .actionType("MATCH_EVENT_ADDED")
                                .entityType("MATCH_EVENT")
                                .entityId(event.getId())
                                .entitySummary(summary)
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
                                                suspension.getPlayer().getPerson().getFirstName(),
                                                suspension.getPlayer().getPerson().getLastName(),
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

        // ==================== ORGANISATION ACTIONS ====================

        public void logOrganisationCreated(Organisation organisation, HttpServletRequest request) {
                AuditLogEntry entry = AuditLogEntry.builder()
                                .actionType("ORGANISATION_CREATED")
                                .entityType("ORGANISATION")
                                .entityId(organisation.getId())
                                .entitySummary(String.format("Organisation created: %s (%s)",
                                                organisation.getName(), organisation.getOrgLevel()))
                                .build();

                auditLogService.log(entry, getIpAddress(request), getUserAgent(request));
        }

        public void logOrganisationUpdated(Organisation organisation, HttpServletRequest request) {
                AuditLogEntry entry = AuditLogEntry.builder()
                                .actionType("ORGANISATION_UPDATED")
                                .entityType("ORGANISATION")
                                .entityId(organisation.getId())
                                .entitySummary(String.format("Organisation updated: %s", organisation.getName()))
                                .build();

                auditLogService.log(entry, getIpAddress(request), getUserAgent(request));
        }

        // ==================== PLAYER ACTIONS ====================

        public void logPlayerCreated(Player player, HttpServletRequest request) {
                AuditLogEntry entry = AuditLogEntry.builder()
                                .actionType("PLAYER_CREATED")
                                .entityType("PLAYER")
                                .entityId(player.getId())
                                .entitySummary(String.format("Player created: %s %s",
                                                player.getPerson().getFirstName(), player.getPerson().getLastName()))
                                .build();

                auditLogService.log(entry, getIpAddress(request), getUserAgent(request));
        }

        public void logPlayerUpdated(Player player, HttpServletRequest request) {
                AuditLogEntry entry = AuditLogEntry.builder()
                                .actionType("PLAYER_UPDATED")
                                .entityType("PLAYER")
                                .entityId(player.getId())
                                .entitySummary(String.format("Player updated: %s %s",
                                                player.getPerson().getFirstName(), player.getPerson().getLastName()))
                                .build();

                auditLogService.log(entry, getIpAddress(request), getUserAgent(request));
        }

        public void logPlayerDeleted(Player player, HttpServletRequest request) {
                AuditLogEntry entry = AuditLogEntry.builder()
                                .actionType("PLAYER_DELETED")
                                .entityType("PLAYER")
                                .entityId(player.getId())
                                .entitySummary(String.format("Player deleted: %s %s",
                                                player.getPerson().getFirstName(), player.getPerson().getLastName()))
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
