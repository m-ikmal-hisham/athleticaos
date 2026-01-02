package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.match.MatchResponse;
import com.athleticaos.backend.dtos.tournament.*;
import com.athleticaos.backend.entities.*;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.enums.TournamentStageType;
import com.athleticaos.backend.repositories.*;
import com.athleticaos.backend.services.BracketService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final TournamentTeamRepository tournamentTeamRepository;

    @Override
    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public BracketViewResponse getBracketForTournament(UUID tournamentId) {
        log.info("Getting bracket for tournament: {}", tournamentId);

        Tournament tournament = tournamentRepository.findById(tournamentId)
                .filter(t -> !Boolean.TRUE.equals(t.getDeleted()))
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
                .filter(t -> !Boolean.TRUE.equals(t.getDeleted()))
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
                generateRoundRobinBracket(tournament, teams, request.getNumberOfPools(), request.getPoolNames());
                break;
            case KNOCKOUT:
                generateKnockoutBracket(tournament, teams);
                break;
            case MIXED:
            case POOL_TO_KNOCKOUT:
                generateMixedFormatBracket(tournament, teams, request.getNumberOfPools(), request.getPoolNames());
                break;
            default:
                throw new IllegalArgumentException("Unsupported tournament format: " + request.getFormat());
        }

        // Return the generated bracket
        return getBracketForTournament(tournamentId);
    }

    @SuppressWarnings("null")
    private List<Team> getTeamsForBracket(BracketGenerationRequest request) {
        if (request.getTeamIds() == null || request.getTeamIds().isEmpty()) {
            return Collections.emptyList();
        }

        return request.getTeamIds().stream()
                .map(teamId -> teamRepository.findById(teamId)
                        .orElseThrow(() -> new EntityNotFoundException("Team not found: " + teamId)))
                .collect(Collectors.toList());
    }

    @Transactional
    @SuppressWarnings("null")
    protected void clearExistingBracket(UUID tournamentId) {
        log.info("Clearing existing bracket for tournament: {}", tournamentId);

        // Delete all matches for this tournament
        List<Match> existingMatches = matchRepository.findByTournamentId(tournamentId);
        matchRepository.deleteAll(existingMatches);

        // Delete all stages for this tournament
        stageRepository.deleteByTournamentId(tournamentId);
    }

    @SuppressWarnings("null")
    private void generateRoundRobinBracket(Tournament tournament, List<Team> teams, Integer numberOfPools,
            List<String> poolNames) {
        log.info("Generating round-robin bracket with {} pools for {} teams", numberOfPools, teams.size());

        if (numberOfPools == null || numberOfPools < 1) {
            numberOfPools = 1;
        }

        // Partition teams into pools
        List<List<Team>> pools = partitionTeamsIntoPools(teams, numberOfPools);

        int stageOrder = 1;
        for (int i = 0; i < pools.size(); i++) {
            List<Team> poolTeams = pools.get(i);

            // Use custom pool name if provided, otherwise default to "Pool A", "Pool B",
            // etc.
            String poolName;
            if (poolNames != null && i < poolNames.size() && poolNames.get(i) != null
                    && !poolNames.get(i).trim().isEmpty()) {
                poolName = poolNames.get(i).trim();
            } else {
                poolName = "Pool " + (char) ('A' + i);
            }

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

            // Persist pool assignment to TournamentTeam
            for (Team team : poolTeams) {
                tournamentTeamRepository.findFirstByTournamentIdAndTeamId(tournament.getId(), team.getId())
                        .ifPresent(tt -> {
                            tt.setPoolNumber(poolName);
                            tournamentTeamRepository.save(tt);
                        });
            }

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

    @SuppressWarnings("null")
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
                        .matchCode(String.format("%s-%s-M%d", tournament.getSlug(), poolName.replace(" ", ""),
                                i * teams.size() + j))
                        .build();

                matchRepository.save(match);
            }
        }
    }

    private void generateKnockoutBracket(Tournament tournament, List<Team> teams) {
        log.info("Generating knockout bracket for {} teams", teams.size());

        // Generate knockout bracket logic
        if (teams.size() == 16) {
            // Check if we want standard 16 knockout or full rugby 16
            // For now, if 16, assume full Rugby bracket as before (Cup, Plate, etc) which
            // is implicitly placement enabled
            // We could check tournament.getHasPlacementStages() to restrict it, but Rugby16
            // usually implies all.
            generateRugby16Bracket(tournament, teams);
        } else {
            // Allow linking of placement stages
            legacyKnockoutGeneration(tournament, teams, Boolean.TRUE.equals(tournament.getHasPlacementStages()));
        }
        log.info("Knockout bracket generated.");
    }

    @SuppressWarnings("null")
    private void legacyKnockoutGeneration(Tournament tournament, List<Team> teams, boolean includePlacement) {
        int teamCount = teams.size();

        // Check if team count is power of 2
        if (!isPowerOfTwo(teamCount)) {
            log.warn("Team count {} is not a power of 2. Some teams will receive BYEs.", teamCount);
        }

        // Determine knockout stages needed
        List<KnockoutStageInfo> stages = determineKnockoutStages(teamCount);
        // Map to store matches by stage type for linking losers later
        Map<TournamentStageType, List<Match>> matchesByStageType = new HashMap<>();

        int stageOrder = 1;
        int currentTeamCount = teamCount;
        List<Team> currentRoundTeams = new ArrayList<>(teams);

        List<Match> previousRoundMatches = new ArrayList<>();

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

            List<Match> currentRoundMatches = new ArrayList<>();

            // Generate matches for this knockout round
            int matchesInRound = currentTeamCount / 2;
            for (int i = 0; i < matchesInRound; i++) {
                Team homeTeam = (currentRoundTeams.size() > i * 2) ? currentRoundTeams.get(i * 2) : null;
                Team awayTeam = (currentRoundTeams.size() > i * 2 + 1) ? currentRoundTeams.get(i * 2 + 1) : null;

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

                match = matchRepository.save(match);
                currentRoundMatches.add(match);
            }

            matchesByStageType.put(stageInfo.type, currentRoundMatches);

            // Link previous round to this round (Winners)
            if (!previousRoundMatches.isEmpty()) {
                linkRounds(previousRoundMatches, currentRoundMatches);
            }

            previousRoundMatches = currentRoundMatches;
            currentTeamCount = matchesInRound;

            // Clear current teams for next round (they will be winners, unknown now)
            currentRoundTeams.clear();
            // We only need teams for first round, subsequent rounds depend on links.
            // Logic above (for home/awayTeam) works because currentRoundTeams for
            // subsequent rounds should be empty/null,
            // but the loop uses `i*2` which might be out of bounds if list is empty.
            // Fixed above: checking size.
        }

        // Generate and Link Placement Stages if requested
        if (includePlacement) {
            generateAndLinkPlacementMatches(tournament, matchesByStageType, stageOrder);
        }
    }

    private void generateAndLinkPlacementMatches(Tournament tournament,
            Map<TournamentStageType, List<Match>> mainBracketMatches, int startDisplayOrder) {
        int nextDisplayOrder = startDisplayOrder;

        // 1. Link Losers of Semi-Finals to 3rd Place Playoff
        if (mainBracketMatches.containsKey(TournamentStageType.SEMI_FINAL)) {
            List<Match> semiFinals = mainBracketMatches.get(TournamentStageType.SEMI_FINAL);
            if (semiFinals.size() == 2) {
                TournamentStage thirdPlaceStage = createStage(tournament, "3rd Place Playoff",
                        TournamentStageType.THIRD_PLACE, nextDisplayOrder++);
                List<Match> thirdPlaceMatches = createMatches(tournament, thirdPlaceStage, 1, "3rd");

                linkLosers(semiFinals, thirdPlaceMatches);
            }
        }

        // 2. Link Losers of Quarter-Finals to Plate (5th-8th)
        if (mainBracketMatches.containsKey(TournamentStageType.QUARTER_FINAL)) {
            List<Match> quarterFinals = mainBracketMatches.get(TournamentStageType.QUARTER_FINAL);
            if (quarterFinals.size() == 4) {
                // Plate Semi Finals
                TournamentStage plateSemiStage = createStage(tournament, "Plate Semi Finals", TournamentStageType.PLATE,
                        nextDisplayOrder++);
                List<Match> plateSemis = createMatches(tournament, plateSemiStage, 2, "PSF");

                linkLosers(quarterFinals, plateSemis);

                // Plate Final (5th Place)
                TournamentStage plateFinalStage = createStage(tournament, "Plate Final (5th Place)",
                        TournamentStageType.PLATE, nextDisplayOrder++);
                List<Match> plateFinal = createMatches(tournament, plateFinalStage, 1, "PF");

                linkRounds(plateSemis, plateFinal); // Winners of Plate Semis go to Plate Final

                // Optional: 7th Place (Losers of Plate Semis)
                // Determine if we want 7th place? Usually yes for full ranking.
                TournamentStage seventhPlaceStage = createStage(tournament, "7th Place Playoff",
                        TournamentStageType.CLASSIFICATION, nextDisplayOrder++);
                List<Match> seventhPlaceMatch = createMatches(tournament, seventhPlaceStage, 1, "7th");

                linkLosers(plateSemis, seventhPlaceMatch);
            }
        }

        // Note: Can extend for Round of 16 (Bowl) if needed, but usually R16 uses the
        // specific rugby generator.
        // This covers standard 4 and 8 team knockouts.
    }

    @SuppressWarnings("null")
    private TournamentStage createStage(Tournament tournament, String name, TournamentStageType type,
            int displayOrder) {
        TournamentStage stage = TournamentStage.builder()
                .tournament(tournament)
                .name(name)
                .stageType(type)
                .displayOrder(displayOrder)
                .isGroupStage(false)
                .isKnockoutStage(true)
                .build();
        return stageRepository.save(stage);
    }

    @SuppressWarnings("null")
    private List<Match> createMatches(Tournament tournament, TournamentStage stage, int count, String abbr) {
        List<Match> matches = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            Match match = Match.builder()
                    .tournament(tournament)
                    .stage(stage)
                    .matchDate(tournament.getEndDate())
                    .kickOffTime(LocalTime.of(12, 0))
                    .venue(tournament.getVenue())
                    .status(MatchStatus.SCHEDULED)
                    .phase(stage.getName())
                    .matchCode(String.format("%s-M%d", abbr, i + 1))
                    .homeTeamPlaceholder("TBD")
                    .awayTeamPlaceholder("TBD")
                    .build();
            match = matchRepository.save(match);
            matches.add(match);
        }
        return matches;
    }

    private void linkLosers(List<Match> sourceMatches, List<Match> targetMatches) {
        for (int i = 0; i < sourceMatches.size(); i++) {
            Match source = sourceMatches.get(i);
            int targetIndex = i / 2;

            if (targetIndex < targetMatches.size()) {
                Match target = targetMatches.get(targetIndex);
                source.setNextMatchIdForLoser(target.getId());
                source.setLoserSlot((i % 2 == 0) ? "HOME" : "AWAY");

                // Set placeholder on target
                String placeholder = "Loser " + source.getMatchCode();
                if (i % 2 == 0) {
                    target.setHomeTeamPlaceholder(placeholder);
                } else {
                    target.setAwayTeamPlaceholder(placeholder);
                }
                matchRepository.save(target);
                matchRepository.save(source);
            }
        }
    }

    private void generateRugby16Bracket(Tournament tournament, List<Team> teams) {
        log.info("Generating Rugby 16-team cascading bracket (Cup, Plate, Bowl, Shield, Spoon, Fork)");

        int nextDisplayOrder = 1;

        // Maps to hold stages and their matches by a unique key (stage name)
        Map<String, TournamentStage> stagesMap = new HashMap<>();
        Map<String, List<Match>> matchesMap = new HashMap<>();

        // 1. Create Stages and Matches
        // Helper to create and store stage and its matches
        createAndStoreStage(tournament, "Round of 16", TournamentStageType.ROUND_OF_16, nextDisplayOrder++, 8,
                stagesMap, matchesMap);

        // Cup Path
        createAndStoreStage(tournament, "Cup Quarter Finals", TournamentStageType.QUARTER_FINAL, nextDisplayOrder++, 4,
                stagesMap, matchesMap);
        createAndStoreStage(tournament, "Cup Semi Finals", TournamentStageType.SEMI_FINAL, nextDisplayOrder++, 2,
                stagesMap, matchesMap);
        createAndStoreStage(tournament, "Cup Final", TournamentStageType.FINAL, nextDisplayOrder++, 1, stagesMap,
                matchesMap);
        createAndStoreStage(tournament, "3rd Place Playoff", TournamentStageType.THIRD_PLACE, nextDisplayOrder++, 1,
                stagesMap, matchesMap);

        // Bowl Path (Losers of R16)
        createAndStoreStage(tournament, "Bowl Quarter Finals", TournamentStageType.BOWL, nextDisplayOrder++, 4,
                stagesMap, matchesMap);
        createAndStoreStage(tournament, "Bowl Semi Finals", TournamentStageType.BOWL, nextDisplayOrder++, 2, stagesMap,
                matchesMap);
        createAndStoreStage(tournament, "Bowl Final (9th Place)", TournamentStageType.BOWL, nextDisplayOrder++, 1,
                stagesMap, matchesMap);
        createAndStoreStage(tournament, "Fork Final (11th Place)", TournamentStageType.FORK, nextDisplayOrder++, 1,
                stagesMap, matchesMap);

        // Plate Path (Losers of Cup QF)
        createAndStoreStage(tournament, "Plate Semi Finals", TournamentStageType.PLATE, nextDisplayOrder++, 2,
                stagesMap, matchesMap);
        createAndStoreStage(tournament, "Plate Final (5th Place)", TournamentStageType.PLATE, nextDisplayOrder++, 1,
                stagesMap, matchesMap);
        createAndStoreStage(tournament, "7th Place Playoff", TournamentStageType.FORK, nextDisplayOrder++, 1, stagesMap,
                matchesMap);

        // Shield Path (Losers of Bowl QF)
        createAndStoreStage(tournament, "Shield Semi Finals", TournamentStageType.SHIELD, nextDisplayOrder++, 2,
                stagesMap, matchesMap);
        createAndStoreStage(tournament, "Shield Final (13th Place)", TournamentStageType.SHIELD, nextDisplayOrder++, 1,
                stagesMap, matchesMap);
        createAndStoreStage(tournament, "Spoon Final (15th Place)", TournamentStageType.SPOON, nextDisplayOrder++, 1,
                stagesMap, matchesMap);

        // 2. Assign Teams to R16 Matches
        List<Match> r16Matches = matchesMap.get("Round of 16");
        for (int i = 0; i < 8; i++) {
            if (i * 2 + 1 < teams.size()) {
                Match match = r16Matches.get(i);
                match.setHomeTeam(teams.get(i * 2));
                match.setAwayTeam(teams.get(i * 2 + 1));
                matchRepository.save(match);
            }
        }

        // 3. Link Stages (Using in-memory lists)
        // Link R16 -> Cup QF (Winners) & Bowl QF (Losers)
        linkComplexRound(matchesMap.get("Round of 16"), matchesMap.get("Cup Quarter Finals"),
                matchesMap.get("Bowl Quarter Finals"));

        // Link Cup QF -> Cup SF (Winners) & Plate SF (Losers)
        linkComplexRound(matchesMap.get("Cup Quarter Finals"), matchesMap.get("Cup Semi Finals"),
                matchesMap.get("Plate Semi Finals"));

        // Link Bowl QF -> Bowl SF (Winners) & Shield SF (Losers)
        linkComplexRound(matchesMap.get("Bowl Quarter Finals"), matchesMap.get("Bowl Semi Finals"),
                matchesMap.get("Shield Semi Finals"));

        // Link Cup SF -> Cup Final (Winners) & 3rd Place (Losers)
        linkComplexRound(matchesMap.get("Cup Semi Finals"), matchesMap.get("Cup Final"),
                matchesMap.get("3rd Place Playoff"));

        // Link Plate SF -> Plate Final (Winners) & 7th Place (Losers)
        linkComplexRound(matchesMap.get("Plate Semi Finals"), matchesMap.get("Plate Final (5th Place)"),
                matchesMap.get("7th Place Playoff"));

        // Link Bowl SF -> Bowl Final (Winners) & Fork Final (Losers - 11th)
        linkComplexRound(matchesMap.get("Bowl Semi Finals"), matchesMap.get("Bowl Final (9th Place)"),
                matchesMap.get("Fork Final (11th Place)"));

        // Link Shield SF -> Shield Final (Winners) & Spoon Final (Losers - 15th)
        linkComplexRound(matchesMap.get("Shield Semi Finals"), matchesMap.get("Shield Final (13th Place)"),
                matchesMap.get("Spoon Final (15th Place)"));
    }

    @SuppressWarnings("null")
    private TournamentStage createAndStoreStage(Tournament tournament, String name, TournamentStageType type, int order,
            int matchCount, Map<String, TournamentStage> stagesMap,
            Map<String, List<Match>> matchesMap) {
        TournamentStage stage = TournamentStage.builder()
                .tournament(tournament)
                .name(name)
                .stageType(type)
                .displayOrder(order)
                .isGroupStage(false)
                .isKnockoutStage(true)
                .build();
        stage = stageRepository.save(stage);
        stagesMap.put(name, stage);

        List<Match> stageMatches = new ArrayList<>();
        for (int i = 0; i < matchCount; i++) {
            Match match = Match.builder()
                    .tournament(tournament)
                    .stage(stage)
                    .matchDate(tournament.getStartDate())
                    .kickOffTime(LocalTime.of(10, 0))
                    .venue(tournament.getVenue())
                    .status(MatchStatus.SCHEDULED)
                    .phase(name)
                    .matchCode(String.format("%s-%s%d", tournament.getSlug(), getStageAbbreviation(type), (i + 1)))
                    .build();
            match = matchRepository.save(match);
            stageMatches.add(match);
        }
        matchesMap.put(name, stageMatches);
        return stage;
    }

    // Legacy helper for abbreviation
    private String getStageAbbreviation(TournamentStageType type) {
        switch (type) {
            case ROUND_OF_16:
                return "R16";
            case QUARTER_FINAL:
                return "QF";
            case SEMI_FINAL:
                return "SF";
            case FINAL:
                return "F";
            case THIRD_PLACE:
                return "3P";
            case PLATE:
                return "PL";
            case BOWL:
                return "BW";
            case SHIELD:
                return "SH";
            case FORK:
                return "FK";
            case SPOON:
                return "SP";
            default:
                return "M";
        }
    }

    @SuppressWarnings("null")
    private void linkComplexRound(List<Match> sourceMatches, List<Match> winnerMatches, List<Match> loserMatches) {
        if (sourceMatches == null)
            return;

        for (int i = 0; i < sourceMatches.size(); i++) {
            Match source = sourceMatches.get(i);
            int targetIndex = i / 2;

            // Link Winner
            if (winnerMatches != null && targetIndex < winnerMatches.size()) {
                Match target = winnerMatches.get(targetIndex);
                source.setNextMatchIdForWinner(target.getId());
                source.setWinnerSlot((i % 2 == 0) ? "HOME" : "AWAY");

                // Set placeholder on target
                String placeholder = "Winner " + source.getMatchCode();
                if (i % 2 == 0) {
                    target.setHomeTeamPlaceholder(placeholder);
                } else {
                    target.setAwayTeamPlaceholder(placeholder);
                }
                matchRepository.save(target);
            }

            // Link Loser
            if (loserMatches != null && targetIndex < loserMatches.size()) {
                Match target = loserMatches.get(targetIndex);
                source.setNextMatchIdForLoser(target.getId());
                source.setLoserSlot((i % 2 == 0) ? "HOME" : "AWAY");

                // Set placeholder on target
                String placeholder = "Loser " + source.getMatchCode();
                if (i % 2 == 0) {
                    target.setHomeTeamPlaceholder(placeholder);
                } else {
                    target.setAwayTeamPlaceholder(placeholder);
                }
                matchRepository.save(target);
            }
            matchRepository.save(source);
        }
    }

    private void linkRounds(List<Match> previousRoundMatches, List<Match> currentRoundMatches) {
        for (int i = 0; i < previousRoundMatches.size(); i++) {
            Match prevMatch = previousRoundMatches.get(i);
            int targetIndex = i / 2;

            if (targetIndex < currentRoundMatches.size()) {
                Match targetMatch = currentRoundMatches.get(targetIndex);
                prevMatch.setNextMatchIdForWinner(targetMatch.getId());
                prevMatch.setWinnerSlot((i % 2 == 0) ? "HOME" : "AWAY");

                // Set placeholder
                String placeholder = "Winner " + prevMatch.getMatchCode();
                if (i % 2 == 0) {
                    targetMatch.setHomeTeamPlaceholder(placeholder);
                } else {
                    targetMatch.setAwayTeamPlaceholder(placeholder);
                }
                matchRepository.save(targetMatch);
                matchRepository.save(prevMatch);
            }
        }
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

    @SuppressWarnings("null")
    private void generateMixedFormatBracket(Tournament tournament, List<Team> teams, Integer numberOfPools,
            List<String> poolNames) {
        log.info("Generating mixed format bracket with {} pools for {} teams", numberOfPools, teams.size());

        if (numberOfPools == null || numberOfPools < 2) {
            // Dynamic pool calculation: Target ~4 teams per pool, preferring power of 2 for
            // clean knockout
            if (teams.size() >= 12) {
                numberOfPools = 4;
            } else {
                numberOfPools = 2;
            }
            log.info("Auto-calculated numberOfPools: {} for {} teams", numberOfPools, teams.size());
        }

        // Step 1: Generate pool stage (round-robin within pools)
        generateRoundRobinBracket(tournament, teams, numberOfPools, poolNames);

        // Step 2: Create knockout stages for pool winners/runners-up
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
        List<Match> previousRoundMatches = new ArrayList<>();
        Map<TournamentStageType, List<Match>> matchesByStageType = new HashMap<>();

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

            List<Match> currentRoundMatches = new ArrayList<>();
            // Create matches with TBD teams
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

                // Set initial placeholders for first round (Pool qualifiers)
                if (previousRoundMatches.isEmpty()) {
                    match.setHomeTeamPlaceholder("Pool Qualifier");
                    match.setAwayTeamPlaceholder("Pool Qualifier");
                }

                match = matchRepository.save(match);
                currentRoundMatches.add(match);
            }

            matchesByStageType.put(stageInfo.type, currentRoundMatches);

            // Link rounds
            if (!previousRoundMatches.isEmpty()) {
                linkRounds(previousRoundMatches, currentRoundMatches);
            }

            previousRoundMatches = currentRoundMatches;
            knockoutTeamCount = matchesInRound;
        }

        // Generate Placements for Mixed Format as well if configured
        if (Boolean.TRUE.equals(tournament.getHasPlacementStages())) {
            generateAndLinkPlacementMatches(tournament, matchesByStageType, nextDisplayOrder);
        }

        log.info("Mixed format bracket generated. Pool winners/runners-up will be assigned via progression logic.");
    }

    @Transactional
    @SuppressWarnings({ "null", "unused" })
    public void progressPoolsToKnockout(UUID tournamentId) {
        log.info("Progressing pool winners to knockout stage for tournament: {}", tournamentId);

        Tournament tournament = tournamentRepository.findById(tournamentId)
                .filter(t -> !Boolean.TRUE.equals(t.getDeleted()))
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
                    new PoolStanding(match.getHomeTeam()));
            standingsMap.putIfAbsent(match.getAwayTeam().getId(),
                    new PoolStanding(match.getAwayTeam()));
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

            homeStanding.pointsFor += match.getHomeScore();
            homeStanding.pointsAgainst += match.getAwayScore();
            awayStanding.pointsFor += match.getAwayScore();
            awayStanding.pointsAgainst += match.getHomeScore();

            if (match.getHomeScore() > match.getAwayScore()) {
                homeStanding.points += 4; // 4 points for win
            } else if (match.getAwayScore() > match.getHomeScore()) {
                awayStanding.points += 4;
            } else {
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
        // Fields for calculation logic only
        int pointsFor = 0;
        int pointsAgainst = 0;
        int points = 0;

        // Although played, wins, draws, losses are calculated, they aren't used for
        // sorting currently
        // Keeping logic simple

        PoolStanding(Team team) {
            this.team = team;
        }

        int getPoints() {
            return points;
        }
    }

    // Mappers
    private MatchResponse mapMatchToResponse(Match match) {
        return MatchResponse.builder()
                .id(match.getId())
                .tournamentId(match.getTournament().getId())
                .homeTeamId(match.getHomeTeam() != null ? match.getHomeTeam().getId() : null)
                .awayTeamId(match.getAwayTeam() != null ? match.getAwayTeam().getId() : null)
                .homeTeamName(match.getHomeTeam() != null ? match.getHomeTeam().getName()
                        : (match.getHomeTeamPlaceholder() != null ? match.getHomeTeamPlaceholder() : "TBD"))
                .awayTeamName(match.getAwayTeam() != null ? match.getAwayTeam().getName()
                        : (match.getAwayTeamPlaceholder() != null ? match.getAwayTeamPlaceholder() : "TBD"))
                .matchDate(match.getMatchDate())
                .kickOffTime(match.getKickOffTime())
                .venue(match.getVenue())
                .status(match.getStatus().name())
                .stage(match.getStage() != null ? MatchResponse.StageInfo.builder()
                        .id(match.getStage().getId().toString())
                        .name(match.getStage().getName())
                        .stageType(match.getStage().getStageType().name())
                        .build() : null)
                .phase(match.getPhase())
                .homeScore(match.getHomeScore())
                .awayScore(match.getAwayScore())
                .matchCode(match.getMatchCode())
                .homeTeamPlaceholder(match.getHomeTeamPlaceholder())
                .awayTeamPlaceholder(match.getAwayTeamPlaceholder())
                .build();
    }

    private TournamentStageResponse mapStageToResponse(TournamentStage stage) {
        return TournamentStageResponse.builder()
                .id(stage.getId())
                .name(stage.getName())
                .stageType(stage.getStageType().name())
                .displayOrder(stage.getDisplayOrder())
                .groupStage(stage.getIsGroupStage() != null ? stage.getIsGroupStage() : false)
                .knockoutStage(stage.getIsKnockoutStage() != null ? stage.getIsKnockoutStage() : false)
                .build();
    }

    private TournamentResponse mapTournamentToResponse(Tournament tournament) {
        return TournamentResponse.builder()
                .id(tournament.getId())
                .name(tournament.getName())
                .slug(tournament.getSlug())
                .level(tournament.getLevel())
                .organiserOrgId(tournament.getOrganiserOrg() != null ? tournament.getOrganiserOrg().getId() : null)
                .startDate(tournament.getStartDate())
                .endDate(tournament.getEndDate())
                .venue(tournament.getVenue())
                .status(tournament.getStatus().name())
                .build();
    }

    // Inner DTO helper
    @lombok.Data
    @lombok.Builder
    public static class KnockoutStageInfo {
        String name;
        TournamentStageType type;
        String abbreviation;

        public KnockoutStageInfo(String name, TournamentStageType type, String abbreviation) {
            this.name = name;
            this.type = type;
            this.abbreviation = abbreviation;
        }
    }
}
