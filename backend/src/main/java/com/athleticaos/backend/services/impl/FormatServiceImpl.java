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
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FormatServiceImpl implements FormatService {

    private final TournamentRepository tournamentRepository;
    private final TournamentTeamRepository tournamentTeamRepository;
    private final TournamentCategoryRepository tournamentCategoryRepository;
    private final TournamentStageRepository stageRepository;
    private final MatchRepository matchRepository;
    private final MatchEventRepository matchEventRepository;
    private final MatchLineupRepository matchLineupRepository;
    private final BracketService bracketService;

    @Override
    @Transactional
    @SuppressWarnings("null")
    public void generateSchedule(UUID tournamentId, BracketGenerationRequest request) {
        Tournament tournament = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> new RuntimeException("Tournament not found"));

        List<TournamentTeam> teams = tournamentTeamRepository.findByTournamentId(tournamentId).stream()
                .filter(TournamentTeam::isActive)
                .filter(team -> request.getCategoryId() == null
                        || (team.getCategory() != null && team.getCategory().getId().equals(request.getCategoryId())))
                .collect(Collectors.toList());

        if (teams.size() < 2) {
            throw new RuntimeException("Need at least 2 teams to generate a schedule");
        }

        // Update tournament format settings
        tournament.setFormat(request.getFormat());
        tournament.setNumberOfPools(request.getNumberOfPools());
        tournamentRepository.save(tournament);

        if (request.getFormat() == TournamentFormat.ROUND_ROBIN) {
            if (Boolean.TRUE.equals(request.getUseExistingGroups())) {
                generateMatchesForExistingGroups(tournament, request);
            } else {
                int poolCount = request.getNumberOfPools() != null && request.getNumberOfPools() > 0
                        ? request.getNumberOfPools()
                        : 1;

                // 1. Generate Structure (Create Stages/Pools)
                List<TournamentStage> stages = generateStructure(tournament, poolCount, request);

                // 2. Assign Teams (Auto-distribute)
                assignTeamsToPools(teams, stages);

                // 3. Generate Matches
                for (TournamentStage stage : stages) {
                    List<TournamentTeam> poolTeams = teams.stream()
                            .filter(t -> stage.getName().equals(t.getPoolNumber()))
                            .collect(Collectors.toList());
                    if (!poolTeams.isEmpty()) {
                        generateRoundRobinMatches(tournament, stage, poolTeams, request);
                    }
                }
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

    @Override
    @SuppressWarnings("null")
    public List<TournamentStage> generateStructure(Tournament tournament, int poolCount,
            BracketGenerationRequest request) {
        // Create Stages
        List<TournamentStage> stages = new ArrayList<>();

        TournamentCategory category = request.getCategoryId() != null
                ? tournamentCategoryRepository.findById(request.getCategoryId()).orElse(null)
                : null;

        for (int i = 0; i < poolCount; i++) {
            String poolName = poolCount == 1 ? "Round Robin" : "Pool " + (char) ('A' + i);

            TournamentStage stage = TournamentStage.builder()
                    .tournament(tournament)
                    .category(category)
                    .name(poolName)
                    .stageType(TournamentStageType.POOL)
                    .isGroupStage(true)
                    .displayOrder(i + 1)
                    .build();
            stages.add(stageRepository.save(stage));
        }
        return stages;
    }

    private void assignTeamsToPools(List<TournamentTeam> teams, List<TournamentStage> stages) {
        int poolCount = stages.size();
        if (poolCount == 0)
            return;

        // distribute teams
        List<List<TournamentTeam>> pools = new ArrayList<>();
        for (int i = 0; i < poolCount; i++) {
            pools.add(new ArrayList<>());
        }

        // Simple snake distribution or sequential
        for (int i = 0; i < teams.size(); i++) {
            pools.get(i % poolCount).add(teams.get(i));
        }

        // Update teams
        for (int i = 0; i < poolCount; i++) {
            TournamentStage stage = stages.get(i);
            List<TournamentTeam> poolTeams = pools.get(i);
            for (TournamentTeam tt : poolTeams) {
                tt.setPoolNumber(stage.getName());
                tournamentTeamRepository.save(tt);
            }
        }
    }

    @SuppressWarnings("null")
    private void generateRoundRobinMatches(Tournament tournament, TournamentStage stage, List<TournamentTeam> teams,
            BracketGenerationRequest request) {
        int n = teams.size();
        int totalMatches = (n * (n - 1)) / 2;

        long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(
                tournament.getStartDate(),
                tournament.getEndDate());

        int matchCounter = 0;
        boolean generateTimings = request.getGenerateTimings() == null || request.getGenerateTimings();

        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                TournamentTeam home = teams.get(i);
                TournamentTeam away = teams.get(j);

                java.time.LocalDate matchDate = null;
                java.time.LocalTime kickOffTime = null;

                if (generateTimings) {
                    if (daysBetween <= 0 || totalMatches == 1) {
                        matchDate = tournament.getStartDate();
                    } else {
                        long daysToAdd = (matchCounter * daysBetween) / (totalMatches - 1);
                        matchDate = tournament.getStartDate().plusDays(daysToAdd);
                    }

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
                        .matchDate(matchDate)
                        .kickOffTime(kickOffTime)
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
        clearSchedule(tournamentId, true);
    }

    @Override
    public void clearSchedule(UUID tournamentId, boolean clearStructure) {
        log.info("Clearing schedule for tournament {} (clearStructure={})", tournamentId, clearStructure);

        matchEventRepository.deleteByMatch_Tournament_Id(tournamentId);
        matchLineupRepository.deleteByMatch_Tournament_Id(tournamentId);
        matchRepository.deleteByTournamentId(tournamentId);

        if (clearStructure) {
            stageRepository.deleteByTournamentId(tournamentId);

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
