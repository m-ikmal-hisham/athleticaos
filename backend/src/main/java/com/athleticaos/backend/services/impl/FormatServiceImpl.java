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
    private final MatchEventRepository matchEventRepository;
    private final MatchLineupRepository matchLineupRepository;
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

        // Update tournament format settings
        tournament.setFormat(request.getFormat());
        tournament.setNumberOfPools(request.getNumberOfPools());
        tournamentRepository.save(tournament);

        if (request.getFormat() == TournamentFormat.ROUND_ROBIN) {
            // Check if we should use existing groups (Pools)
            if (Boolean.TRUE.equals(request.getUseExistingGroups())) {
                generateMatchesForExistingGroups(tournament, request);
            } else {
                int poolCount = request.getNumberOfPools() != null && request.getNumberOfPools() > 0
                        ? request.getNumberOfPools()
                        : 1;
                generatePools(tournament, teams, poolCount, request);
            }
        } else if (request.getFormat() == TournamentFormat.KNOCKOUT
                || request.getFormat() == TournamentFormat.POOL_TO_KNOCKOUT
                || request.getFormat() == TournamentFormat.MIXED) {

            // Populate team IDs if missing (required by bracketService)
            if (request.getTeamIds() == null || request.getTeamIds().isEmpty()) {
                List<UUID> teamIds = teams.stream()
                        .map(tt -> tt.getTeam().getId())
                        .collect(Collectors.toList());
                request.setTeamIds(teamIds);
            }

            bracketService.generateBracketForTournament(tournamentId, request);
        }
    }

    private void generateMatchesForExistingGroups(Tournament tournament, BracketGenerationRequest request) {
        // Fetch existing stages/pools
        List<TournamentStage> stages = stageRepository.findByTournamentIdOrderByDisplayOrderAsc(tournament.getId());
        List<TournamentTeam> allTeams = tournamentTeamRepository.findByTournamentId(tournament.getId());

        // Group teams by pool name
        java.util.Map<String, List<TournamentTeam>> poolMap = allTeams.stream()
                .filter(t -> t.getPoolNumber() != null)
                .collect(Collectors.groupingBy(TournamentTeam::getPoolNumber));

        for (TournamentStage stage : stages) {
            if (stage.getStageType() == TournamentStageType.POOL) {
                List<TournamentTeam> poolTeams = poolMap.get(stage.getName());
                if (poolTeams != null && !poolTeams.isEmpty()) {
                    generateRoundRobinMatches(tournament, stage, poolTeams, request);
                }
            }
        }
    }

    private void generatePools(Tournament tournament, List<TournamentTeam> teams, int poolCount,
            BracketGenerationRequest request) {
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
            generateRoundRobinMatches(tournament, stage, poolTeams, request);
        }
    }

    private void generateRoundRobinMatches(Tournament tournament, TournamentStage stage, List<TournamentTeam> teams,
            BracketGenerationRequest request) {
        int n = teams.size();

        // Calculate total number of matches
        int totalMatches = (n * (n - 1)) / 2;

        // Calculate days available for the tournament
        long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(
                tournament.getStartDate(),
                tournament.getEndDate());

        // If tournament is only 1 day or less, schedule all on start date
        // Otherwise, distribute matches evenly across the date range
        int matchCounter = 0;
        boolean generateTimings = request.getGenerateTimings() == null || request.getGenerateTimings();

        // A simple algorithm for round robin
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                TournamentTeam home = teams.get(i);
                TournamentTeam away = teams.get(j);

                java.time.LocalDate matchDate = null;
                java.time.LocalTime kickOffTime = null;

                if (generateTimings) {
                    // Calculate match date by distributing evenly across tournament period
                    if (daysBetween <= 0 || totalMatches == 1) {
                        matchDate = tournament.getStartDate();
                    } else {
                        // Distribute matches evenly across the date range
                        long daysToAdd = (matchCounter * daysBetween) / (totalMatches - 1);
                        matchDate = tournament.getStartDate().plusDays(daysToAdd);
                    }

                    // Vary kick-off times slightly (9 AM, 11 AM, 2 PM, 4 PM cycle)
                    int timeSlot = matchCounter % 4;
                    kickOffTime = switch (timeSlot) {
                        case 0 -> java.time.LocalTime.of(9, 0);
                        case 1 -> java.time.LocalTime.of(11, 0);
                        case 2 -> java.time.LocalTime.of(14, 0);
                        default -> java.time.LocalTime.of(16, 0);
                    };
                }

                Match match = Match.builder()
                        .tournament(tournament)
                        .homeTeam(home.getTeam())
                        .awayTeam(away.getTeam())
                        .stage(stage)
                        .matchDate(matchDate) // Can be null
                        .kickOffTime(kickOffTime) // Can be null
                        .status(MatchStatus.SCHEDULED)
                        .build();
                matchRepository.save(match);

                matchCounter++;
            }
        }
    }

    @Override
    @Transactional
    public void clearSchedule(UUID tournamentId) {
        // Default behavior for backward compatibility or when "Reset All" is requested
        clearSchedule(tournamentId, true);
    }

    // New overloaded method support partial clearing (structure preservation)
    // Note: Needs interface update if exposed directly, for now we will rely on
    // internal logic or add to interface
    public void clearSchedule(UUID tournamentId, boolean clearStructure) {
        log.info("Clearing schedule for tournament {} (clearStructure={})", tournamentId, clearStructure);

        // Delete dependency data first (Events, Lineups)
        matchEventRepository.deleteByMatch_Tournament_Id(tournamentId);
        matchLineupRepository.deleteByMatch_Tournament_Id(tournamentId);

        // Delete all matches
        matchRepository.deleteByTournamentId(tournamentId);

        if (clearStructure) {
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
}
