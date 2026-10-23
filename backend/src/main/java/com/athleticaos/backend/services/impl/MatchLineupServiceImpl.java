package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.roster.MatchLineupEntryDTO;
import com.athleticaos.backend.dtos.roster.MatchLineupUpdateRequest;
import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.MatchLineup;
import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.repositories.MatchLineupRepository;
import com.athleticaos.backend.repositories.MatchRepository;
import com.athleticaos.backend.repositories.PlayerRepository;
import com.athleticaos.backend.repositories.TeamRepository;
import com.athleticaos.backend.repositories.TournamentPlayerRepository;
import com.athleticaos.backend.services.MatchLineupService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MatchLineupServiceImpl implements MatchLineupService {

        private final MatchLineupRepository matchLineupRepository;
        private final MatchRepository matchRepository;
        private final TeamRepository teamRepository;
        private final PlayerRepository playerRepository;
        private final TournamentPlayerRepository tournamentPlayerRepository;
        private final com.athleticaos.backend.services.AccessScopeService accessScopeService;

        @Override
        @Transactional(readOnly = true)
        public List<MatchLineupEntryDTO> getLineup(UUID matchId, UUID teamId) {
                return matchLineupRepository.findByMatchIdAndTeamId(matchId, teamId).stream()
                                .map(this::mapToDTO)
                                .collect(Collectors.toList());
        }

        @Override
        @Transactional
        public List<MatchLineupEntryDTO> updateLineup(UUID matchId, MatchLineupUpdateRequest request) {
                UUID teamId = java.util.Objects.requireNonNull(request.getTeamId(), "Team ID must not be null");
                Match match = matchRepository
                                .findById(java.util.Objects.requireNonNull(matchId, "Match ID must not be null"))
                                .orElseThrow(() -> new EntityNotFoundException("Match not found"));

                Team team = teamRepository
                                .findById(java.util.Objects.requireNonNull(teamId, "Team ID must not be null"))
                                .orElseThrow(() -> new EntityNotFoundException("Team not found"));

                if (!isTeamInMatch(match, teamId)) {
                        throw new IllegalArgumentException("Team is not part of this match");
                }

                boolean canWriteMatch = accessScopeService.canWriteMatch(match);
                boolean canManageTeam = accessScopeService.isTeamInScope(team);

                if (!canWriteMatch && !canManageTeam) {
                        UUID currentUserId = accessScopeService.getCurrentUserId();
                        log.warn("Access denied for lineup update outside accessible scope: userId={}, matchId={}, teamId={}",
                                        currentUserId, matchId, teamId);
                        throw new EntityNotFoundException("Match not found");
                }

                // If access comes via team scope only, enforce that players must be on the team's tournament roster (C6)
                if (!canWriteMatch && canManageTeam && request.getEntries() != null && !request.getEntries().isEmpty()
                                && match.getTournament() != null) {
                        List<com.athleticaos.backend.entities.TournamentPlayer> activeRoster = tournamentPlayerRepository
                                        .findByTournamentIdAndTeamIdAndIsActiveTrue(match.getTournament().getId(), teamId);
                        java.util.Set<UUID> activePlayerIds = activeRoster.stream()
                                        .map(tp -> tp.getPlayer().getId())
                                        .collect(Collectors.toSet());
                        for (MatchLineupEntryDTO entry : request.getEntries()) {
                                if (entry.getPlayerId() != null && !activePlayerIds.contains(entry.getPlayerId())) {
                                        throw new IllegalArgumentException("Player is not on the tournament roster for this team");
                                }
                        }
                }

                // Cannot update lineup if match is completed (Locked) - Requirement says
                // "Editable only before match starts"
                // But some admins might need to correct it later. Let's strictly enforce per
                // requirement for now.
                // Actually, requirement says "Lineups will be editable ONLY before match status
                // = STARTED".
                if (match.getStatus() == com.athleticaos.backend.enums.MatchStatus.LIVE ||
                                match.getStatus() == com.athleticaos.backend.enums.MatchStatus.COMPLETED) {
                        if (match.getStatus() == com.athleticaos.backend.enums.MatchStatus.COMPLETED) {
                                throw new IllegalStateException("Lineups cannot be modified after match is completed.");
                        }
                }

                // Validate Counts
                validateLineupCounts(match, team, request.getEntries());

                // Clear existing lineup
                matchLineupRepository.deleteByMatchIdAndTeamId(matchId, teamId);
                matchLineupRepository.flush(); // Ensure deletion is committed before insertion

                if (request.getEntries() == null || request.getEntries().isEmpty()) {
                        return Collections.emptyList();
                }

                // Create new entries
                List<MatchLineup> newLineups = request.getEntries().stream()
                                .map(entry -> {
                                        Player player = playerRepository
                                                        .findById(java.util.Objects.requireNonNull(entry.getPlayerId(),
                                                                        "Player ID must not be null"))
                                                        .orElseThrow(() -> new EntityNotFoundException(
                                                                        "Player not found: " + entry.getPlayerId()));

                                        // Determine role if not set or fallback from isStarter
                                        com.athleticaos.backend.enums.LineupRole role = entry.getRole();
                                        if (role == null) {
                                                role = entry.isStarter()
                                                                ? com.athleticaos.backend.enums.LineupRole.STARTER
                                                                : com.athleticaos.backend.enums.LineupRole.BENCH;
                                        }

                                        return MatchLineup.builder()
                                                        .match(match)
                                                        .team(team)
                                                        .player(player)
                                                        .jerseyNumber(entry.getJerseyNumber())
                                                        .isCaptain(entry.isCaptain())
                                                        .role(role)
                                                        .orderIndex(entry.getOrderIndex())
                                                        .isStarter(role == com.athleticaos.backend.enums.LineupRole.STARTER)
                                                        .positionDisplay(entry.getPositionDisplay())
                                                        .build();
                                })
                                .collect(Collectors.toList());

                List<MatchLineup> saved = matchLineupRepository.saveAll(java.util.Objects.requireNonNull(newLineups));

                return saved.stream()
                                .map(this::mapToDTO)
                                .collect(Collectors.toList());
        }

        private void validateLineupCounts(Match match, Team currentTeam, List<MatchLineupEntryDTO> entries) {
                if (entries == null || entries.isEmpty())
                        return;

                long starterCount = entries.stream()
                                .filter(e -> (e.getRole() == com.athleticaos.backend.enums.LineupRole.STARTER)
                                                || (e.getRole() == null && e.isStarter()))
                                .count();

                long benchCount = entries.stream()
                                .filter(e -> (e.getRole() == com.athleticaos.backend.enums.LineupRole.BENCH)
                                                || (e.getRole() == null && !e.isStarter()))
                                .count();

                // Get limits from shared helper
                com.athleticaos.backend.utils.LineupConfigHelper.LineupLimits limits =
                                com.athleticaos.backend.utils.LineupConfigHelper.resolveLimits(match);
                int maxStarters = limits.startersCount();
                int maxBench = limits.maxBenchCount();

                if (starterCount > maxStarters) {
                        throw new IllegalArgumentException(
                                        "Too many starters: " + starterCount + ". Maximum allowed is " + maxStarters);
                }

                if (benchCount > maxBench) {
                        throw new IllegalArgumentException(
                                        "Too many bench players: " + benchCount + ". Maximum allowed is " + maxBench);
                }

                // Check self-duplicates within the request
                long distinctPlayers = entries.stream().map(e -> e.getPlayerId()).distinct().count();
                if (distinctPlayers != entries.size()) {
                        throw new IllegalArgumentException("Duplicate players found in the submitted lineup.");
                }

                // Check cross-team duplicates (Player playing for the *other* team in the same
                // match)
                List<UUID> playerIds = entries.stream()
                                .map(e -> e.getPlayerId())
                                .collect(Collectors.toList());

                List<MatchLineup> existingEntries = matchLineupRepository.findByMatchIdAndPlayerIdIn(match.getId(),
                                playerIds);

                for (MatchLineup existing : existingEntries) {
                        // If the player is in the lineup for a DIFFERENT team, it's a conflict.
                        // We ignore if it's the SAME team because we are about to delete and replace
                        // those anyway (or update them).
                        // Actually, since we do deleteByMatchIdAndTeamId *after* this check, existing
                        // entries for CURRENT team are still there.
                        // So checking !existing.getTeam().getId().equals(currentTeam.getId()) is
                        // exactly right.
                        if (!existing.getTeam().getId().equals(currentTeam.getId())) {
                                throw new IllegalArgumentException("Player " +
                                                (existing.getPlayer().getPerson() != null
                                                                ? existing.getPlayer().getPerson().getFirstName() + " "
                                                                                + existing.getPlayer().getPerson()
                                                                                                .getLastName()
                                                                : "Unknown")
                                                +
                                                " is already in the lineup for " + existing.getTeam().getName());
                        }
                }
        }

        private boolean isTeamInMatch(Match match, UUID teamId) {
                boolean isHome = match.getHomeTeam() != null && match.getHomeTeam().getId().equals(teamId);
                boolean isAway = match.getAwayTeam() != null && match.getAwayTeam().getId().equals(teamId);
                return isHome || isAway;
        }

        private MatchLineupEntryDTO mapToDTO(MatchLineup entity) {
                return MatchLineupEntryDTO.builder()
                                .playerId(entity.getPlayer().getId())
                                .playerName(entity.getPlayer().getPerson() != null
                                                ? entity.getPlayer().getPerson().getFirstName() + " "
                                                                + entity.getPlayer().getPerson().getLastName()
                                                : "Unknown Player")
                                .jerseyNumber(entity.getJerseyNumber())
                                .isCaptain(entity.isCaptain())
                                .role(entity.getRole())
                                .orderIndex(entity.getOrderIndex())
                                .isStarter(entity.isStarter())
                                .positionDisplay(entity.getPositionDisplay())
                                .build();
        }
}
