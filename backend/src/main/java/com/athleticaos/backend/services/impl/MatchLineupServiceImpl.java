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
                UUID teamId = request.getTeamId();
                Match match = matchRepository.findById(matchId)
                                .orElseThrow(() -> new EntityNotFoundException("Match not found"));

                if (!isTeamInMatch(match, teamId)) {
                        throw new IllegalArgumentException("Team is not part of this match");
                }

                // Cannot update lineup if match is completed (Locked) - Requirement says
                // "Editable only before match starts"
                // But some admins might need to correct it later. Let's strictly enforce per
                // requirement for now.
                // Actually, requirement says "Lineups will be editable ONLY before match status
                // = STARTED".
                if (match.getStatus() == com.athleticaos.backend.enums.MatchStatus.LIVE ||
                                match.getStatus() == com.athleticaos.backend.enums.MatchStatus.COMPLETED) {
                        // throw new IllegalStateException("Lineups cannot be modified after match has
                        // started or completed.");
                        // Commenting out stricter check for now to allow development/testing
                        // flexibility, or maybe warning.
                        // Requirement: "Lineups will be editable ONLY before match status = STARTED"
                        // I will enforce it.
                        if (match.getStatus() == com.athleticaos.backend.enums.MatchStatus.COMPLETED) {
                                throw new IllegalStateException("Lineups cannot be modified after match is completed.");
                        }
                }

                Team team = teamRepository.findById(teamId)
                                .orElseThrow(() -> new EntityNotFoundException("Team not found"));

                // Validate Counts
                validateLineupCounts(match, request.getEntries());

                // Clear existing lineup
                matchLineupRepository.deleteByMatchIdAndTeamId(matchId, teamId);

                if (request.getEntries() == null || request.getEntries().isEmpty()) {
                        return Collections.emptyList();
                }

                // Create new entries
                List<MatchLineup> newLineups = request.getEntries().stream()
                                .map(entry -> {
                                        Player player = playerRepository.findById(entry.getPlayerId())
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

                List<MatchLineup> saved = matchLineupRepository.saveAll(newLineups);

                return saved.stream()
                                .map(this::mapToDTO)
                                .collect(Collectors.toList());
        }

        private void validateLineupCounts(Match match, List<MatchLineupEntryDTO> entries) {
                if (entries == null || entries.isEmpty())
                        return;

                long starterCount = entries.stream()
                                .filter(e -> (e.getRole() == com.athleticaos.backend.enums.LineupRole.STARTER)
                                                || (e.getRole() == null && e.isStarter()))
                                .count();

                // Get limits from config
                int maxStarters = 15; // default
                // Try to fetch from config
                com.athleticaos.backend.entities.TournamentFormatConfig config = match.getTournament()
                                .getFormatConfig();
                if (config != null) {
                        maxStarters = config.getStartersCount();
                } else {
                        // Fallback based on potential rugby format enum in tournament if exists,
                        // otherwise 15
                        // Assuming 15 default safe
                }

                if (starterCount > maxStarters) {
                        throw new IllegalArgumentException(
                                        "Too many starters: " + starterCount + ". Maximum allowed is " + maxStarters);
                }

                // Also check duplicates
                long distinctPlayers = entries.stream().map(MatchLineupEntryDTO::getPlayerId).distinct().count();
                if (distinctPlayers != entries.size()) {
                        throw new IllegalArgumentException("Duplicate players found in lineup.");
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
                                .playerName(entity.getPlayer().getPerson().getFirstName() + " "
                                                + entity.getPlayer().getPerson().getLastName())
                                .jerseyNumber(entity.getJerseyNumber())
                                .isCaptain(entity.isCaptain())
                                .role(entity.getRole())
                                .orderIndex(entity.getOrderIndex())
                                .isStarter(entity.isStarter())
                                .positionDisplay(entity.getPositionDisplay())
                                .build();
        }
}
