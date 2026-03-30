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
    private final MatchOfficialRepository matchOfficialRepository;
    private final PlayerSuspensionRepository playerSuspensionRepository;
    private final BracketService bracketService;

    @Override
    @Transactional
    @SuppressWarnings("null")
    public void generateSchedule(UUID tournamentId, BracketGenerationRequest request) {
        Tournament tournament = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> new RuntimeException("Tournament not found"));

        // Clear existing matches before generating new ones (preserve structure/pools)
        clearSchedule(tournamentId, false);

        // Update tournament format settings
        // Update tournament format settings logic
        // If category is specific, we should likely update the config for that
        // category?
        // But BracketGenerationRequest is transient.
        // Ideally the UI saves config first, then calls generate.
        // But legacy behavior updates tournament fields.

        if (request.getCategoryId() == null) {
            // Only update Global fields if no category selected
            tournament.setFormat(request.getFormat());
            tournament.setNumberOfPools(request.getNumberOfPools());
            tournament.setHasPlacementStages(request.getIncludePlacementStages() != null ? request.getIncludePlacementStages() : false);
            tournamentRepository.save(tournament);
        } else {
            // If category is provided, the settings should be in TournamentFormatConfig.
            // We assume the UI/User has configured this. 
            // We'll fetch it to ensure it exists or use defaults.
            TournamentFormatConfig config = tournament.getFormatConfig(request.getCategoryId());
            if (config != null) {
                config.setFormatType(request.getFormat());
                if (request.getNumberOfPools() != null) config.setPoolCount(request.getNumberOfPools());
                if (request.getIncludePlacementStages() != null) config.setIncludePlacementStages(request.getIncludePlacementStages());
                // Config is auto-saved via tournament cascade if we add it, but it might already be there.
                // Just to be safe:
                tournamentRepository.save(tournament);
            }
        }

        // Unified logic for using existing groups
        if (Boolean.TRUE.equals(request.getUseExistingGroups())) {
            // If Round Robin, we can handle it here or let specific logic handle it.
            // But for Mixed/Knockout, we MUST delegate to bracketService to generate the
            // knockout part.
            if (request.getFormat() == TournamentFormat.ROUND_ROBIN) {
                generateMatchesForExistingGroups(tournament, request);
                return;
            }
            // For others, fall through to bracketService which now handles preservation.
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
                generateRoundRobinMatches(tournament, stage, poolTeams, request);
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
        // We already cleared matches at the start of generateSchedule(), so we can safely generate new ones.
        
        // Fetch existing stages/pools
        List<TournamentStage> stages = stageRepository.findByTournamentIdOrderByDisplayOrderAsc(tournament.getId());
        List<TournamentTeam> allTeams = tournamentTeamRepository.findByTournamentId(tournament.getId());

        // Group teams by pool name
        java.util.Map<String, List<TournamentTeam>> poolMap = allTeams.stream()
                .filter(t -> t.getPoolNumber() != null)
                .collect(Collectors.groupingBy(TournamentTeam::getPoolNumber));

        for (TournamentStage stage : stages) {
            if (stage.getStageType() == TournamentStageType.POOL) {
                List<TournamentTeam> poolTeams = poolMap.getOrDefault(stage.getName(), new ArrayList<>());
                generateRoundRobinMatches(tournament, stage, poolTeams, request);
            }
        }
    }

    @Override
    @SuppressWarnings("null")
    public List<TournamentStage> generateStructure(Tournament tournament, int poolCount,
            BracketGenerationRequest request) {

        // Clean up existing matches and their dependencies before deleting structure
        // This prevents FK constraint violations (matches reference stages)
        if (request.getCategoryId() != null) {
            // Category-scoped cleanup: find matches for this category and clean deps
            List<Match> categoryMatches = matchRepository.findByTournamentId(tournament.getId()).stream()
                    .filter(m -> m.getStage() != null && m.getStage().getCategory() != null
                            && m.getStage().getCategory().getId().equals(request.getCategoryId()))
                    .collect(Collectors.toList());

            for (Match match : categoryMatches) {
                playerSuspensionRepository.deleteByMatchId(match.getId());
                matchOfficialRepository.deleteByMatchId(match.getId());
                matchEventRepository.deleteByMatchId(match.getId());
                matchLineupRepository.deleteByMatchId(match.getId());
            }

            // Clear self-referencing next-match links for this category
            matchRepository.clearNextMatchReferencesForCategory(tournament.getId(), request.getCategoryId());
            // Delete matches for this category
            matchRepository.deleteByTournamentIdAndCategoryId(tournament.getId(), request.getCategoryId());

            // Delete stages for this category
            stageRepository.deleteByTournamentIdAndCategoryId(tournament.getId(), request.getCategoryId());

            // Clear team pool assignments for this category
            List<TournamentTeam> teams = tournamentTeamRepository.findByTournamentId(tournament.getId()).stream()
                    .filter(tt -> tt.getCategory() != null && tt.getCategory().getId().equals(request.getCategoryId()))
                    .collect(Collectors.toList());
            for (TournamentTeam tt : teams) {
                tt.setPoolNumber(null);
                tournamentTeamRepository.save(tt);
            }
        } else {
            // Global context: clean up all match dependencies first
            playerSuspensionRepository.deleteByMatch_Tournament_Id(tournament.getId());
            matchOfficialRepository.deleteByMatch_Tournament_Id(tournament.getId());
            matchEventRepository.deleteByMatch_Tournament_Id(tournament.getId());
            matchLineupRepository.deleteByMatch_Tournament_Id(tournament.getId());

            // Clear self-referencing next-match links
            matchRepository.clearNextMatchReferences(tournament.getId());
            // Delete all matches
            List<Match> existingMatches = matchRepository.findByTournamentId(tournament.getId());
            matchRepository.deleteAll(existingMatches);

            // Delete global stages
            stageRepository.deleteByTournamentIdAndCategoryIsNull(tournament.getId());
        }

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
        
        UUID categoryId = stage.getCategory() != null ? stage.getCategory().getId() : null;
        TournamentFormatConfig config = tournament.getFormatConfig(categoryId);
        
        int teamCountInConfig = (config != null && config.getTeamCount() != null && config.getTeamCount() > 0) 
            ? config.getTeamCount() 
            : (request.getTeamIds() != null ? request.getTeamIds().size() : 0);
            
        int poolCount = (config != null && config.getPoolCount() != null && config.getPoolCount() > 0) 
            ? config.getPoolCount() 
            : 1;
        
        // Calculate expected teams per pool
        int expectedTeamsPerPool = teamCountInConfig > 0 ? (int) Math.ceil((double) teamCountInConfig / poolCount) : teams.size();
        
        // Default to a minimum of 2 expected teams per pool to generate at least 1 placeholder match 
        // if no teams exist yet in the whole category.
        if (expectedTeamsPerPool < 2) {
            expectedTeamsPerPool = 2;
        }
        
        int n = Math.max(teams.size(), expectedTeamsPerPool);

        log.info("Generating RR matches for stage: {}. Teams assigned: {}, Expected in pool: {}", stage.getName(), teams.size(), expectedTeamsPerPool);

        // Check strict validation
        if (Boolean.TRUE.equals(config != null ? config.getIsStrictlyValidated() : false) && teams.size() < expectedTeamsPerPool) {
            throw new IllegalArgumentException("Strict Validation: Pool " + stage.getName() + " is missing teams. (Assigned: " + teams.size() + ", Expected: " + expectedTeamsPerPool + ")");
        }

        int matchCounter = 0;
        boolean generateTimings = request.getGenerateTimings() == null || request.getGenerateTimings();

        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                TournamentTeam homeTT = (i < teams.size()) ? teams.get(i) : null;
                TournamentTeam awayTT = (j < teams.size()) ? teams.get(j) : null;

                java.time.LocalDate matchDate = null;
                java.time.LocalTime kickOffTime = null;

                if (generateTimings) {
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
                    if (minutesAvailable <= 0) minutesAvailable = 480;

                    int matchesPerDay = (int) (minutesAvailable / slotMinutes);
                    if (matchesPerDay < 1) matchesPerDay = 1;

                    int dayIndex = matchCounter / matchesPerDay;
                    int matchInDay = matchCounter % matchesPerDay;

                    matchDate = tournament.getStartDate().plusDays(dayIndex);
                    kickOffTime = startTime.plusMinutes(matchInDay * slotMinutes);
                }

                // Placeholder logic: "Pool {Name} - Slot {N}"
                String homePlaceholder = homeTT == null ? (stage.getName() + " - Slot " + (i + 1)) : null;
                String awayPlaceholder = awayTT == null ? (stage.getName() + " - Slot " + (j + 1)) : null;

                Match match = Match.builder()
                        .tournament(tournament)
                        .category(stage.getCategory()) // Correctly set category on Match
                        .homeTeam(homeTT != null ? homeTT.getTeam() : null)
                        .awayTeam(awayTT != null ? awayTT.getTeam() : null)
                        .homeTeamPlaceholder(homePlaceholder)
                        .awayTeamPlaceholder(awayPlaceholder)
                        .stage(stage)
                        .matchDate(matchDate)
                        .kickOffTime(kickOffTime)
                        .status(MatchStatus.SCHEDULED)
                        .phase(stage.getName())
                        .matchCode(String.format("%s-%s-M%d", truncate(tournament.getSlug(), 20),
                                truncate(stage.getName().replace(" ", ""), 10),
                                matchCounter + 1))
                        .build();
                matchRepository.save(match);
                matchCounter++;
            }
        }
    }

    private String truncate(String text, int length) {
        if (text == null) return "";
        return text.length() > length ? text.substring(0, length) : text;
    }

    @Override
    @Transactional
    public void clearSchedule(UUID tournamentId) {
        clearSchedule(tournamentId, true);
    }

    @Override
    public void clearSchedule(UUID tournamentId, boolean clearStructure) {
        log.info("Clearing schedule for tournament {} (clearStructure={})", tournamentId, clearStructure);

        // Delete all match-dependent entities first
        playerSuspensionRepository.deleteByMatch_Tournament_Id(tournamentId);
        matchOfficialRepository.deleteByMatch_Tournament_Id(tournamentId);
        matchEventRepository.deleteByMatch_Tournament_Id(tournamentId);
        matchLineupRepository.deleteByMatch_Tournament_Id(tournamentId);

        // Clear self-referencing next-match links before deleting matches
        matchRepository.clearNextMatchReferences(tournamentId);
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
