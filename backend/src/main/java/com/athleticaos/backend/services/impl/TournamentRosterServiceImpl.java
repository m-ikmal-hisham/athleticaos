package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.roster.*;
import com.athleticaos.backend.entities.*;
import com.athleticaos.backend.repositories.*;
import com.athleticaos.backend.services.EligibilityService;
import com.athleticaos.backend.services.PlayerSuspensionService;
import com.athleticaos.backend.services.TournamentRosterService;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TournamentRosterServiceImpl implements TournamentRosterService {

        private final TournamentPlayerRepository tournamentPlayerRepository;
        private final TournamentRepository tournamentRepository;
        private final TeamRepository teamRepository;
        private final PlayerRepository playerRepository;
        private final MatchRepository matchRepository;
        private final PlayerTeamRepository playerTeamRepository;
        private final EligibilityService eligibilityService;
        private final PlayerSuspensionService suspensionService;

        @Override
        @Transactional

        public List<TournamentPlayerDTO> addPlayersToRoster(@NonNull UUID tournamentId, @NonNull UUID teamId,
                        @NonNull List<UUID> playerIds) {
                log.info("Adding {} players to roster for tournament {} team {}", playerIds.size(), tournamentId,
                                teamId);

                Tournament tournament = tournamentRepository.findById(tournamentId)
                                .orElseThrow(() -> new IllegalArgumentException("Tournament not found"));

                Team team = teamRepository.findById(teamId)
                                .orElseThrow(() -> new IllegalArgumentException("Team not found"));

                List<TournamentPlayerDTO> addedPlayers = new ArrayList<>();

                for (UUID playerId : playerIds) {
                        Player player = playerRepository.findById(java.util.Objects.requireNonNull(playerId))
                                        .orElseThrow(() -> new IllegalArgumentException(
                                                        "Player not found: " + playerId));

                        // Check if already in roster
                        var existing = tournamentPlayerRepository.findByTournamentIdAndTeamIdAndPlayerId(
                                        tournamentId, teamId, playerId);

                        if (existing.isPresent()) {
                                TournamentPlayer tp = existing.get();
                                if (!tp.isActive()) {
                                        // Reactivate
                                        tp.setActive(true);
                                        tournamentPlayerRepository.save(tp);
                                        log.info("Reactivated player {} in roster", playerId);
                                } else {
                                        log.info("Player {} already in active roster", playerId);
                                }
                                addedPlayers.add(toDTO(tp));
                                continue;
                        }

                        // Check eligibility
                        EligibilityResult eligibility = eligibilityService.checkPlayerEligibility(tournament, player);

                        // Create roster entry
                        TournamentPlayer tournamentPlayer = TournamentPlayer.builder()
                                        .tournament(tournament)
                                        .team(team)
                                        .player(player)
                                        .isActive(true)
                                        .isEligible(eligibility.isEligible())
                                        .eligibilityNote(eligibility.getReason())
                                        .build();

                        tournamentPlayerRepository.save(java.util.Objects.requireNonNull(tournamentPlayer));
                        addedPlayers.add(toDTO(tournamentPlayer));
                        log.info("Added player {} to roster with eligibility: {}", playerId, eligibility.isEligible());
                }

                return addedPlayers;
        }

        @Override
        @Transactional

        public void removePlayerFromRoster(@NonNull UUID tournamentPlayerId) {
                log.info("Removing player from roster: {}", tournamentPlayerId);

                TournamentPlayer tournamentPlayer = tournamentPlayerRepository.findById(tournamentPlayerId)
                                .orElseThrow(() -> new IllegalArgumentException("Tournament player not found"));

                tournamentPlayer.setActive(false);
                tournamentPlayerRepository.save(tournamentPlayer);
                log.info("Successfully removed player from roster");
        }

        @Override
        @Transactional(readOnly = true)
        public List<TournamentPlayerDTO> getRoster(UUID tournamentId, UUID teamId) {
                log.info("Getting roster for tournament {} team {}", tournamentId, teamId);

                List<TournamentPlayer> roster = tournamentPlayerRepository.findByTournamentIdAndTeamIdAndIsActiveTrue(
                                tournamentId, teamId);

                return roster.stream()
                                .map(this::toDTO)
                                .collect(Collectors.toList());
        }

        @Override
        @Transactional(readOnly = true)

        public LineupHintsDTO getLineupHints(@NonNull UUID matchId) {
                log.info("Getting lineup hints for match {}", matchId);

                Match match = matchRepository.findById(matchId)
                                .orElseThrow(() -> new IllegalArgumentException("Match not found"));

                Tournament tournament = match.getTournament();
                Team homeTeam = match.getHomeTeam();
                Team awayTeam = match.getAwayTeam();

                // Get rosters for both teams (Home)
                List<TournamentPlayer> homeRoster = tournamentPlayerRepository
                                .findByTournamentIdAndTeamIdAndIsActiveTrue(
                                                tournament.getId(), homeTeam.getId());

                List<LineupPlayerDTO> homePlayers = homeRoster.stream()
                                .filter(com.athleticaos.backend.utils.StreamUtils
                                                .distinctByKey(tp -> tp.getPlayer().getId()))
                                .map(tp -> toLineupPlayerDTO(tp, tournament.getId()))
                                .collect(Collectors.toList());

                // Get rosters for both teams (Away)
                List<TournamentPlayer> awayRoster = tournamentPlayerRepository
                                .findByTournamentIdAndTeamIdAndIsActiveTrue(
                                                tournament.getId(), awayTeam.getId());

                List<LineupPlayerDTO> awayPlayers = awayRoster.stream()
                                .filter(com.athleticaos.backend.utils.StreamUtils
                                                .distinctByKey(tp -> tp.getPlayer().getId()))
                                .map(tp -> toLineupPlayerDTO(tp, tournament.getId()))
                                .collect(Collectors.toList());

                return LineupHintsDTO.builder()
                                .homeTeamPlayers(homePlayers)
                                .awayTeamPlayers(awayPlayers)
                                .build();
        }

        private TournamentPlayerDTO toDTO(TournamentPlayer tp) {
                Player player = tp.getPlayer();
                Person person = player.getPerson();

                // Get jersey number with priority: tournament > team
                Integer displayNumber = tp.getTournamentJerseyNumber();
                if (displayNumber == null) {
                        var playerTeam = playerTeamRepository.findByPlayerIdAndTeamId(player.getId(),
                                        tp.getTeam().getId());
                        if (playerTeam.isPresent()) {
                                displayNumber = playerTeam.get().getJerseyNumber();
                        }
                }

                // Check for active suspensions
                boolean hasSuspension = suspensionService.hasActiveSuspension(tp.getTournament().getId(),
                                player.getId());
                String suspensionReason = null;
                Integer suspensionMatches = null;

                if (hasSuspension) {
                        List<PlayerSuspensionDTO> suspensions = suspensionService.getPlayerActiveSuspensions(
                                        tp.getTournament().getId(), player.getId());
                        if (!suspensions.isEmpty()) {
                                PlayerSuspensionDTO suspension = suspensions.get(0);
                                suspensionReason = suspension.getReason();
                                suspensionMatches = suspension.getMatchesRemaining();
                        }
                }

                return TournamentPlayerDTO.builder()
                                .id(tp.getId())
                                .playerId(player.getId())
                                .playerName(person.getFirstName() + " " + person.getLastName())
                                .playerNumber(displayNumber != null ? displayNumber.toString() : null)
                                .organisationName(tp.getTeam().getOrganisation().getName())
                                .isEligible(tp.isEligible())
                                .eligibilityNote(tp.getEligibilityNote())
                                .hasActiveSuspension(hasSuspension)
                                .suspensionReason(suspensionReason)
                                .suspensionMatchesRemaining(suspensionMatches)
                                .build();
        }

        private LineupPlayerDTO toLineupPlayerDTO(TournamentPlayer tp, UUID tournamentId) {
                Player player = tp.getPlayer();
                Person person = player.getPerson();

                // Get jersey number and position
                // Priority: Tournament Jersey > Team Jersey
                Integer jerseyNumber = tp.getTournamentJerseyNumber();
                String position = null;

                var playerTeam = playerTeamRepository.findByPlayerIdAndTeamId(player.getId(), tp.getTeam().getId());
                if (playerTeam.isPresent()) {
                        if (jerseyNumber == null) {
                                jerseyNumber = playerTeam.get().getJerseyNumber();
                        }
                        position = playerTeam.get().getPosition();
                }

                // Check for active suspensions
                boolean hasSuspension = suspensionService.hasActiveSuspension(tournamentId, player.getId());
                String suspensionReason = null;
                Integer suspensionMatches = null;

                if (hasSuspension) {
                        List<PlayerSuspensionDTO> suspensions = suspensionService.getPlayerActiveSuspensions(
                                        tournamentId,
                                        player.getId());
                        if (!suspensions.isEmpty()) {
                                PlayerSuspensionDTO suspension = suspensions.get(0);
                                suspensionReason = suspension.getReason();
                                suspensionMatches = suspension.getMatchesRemaining();
                        }
                }

                return LineupPlayerDTO.builder()
                                .playerId(player.getId())
                                .playerName(person.getFirstName() + " " + person.getLastName())
                                .playerNumber(jerseyNumber != null ? jerseyNumber.toString() : null)
                                .position(position)
                                .isEligible(tp.isEligible())
                                .eligibilityNote(tp.getEligibilityNote())
                                .isSuspended(hasSuspension)
                                .suspensionReason(suspensionReason)
                                .suspensionMatchesRemaining(suspensionMatches)
                                .build();
        }

        @Override
        @Transactional

        public TournamentPlayerDTO updateTournamentJerseyNumber(
                        @NonNull UUID tournamentId, @NonNull UUID teamId, @NonNull UUID playerId,
                        Integer jerseyNumber) {

                log.info("Updating tournament jersey number for player {} in tournament {} team {} to {}",
                                playerId, tournamentId, teamId, jerseyNumber);

                TournamentPlayer tp = tournamentPlayerRepository
                                .findByTournamentIdAndTeamIdAndPlayerId(tournamentId, teamId, playerId)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "Player not found in tournament roster"));

                tp.setTournamentJerseyNumber(jerseyNumber);
                tournamentPlayerRepository.save(tp);

                log.info("Successfully updated tournament jersey number");
                return toDTO(tp);
        }
}
