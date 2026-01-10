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

        // Update tournament format settings
        tournament.setFormat(request.getFormat());
        tournament.setNumberOfPools(request.getNumberOfPools());
        tournamentRepository.save(tournament);

        // Unified logic for using existing groups
        if (Boolean.TRUE.equals(request.getUseExistingGroups())) {
            generateMatchesForExistingGroups(tournament, request);

            // If format involves knockout (POOL_TO_KNOCKOUT/MIXED) and we reused pools,
            // we might need to ensure knockout stages exist.
            // For now, we trust the existing structure or assume user will generate
            // knockout later.
            // (Future improvement: check for knockout stages and generate if missing)
            return;
        }

        if (request.getFormat() == TournamentFormat.ROUND_ROBIN) {
            List<TournamentTeam> allTeams = tournamentTeamRepository.findByTournamentId(tournamentId);
            List<TournamentTeam> teams;

            if (request.getTeamIds() != null && !request.getTeamIds().isEmpty()) {
                // Filter by provided Team IDs
                teams = allTeams.stream()
                        .filter(tt -> request.getTeamIds().contains(tt.getTeam().getId()))
                        .filter(TournamentTeam::isActive)
                        .collect(Collectors.toList());
            } else {
                // Filter by Category
                teams = allTeams.stream()
                        .filter(TournamentTeam::isActive)
                        .filter(team -> request.getCategoryId() == null
                                || (team.getCategory() != null
                                        && team.getCategory().getId().equals(request.getCategoryId())))
                        .collect(Collectors.toList());
            }

            log.info("Found {} active teams for Round Robin generation (Category: {}, Explicit IDs: {})",
                    teams.size(),
                    request.getCategoryId(),
                    request.getTeamIds() != null ? request.getTeamIds().size() : "None");

            if (teams.size() < 2) {
                throw new IllegalArgumentException("Need at least 2 teams to generate a schedule (Found " + teams.size()
                        + "). If using existing pools, ensure 'Preserve manual pool assignments' is checked.");
            }

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
        } else if (request.getFormat() == TournamentFormat.KNOCKOUT
                || request.getFormat() == TournamentFormat.POOL_TO_KNOCKOUT
                || request.getFormat() == TournamentFormat.MIXED) {

            // For Knockout, we usually need teams to populate the bracket
            // Fetch teams if not provided in request
            if (request.getTeamIds() == null || request.getTeamIds().isEmpty()) {
                List<TournamentTeam> teams = tournamentTeamRepository.findByTournamentId(tournamentId).stream()
                        .filter(TournamentTeam::isActive)
                        .filter(team -> request.getCategoryId() == null
                                || (team.getCategory() != null
                                        && team.getCategory().getId().equals(request.getCategoryId())))
                        .collect(Collectors.toList());

                log.info("Found {} active teams for Bracket generation (Category: {})", teams.size(),
                        request.getCategoryId());

                if (teams.isEmpty()) {
                    // Check if there are ANY teams in the tournament to give a better error
                    long totalTeams = tournamentTeamRepository.findByTournamentId(tournamentId).size();
                    if (totalTeams > 0) {
                        throw new IllegalArgumentException(
                                "Found 0 teams matching the criteria (Active + Category). Total teams in tournament: "
                                        + totalTeams + ". Check category filters.");
                    } else {
                        throw new IllegalArgumentException("No teams found in tournament. Please add teams first.");
                    }
                }

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
        // int totalMatches = (n * (n - 1)) / 2;

        // long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(
        // tournament.getStartDate(),
        // tournament.getEndDate());

        int matchCounter = 0;
        boolean generateTimings = request.getGenerateTimings() == null || request.getGenerateTimings();

        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                TournamentTeam home = teams.get(i);
                TournamentTeam away = teams.get(j);

                java.time.LocalDate matchDate = null;
                java.time.LocalTime kickOffTime = null;

                if (generateTimings) {
                    com.athleticaos.backend.entities.TournamentFormatConfig config = tournament.getFormatConfig();

                    // Defaults
                    java.time.LocalTime startTime = java.time.LocalTime.of(9, 0);
                    java.time.LocalTime endTime = java.time.LocalTime.of(17, 0);
                    int duration = 80;
                    int buffer = 10;

                    if (config != null) {
                        if (config.getCarnivalStartTime() != null)
                            startTime = config.getCarnivalStartTime();
                        if (config.getCarnivalEndTime() != null)
                            endTime = config.getCarnivalEndTime();
                        if (config.getMatchDurationMinutes() != null)
                            duration = config.getMatchDurationMinutes();
                        if (config.getBufferTimeMinutes() != null)
                            buffer = config.getBufferTimeMinutes();
                    }

                    int slotMinutes = duration + buffer;
                    long minutesAvailable = java.time.temporal.ChronoUnit.MINUTES.between(startTime, endTime);
                    // Avoid div by zero
                    if (minutesAvailable <= 0)
                        minutesAvailable = 480; // 8 hours default if weird

                    int matchesPerDay = (int) (minutesAvailable / slotMinutes);
                    if (matchesPerDay < 1)
                        matchesPerDay = 1;

                    // Calculate position
                    int dayIndex = matchCounter / matchesPerDay;
                    int matchInDay = matchCounter % matchesPerDay;

                    matchDate = tournament.getStartDate().plusDays(dayIndex);
                    kickOffTime = startTime.plusMinutes(matchInDay * slotMinutes);
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

    @Override
    @Transactional
    @SuppressWarnings("null")
    public void updateStageName(UUID stageId, String name) {
        TournamentStage stage = stageRepository.findById(stageId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Stage not found"));

        String oldName = stage.getName();
        if (oldName.equals(name))
            return;

        stage.setName(name);
        stageRepository.save(stage);

        // If this is a pool, update team assignments
        if (stage.getStageType() == TournamentStageType.POOL) {
            List<TournamentTeam> teams = tournamentTeamRepository.findByTournamentId(stage.getTournament().getId());
            for (TournamentTeam team : teams) {
                if (oldName.equals(team.getPoolNumber())) {
                    team.setPoolNumber(name);
                    tournamentTeamRepository.save(team);
                }
            }
        }
    }
}
