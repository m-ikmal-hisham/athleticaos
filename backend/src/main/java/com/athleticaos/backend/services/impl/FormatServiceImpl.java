package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.tournament.BracketGenerationRequest;
import com.athleticaos.backend.entities.*;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.enums.TournamentFormat;
import com.athleticaos.backend.enums.TournamentStageType;
import com.athleticaos.backend.repositories.*;
import com.athleticaos.backend.services.FormatService;
import com.athleticaos.backend.services.BracketService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FormatServiceImpl implements FormatService {

    private final TournamentRepository tournamentRepository;
    private final TournamentTeamRepository tournamentTeamRepository;
    private final TournamentStageRepository stageRepository;
    private final MatchRepository matchRepository;
    private final BracketService bracketService;

    @Override
    @Transactional
    public void generateSchedule(UUID tournamentId, BracketGenerationRequest request) {
        Tournament tournament = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> new RuntimeException("Tournament not found"));

        List<TournamentTeam> teams = tournamentTeamRepository.findByTournamentId(tournamentId).stream()
                .filter(TournamentTeam::isActive)
                .collect(Collectors.toList());

        if (teams.size() < 2) {
            throw new RuntimeException("Need at least 2 teams to generate a schedule");
        }

        // Clean up existing unplayed generated matches (MVP: simplifcation, clearing
        // all simple matches for now not handled)
        // ideally we would clear previous stages if re-generating.
        // For now, assuming fresh generation or manual cleanup.

        // Update tournament format settings
        tournament.setFormat(request.getFormat());
        tournament.setNumberOfPools(request.getNumberOfPools());
        tournamentRepository.save(tournament);

        if (request.getFormat() == TournamentFormat.ROUND_ROBIN
                || request.getFormat() == TournamentFormat.POOL_TO_KNOCKOUT) {
            int poolCount = request.getNumberOfPools() != null && request.getNumberOfPools() > 0
                    ? request.getNumberOfPools()
                    : 1;
            generatePools(tournament, teams, poolCount);
        } else if (request.getFormat() == TournamentFormat.KNOCKOUT) {
            // Delegate to existing BracketService for purely Knockout if robust, or
            // implement here.
            // Assuming BracketService handles knockout generation.
            bracketService.generateBracketForTournament(tournamentId, request);
        }
    }

    private void generatePools(Tournament tournament, List<TournamentTeam> teams, int poolCount) {
        // distribute teams
        List<List<TournamentTeam>> pools = new ArrayList<>();
        for (int i = 0; i < poolCount; i++) {
            pools.add(new ArrayList<>());
        }

        // Simple snake distribution or sequential
        // MVP: Sequential or Round Robin distribution
        for (int i = 0; i < teams.size(); i++) {
            pools.get(i % poolCount).add(teams.get(i));
        }

        // Create Stages and Matches
        int poolIndex = 0;
        for (List<TournamentTeam> poolTeams : pools) {
            if (poolTeams.isEmpty())
                continue;

            String poolName = poolCount == 1 ? "Round Robin" : "Pool " + (char) ('A' + poolIndex);
            poolIndex++;

            TournamentStage stage = TournamentStage.builder()
                    .tournament(tournament)
                    .name(poolName)
                    .stageType(TournamentStageType.POOL)
                    .isGroupStage(true)
                    .displayOrder(poolIndex)
                    .build();
            stage = stageRepository.save(stage);

            // Assign teams to this pool (optional: persistence of pool assignment on
            // TournamentTeam)
            for (TournamentTeam tt : poolTeams) {
                tt.setPoolNumber(poolName);
                tournamentTeamRepository.save(tt);
            }

            // Generate Matches (Round Robin)
            generateRoundRobinMatches(tournament, stage, poolTeams);
        }
    }

    private void generateRoundRobinMatches(Tournament tournament, TournamentStage stage, List<TournamentTeam> teams) {
        int n = teams.size();
        // A simple algorithm for round robin
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                TournamentTeam home = teams.get(i);
                TournamentTeam away = teams.get(j);

                Match match = Match.builder()
                        .tournament(tournament)
                        .homeTeam(home.getTeam())
                        .awayTeam(away.getTeam())
                        .stage(stage)
                        .matchDate(tournament.getStartDate()) // default to start date
                        .kickOffTime(java.time.LocalTime.of(9, 0)) // default time
                        .status(MatchStatus.SCHEDULED)
                        .build();
                matchRepository.save(match);
            }
        }
    }

    @Override
    @Transactional
    public void clearSchedule(UUID tournamentId) {
        log.info("Clearing schedule for tournament {}", tournamentId);

        // Delete all matches
        matchRepository.deleteByTournamentId(tournamentId);

        // Delete all stages
        stageRepository.deleteByTournamentId(tournamentId);

        // Reset pool numbers on active teams
        List<TournamentTeam> teams = tournamentTeamRepository.findByTournamentId(tournamentId);
        for (TournamentTeam team : teams) {
            if (team.getPoolNumber() != null) {
                team.setPoolNumber(null);
                tournamentTeamRepository.save(team);
            }
        }
    }
}
