package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.match.MatchResponse;
import com.athleticaos.backend.dtos.tournament.*;
import com.athleticaos.backend.entities.*;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.enums.TournamentFormat;
import com.athleticaos.backend.enums.TournamentStageType;
import com.athleticaos.backend.repositories.*;
import com.athleticaos.backend.services.BracketService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BracketServiceImpl implements BracketService {

    private final TournamentRepository tournamentRepository;
    private final TournamentStageRepository stageRepository;
    private final MatchRepository matchRepository;
    private final TeamRepository teamRepository;

    @Override
    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public BracketViewResponse getBracketForTournament(UUID tournamentId) {
        log.info("Getting bracket for tournament: {}", tournamentId);

        Tournament tournament = tournamentRepository.findById(tournamentId)
                .filter(t -> !t.isDeleted())
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));

        List<TournamentStage> stages = stageRepository.findByTournamentIdOrderByDisplayOrderAsc(tournamentId);

        List<TournamentStageBracket> stageBrackets = stages.stream()
                .map(stage -> {
                    List<Match> matches = matchRepository.findByStageId(stage.getId());
                    List<MatchResponse> matchResponses = matches.stream()
                            .map(this::mapMatchToResponse)
                            .collect(Collectors.toList());

                    return TournamentStageBracket.builder()
                            .stage(mapStageToResponse(stage))
                            .matches(matchResponses)
                            .build();
                })
                .collect(Collectors.toList());

        return BracketViewResponse.builder()
                .tournament(mapTournamentToResponse(tournament))
                .stages(stageBrackets)
                .build();
    }

    @Override
    @Transactional
    @SuppressWarnings("null")
    public BracketViewResponse generateBracketForTournament(UUID tournamentId, BracketGenerationRequest request) {
        log.info("Generating bracket for tournament: {} with format: {}", tournamentId, request.getFormat());

        Tournament tournament = tournamentRepository.findById(tournamentId)
                .filter(t -> !t.isDeleted())
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));

        // Get teams to participate
        List<Team> teams = getTeamsForBracket(request);
        if (teams.isEmpty()) {
            throw new IllegalArgumentException(
                    "No teams provided for bracket generation. Please specify teamIds in the request.");
        }

        // Clear existing bracket if any
        clearExistingBracket(tournamentId);

        // Update tournament format settings
        tournament.setFormat(request.getFormat());
        tournament.setNumberOfPools(request.getNumberOfPools());
        tournament.setHasPlacementStages(
                request.getIncludePlacementStages() != null ? request.getIncludePlacementStages() : false);
        tournamentRepository.save(tournament);

        // Generate bracket based on format
        switch (request.getFormat()) {
            case ROUND_ROBIN:
                generateRoundRobinBracket(tournament, teams, request.getNumberOfPools());
                break;
            case KNOCKOUT:
                generateKnockoutBracket(tournament, teams);
                // Generate placement stages if requested
                if (Boolean.TRUE.equals(tournament.getHasPlacementStages())) {
                    generatePlacementStages(tournament, teams.size());
                }
                break;
            case MIXED:
                generateMixedFormatBracket(tournament, teams, request.getNumberOfPools());
                // Generate placement stages if requested
                if (Boolean.TRUE.equals(tournament.getHasPlacementStages())) {
                    generatePlacementStages(tournament, teams.size());
                }
                break;
            default:
                throw new IllegalArgumentException("Unsupported tournament format: " + request.getFormat());
        }

        // Return the generated bracket
        return getBracketForTournament(tournamentId);
    }

    private List<Team> getTeamsForBracket(BracketGenerationRequest request) {
        if (request.getTeamIds() == null || request.getTeamIds().isEmpty()) {
            // TODO: In future, could fetch all teams associated with tournament's
            // organisation
            return Collections.emptyList();
        }

        return request.getTeamIds().stream()
                .map(teamId -> teamRepository.findById(teamId)
                        .orElseThrow(() -> new EntityNotFoundException("Team not found: " + teamId)))
                .collect(Collectors.toList());
    }

    @Transactional
    protected void clearExistingBracket(UUID tournamentId) {
        log.info("Clearing existing bracket for tournament: {}", tournamentId);

        // Delete all matches for this tournament
        List<Match> existingMatches = matchRepository.findByTournamentId(tournamentId);
        matchRepository.deleteAll(existingMatches);

        // Delete all stages for this tournament
        stageRepository.deleteByTournamentId(tournamentId);
    }

    private void generateRoundRobinBracket(Tournament tournament, List<Team> teams, Integer numberOfPools) {
        log.info("Generating round-robin bracket with {} pools for {} teams", numberOfPools, teams.size());

        if (numberOfPools == null || numberOfPools < 1) {
            numberOfPools = 1;
        }

        // Partition teams into pools
        List<List<Team>> pools = partitionTeamsIntoPools(teams, numberOfPools);

        int stageOrder = 1;
        for (int i = 0; i < pools.size(); i++) {
            List<Team> poolTeams = pools.get(i);
            String poolName = "Pool " + (char) ('A' + i);

            // Create stage
            TournamentStage stage = TournamentStage.builder()
                    .tournament(tournament)
                    .name(poolName)
                    .stageType(TournamentStageType.POOL)
                    .displayOrder(stageOrder++)
                    .isGroupStage(true)
                    .isKnockoutStage(false)
                    .build();
            stage = stageRepository.save(stage);

            // Generate all round-robin pairings for this pool
            generateRoundRobinMatches(tournament, stage, poolTeams, poolName);
        }
    }

    private List<List<Team>> partitionTeamsIntoPools(List<Team> teams, int numberOfPools) {
        List<List<Team>> pools = new ArrayList<>();
        for (int i = 0; i < numberOfPools; i++) {
            pools.add(new ArrayList<>());
        }

        // Distribute teams evenly across pools
        for (int i = 0; i < teams.size(); i++) {
            pools.get(i % numberOfPools).add(teams.get(i));
        }

        return pools;
    }

    private void generateRoundRobinMatches(Tournament tournament, TournamentStage stage, List<Team> teams,
            String poolName) {
        // Generate all possible pairings (each team plays every other team once)
        for (int i = 0; i < teams.size(); i++) {
            for (int j = i + 1; j < teams.size(); j++) {
                Team homeTeam = teams.get(i);
                Team awayTeam = teams.get(j);

                Match match = Match.builder()
                        .tournament(tournament)
                        .stage(stage)
                        .homeTeam(homeTeam)
                        .awayTeam(awayTeam)
                        .matchDate(tournament.getStartDate())
                        .kickOffTime(LocalTime.of(10, 0)) // Default kick-off time
                        .venue(tournament.getVenue())
                        .status(MatchStatus.SCHEDULED)
                        .phase(poolName)
                        .matchCode(String.format("%s-M%d", poolName.replace(" ", ""), i * teams.size() + j))
                        .build();

                matchRepository.save(match);
            }
        }
    }

    private void generateKnockoutBracket(Tournament tournament, List<Team> teams) {
        log.info("Generating knockout bracket for {} teams", teams.size());

        int teamCount = teams.size();

        // Check if team count is power of 2
        if (!isPowerOfTwo(teamCount)) {
            log.warn("Team count {} is not a power of 2. Some teams will receive BYEs.", teamCount);
            // TODO: Implement BYE logic for non-power-of-2 team counts
        }

        // Determine knockout stages needed
        List<KnockoutStageInfo> stages = determineKnockoutStages(teamCount);

        int stageOrder = 1;
        int currentTeamCount = teamCount;
        List<Team> currentRoundTeams = new ArrayList<>(teams);

        for (KnockoutStageInfo stageInfo : stages) {
            TournamentStage stage = TournamentStage.builder()
                    .tournament(tournament)
                    .name(stageInfo.name)
                    .stageType(stageInfo.type)
                    .displayOrder(stageOrder++)
                    .isGroupStage(false)
                    .isKnockoutStage(true)
                    .build();
            stage = stageRepository.save(stage);

            // Generate matches for this knockout round
            int matchesInRound = currentTeamCount / 2;
            for (int i = 0; i < matchesInRound; i++) {
                Team homeTeam = currentRoundTeams.get(i * 2);
                Team awayTeam = currentRoundTeams.get(i * 2 + 1);

                Match match = Match.builder()
                        .tournament(tournament)
                        .stage(stage)
                        .homeTeam(homeTeam)
                        .awayTeam(awayTeam)
                        .matchDate(tournament.getStartDate())
                        .kickOffTime(LocalTime.of(14, 0)) // Default afternoon kick-off
                        .venue(tournament.getVenue())
                        .status(MatchStatus.SCHEDULED)
                        .phase(stageInfo.name)
                        .matchCode(String.format("%s-M%d", stageInfo.abbreviation, i + 1))
                        .build();

                matchRepository.save(match);
            }

            currentTeamCount = matchesInRound;
        }

        // TODO: Add third-place playoff if needed
        log.info("Knockout bracket generated. Progression logic is a TODO for future implementation.");
    }

    private boolean isPowerOfTwo(int n) {
        return n > 0 && (n & (n - 1)) == 0;
    }

    private List<KnockoutStageInfo> determineKnockoutStages(int teamCount) {
        List<KnockoutStageInfo> stages = new ArrayList<>();

        if (teamCount >= 8) {
            stages.add(new KnockoutStageInfo("Quarter Finals", TournamentStageType.QUARTER_FINAL, "QF"));
        }
        if (teamCount >= 4) {
            stages.add(new KnockoutStageInfo("Semi Finals", TournamentStageType.SEMI_FINAL, "SF"));
        }
        if (teamCount >= 2) {
            stages.add(new KnockoutStageInfo("Final", TournamentStageType.FINAL, "F"));
        }

        return stages;
    }

    private void generateMixedFormatBracket(Tournament tournament, List<Team> teams, Integer numberOfPools) {
        log.info("Generating mixed format bracket with {} pools for {} teams", numberOfPools, teams.size());

        if (numberOfPools == null || numberOfPools < 2) {
            numberOfPools = 2; // Default to 2 pools for mixed format
        }

        // Step 1: Generate pool stage (round-robin within pools)
        generateRoundRobinBracket(tournament, teams, numberOfPools);

        // Step 2: Create knockout stages for pool winners/runners-up
        // Note: Teams will be assigned to knockout matches via pool progression logic
        int teamsAdvancingPerPool = 2; // Top 2 from each pool
        int knockoutTeamCount = numberOfPools * teamsAdvancingPerPool;

        // Determine knockout stages needed
        List<KnockoutStageInfo> knockoutStages = determineKnockoutStages(knockoutTeamCount);

        // Get current highest display order from pool stages
        List<TournamentStage> existingStages = stageRepository
                .findByTournamentIdOrderByDisplayOrderAsc(tournament.getId());
        int nextDisplayOrder = existingStages.stream()
                .mapToInt(TournamentStage::getDisplayOrder)
                .max()
                .orElse(0) + 1;

        // Create knockout stages with placeholder teams
        for (KnockoutStageInfo stageInfo : knockoutStages) {
            TournamentStage stage = TournamentStage.builder()
                    .tournament(tournament)
                    .name(stageInfo.name)
                    .stageType(stageInfo.type)
                    .displayOrder(nextDisplayOrder++)
                    .isGroupStage(false)
                    .isKnockoutStage(true)
                    .build();
            stage = stageRepository.save(stage);

            // Create matches with TBD teams (will be filled after pool stage completes)
            int matchesInRound = knockoutTeamCount / 2;
            for (int i = 0; i < matchesInRound; i++) {
                Match match = Match.builder()
                        .tournament(tournament)
                        .stage(stage)
                        .matchDate(tournament.getStartDate().plusDays(3)) // Schedule after pool stage
                        .kickOffTime(LocalTime.of(14, 0))
                        .venue(tournament.getVenue())
                        .status(MatchStatus.SCHEDULED)
                        .phase(stageInfo.name)
                        .matchCode(String.format("%s-M%d", stageInfo.abbreviation, i + 1))
                        .build();

                matchRepository.save(match);
            }

            knockoutTeamCount = matchesInRound;
        }

        log.info("Mixed format bracket generated. Pool winners/runners-up will be assigned via progression logic.");
    }

    /**
     * Calculate pool standings and progress top teams to knockout stage.
     * This should be called after all pool matches are completed.
     */
    @Transactional
    public void progressPoolsToKnockout(UUID tournamentId) {
        log.info("Progressing pool winners to knockout stage for tournament: {}", tournamentId);

        Tournament tournament = tournamentRepository.findById(tournamentId)
                .filter(t -> !t.isDeleted())
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));

        // Get all pool stages
        List<TournamentStage> poolStages = stageRepository.findByTournamentIdOrderByDisplayOrderAsc(tournamentId)
                .stream()
                .filter(TournamentStage::getIsGroupStage)
                .toList();

        if (poolStages.isEmpty()) {
            log.warn("No pool stages found for tournament {}", tournamentId);
            return;
        }

        // Calculate standings for each pool
        List<PoolStanding> allStandings = new ArrayList<>();
        for (TournamentStage poolStage : poolStages) {
            List<PoolStanding> poolStandings = calculatePoolStandings(poolStage);
            allStandings.addAll(poolStandings);
        }

        // Get first knockout stage
        TournamentStage firstKnockoutStage = stageRepository.findByTournamentIdOrderByDisplayOrderAsc(tournamentId)
                .stream()
                .filter(TournamentStage::getIsKnockoutStage)
                .findFirst()
                .orElse(null);

        if (firstKnockoutStage == null) {
            log.warn("No knockout stage found for tournament {}", tournamentId);
            return;
        }

        // Seed teams into knockout bracket
        seedKnockoutBracket(firstKnockoutStage, allStandings);
    }

    private List<PoolStanding> calculatePoolStandings(TournamentStage poolStage) {
        List<Match> poolMatches = matchRepository.findByStageId(poolStage.getId());
        Map<UUID, PoolStanding> standingsMap = new HashMap<>();

        // Initialize standings for all teams in pool
        for (Match match : poolMatches) {
            standingsMap.putIfAbsent(match.getHomeTeam().getId(),
                    new PoolStanding(match.getHomeTeam(), poolStage.getName()));
            standingsMap.putIfAbsent(match.getAwayTeam().getId(),
                    new PoolStanding(match.getAwayTeam(), poolStage.getName()));
        }

        // Calculate points from completed matches
        for (Match match : poolMatches) {
            if (match.getStatus() != MatchStatus.COMPLETED ||
                    match.getHomeScore() == null ||
                    match.getAwayScore() == null) {
                continue;
            }

            PoolStanding homeStanding = standingsMap.get(match.getHomeTeam().getId());
            PoolStanding awayStanding = standingsMap.get(match.getAwayTeam().getId());

            homeStanding.played++;
            awayStanding.played++;
            homeStanding.pointsFor += match.getHomeScore();
            homeStanding.pointsAgainst += match.getAwayScore();
            awayStanding.pointsFor += match.getAwayScore();
            awayStanding.pointsAgainst += match.getHomeScore();

            if (match.getHomeScore() > match.getAwayScore()) {
                homeStanding.wins++;
                homeStanding.points += 4; // 4 points for win
                awayStanding.losses++;
            } else if (match.getAwayScore() > match.getHomeScore()) {
                awayStanding.wins++;
                awayStanding.points += 4;
                homeStanding.losses++;
            } else {
                homeStanding.draws++;
                awayStanding.draws++;
                homeStanding.points += 2; // 2 points for draw
                awayStanding.points += 2;
            }

            // Bonus point for scoring 4+ tries (simplified - using score threshold)
            if (match.getHomeScore() >= 28)
                homeStanding.points++;
            if (match.getAwayScore() >= 28)
                awayStanding.points++;
        }

        // Sort by points, then point differential
        return standingsMap.values().stream()
                .sorted(Comparator.comparing(PoolStanding::getPoints).reversed()
                        .thenComparing(s -> s.pointsFor - s.pointsAgainst, Comparator.reverseOrder())
                        .thenComparing(s -> s.pointsFor, Comparator.reverseOrder()))
                .toList();
    }

    private void seedKnockoutBracket(TournamentStage firstKnockoutStage, List<PoolStanding> standings) {
        List<Match> knockoutMatches = matchRepository.findByStageId(firstKnockoutStage.getId());

        // Seed teams: Pool A winner vs Pool B runner-up, Pool B winner vs Pool A
        // runner-up, etc.
        int matchIndex = 0;
        for (int i = 0; i < standings.size() && matchIndex < knockoutMatches.size(); i += 2) {
            if (i + 1 < standings.size()) {
                Match match = knockoutMatches.get(matchIndex);
                match.setHomeTeam(standings.get(i).team); // Higher seed
                match.setAwayTeam(standings.get(i + 1).team); // Lower seed
                matchRepository.save(match);
                matchIndex++;
            }
        }

        log.info("Seeded {} teams into knockout bracket", standings.size());
    }

    // Helper class for pool standings
    private static class PoolStanding {
        Team team;
        String poolName;
        int played = 0;
        int wins = 0;
        int draws = 0;
        int losses = 0;
        int pointsFor = 0;
        int pointsAgainst = 0;
        int points = 0;

        PoolStanding(Team team, String poolName) {
            this.team = team;
            this.poolName = poolName;
        }

        int getPoints() {
            return points;
        }
    }

    /**
     * Generate placement stages (Plate, Bowl, Shield) for losers in knockout
     * stages.
     * This creates parallel brackets for teams that lose in various rounds.
     */
    private void generatePlacementStages(Tournament tournament, int totalTeams) {
        log.info("Generating placement stages for tournament with {} teams", totalTeams);

        // Get the highest display order from main knockout stages
        List<TournamentStage> existingStages = stageRepository
                .findByTournamentIdOrderByDisplayOrderAsc(tournament.getId());
        int nextDisplayOrder = existingStages.stream()
                .mapToInt(TournamentStage::getDisplayOrder)
                .max()
                .orElse(0) + 1;

        // Determine which placement stages to create based on team count
        if (totalTeams >= 16) {
            // Plate (for QF losers), Bowl (for SF losers in lower bracket), Shield (for
            // early losers)
            createPlacementStage(tournament, "Plate Semi Finals", TournamentStageType.PLATE, nextDisplayOrder++, 2);
            createPlacementStage(tournament, "Plate Final", TournamentStageType.PLATE, nextDisplayOrder++, 1);
            createPlacementStage(tournament, "Bowl Semi Finals", TournamentStageType.BOWL, nextDisplayOrder++, 2);
            createPlacementStage(tournament, "Bowl Final", TournamentStageType.BOWL, nextDisplayOrder++, 1);
            createPlacementStage(tournament, "Shield Final", TournamentStageType.SHIELD, nextDisplayOrder++, 1);
        } else if (totalTeams >= 8) {
            // Plate (for SF losers), Bowl (for QF losers)
            createPlacementStage(tournament, "Plate Final", TournamentStageType.PLATE, nextDisplayOrder++, 1);
            createPlacementStage(tournament, "Bowl Final", TournamentStageType.BOWL, nextDisplayOrder++, 1);
        } else if (totalTeams >= 4) {
            // Just Plate (for SF losers - 3rd place playoff)
            createPlacementStage(tournament, "3rd Place Playoff", TournamentStageType.THIRD_PLACE, nextDisplayOrder++,
                    1);
        }

        log.info("Placement stages created. Teams will be assigned via progression logic when matches complete.");
    }

    private void createPlacementStage(Tournament tournament, String stageName, TournamentStageType stageType,
            int displayOrder, int numberOfMatches) {
        TournamentStage stage = TournamentStage.builder()
                .tournament(tournament)
                .name(stageName)
                .stageType(stageType)
                .displayOrder(displayOrder)
                .isGroupStage(false)
                .isKnockoutStage(true) // Placement stages are also knockout format
                .build();
        stage = stageRepository.save(stage);

        // Create placeholder matches (teams will be assigned when losers are
        // determined)
        for (int i = 0; i < numberOfMatches; i++) {
            Match match = Match.builder()
                    .tournament(tournament)
                    .stage(stage)
                    .matchDate(tournament.getEndDate()) // Schedule for end of tournament
                    .kickOffTime(LocalTime.of(12, 0))
                    .venue(tournament.getVenue())
                    .status(MatchStatus.SCHEDULED)
                    .phase(stageName)
                    .matchCode(String.format("%s-M%d", getStageAbbreviation(stageType), i + 1))
                    .build();

            matchRepository.save(match);
        }

        log.info("Created placement stage: {} with {} matches", stageName, numberOfMatches);
    }

    private String getStageAbbreviation(TournamentStageType stageType) {
        return switch (stageType) {
            case QUARTER_FINAL -> "QF";
            case SEMI_FINAL -> "SF";
            case FINAL -> "F";
            case THIRD_PLACE -> "3P";
            case PLATE -> "PL";
            case BOWL -> "BW";
            case SHIELD -> "SH";
            default -> stageType.name().substring(0, 2);
        };
    }

    // Mapping methods
    private TournamentResponse mapTournamentToResponse(Tournament tournament) {
        String status;
        LocalDate now = LocalDate.now();

        if (!tournament.isPublished()) {
            status = "Draft";
        } else if (now.isBefore(tournament.getStartDate())) {
            status = "Upcoming";
        } else if (now.isAfter(tournament.getEndDate())) {
            status = "Completed";
        } else {
            status = "Ongoing";
        }

        return TournamentResponse.builder()
                .id(tournament.getId())
                .name(tournament.getName())
                .level(tournament.getLevel())
                .organiserOrgId(tournament.getOrganiserOrg().getId())
                .startDate(tournament.getStartDate())
                .endDate(tournament.getEndDate())
                .venue(tournament.getVenue())
                .isPublished(tournament.isPublished())
                .status(status)
                .build();
    }

    private TournamentStageResponse mapStageToResponse(TournamentStage stage) {
        return TournamentStageResponse.builder()
                .id(stage.getId())
                .tournamentId(stage.getTournament().getId())
                .name(stage.getName())
                .stageType(stage.getStageType().name())
                .displayOrder(stage.getDisplayOrder())
                .groupStage(stage.getIsGroupStage())
                .knockoutStage(stage.getIsKnockoutStage())
                .build();
    }

    private MatchResponse mapMatchToResponse(Match match) {
        return MatchResponse.builder()
                .id(match.getId())
                .tournamentId(match.getTournament().getId())
                .homeTeamId(match.getHomeTeam().getId())
                .homeTeamName(match.getHomeTeam().getName())
                .awayTeamId(match.getAwayTeam().getId())
                .awayTeamName(match.getAwayTeam().getName())
                .matchDate(match.getMatchDate())
                .kickOffTime(match.getKickOffTime())
                .venue(match.getVenue())
                .pitch(match.getPitch())
                .status(match.getStatus().name())
                .homeScore(match.getHomeScore())
                .awayScore(match.getAwayScore())
                .phase(match.getPhase())
                .matchCode(match.getMatchCode())
                .build();
    }

    // Helper class for knockout stage information
    private static class KnockoutStageInfo {
        String name;
        TournamentStageType type;
        String abbreviation;

        KnockoutStageInfo(String name, TournamentStageType type, String abbreviation) {
            this.name = name;
            this.type = type;
            this.abbreviation = abbreviation;
        }
    }
}
