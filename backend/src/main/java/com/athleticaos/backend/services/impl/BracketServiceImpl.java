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
    private final TournamentTeamRepository tournamentTeamRepository;
    private final MatchEventRepository matchEventRepository;
    private final MatchLineupRepository matchLineupRepository;
    private final MatchOfficialRepository matchOfficialRepository;
    private final PlayerSuspensionRepository playerSuspensionRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final EventRepository eventRepository;

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
        List<Team> teams = getTeamsForBracket(tournamentId, request);
        if (teams.isEmpty()) {
            throw new IllegalArgumentException(
                    "No teams provided for bracket generation. Please specify teamIds in the request.");
        }

        // Clear existing bracket if any
        boolean preserveStructure = Boolean.TRUE.equals(request.getUseExistingGroups());
        clearExistingBracket(tournamentId, request.getCategoryId(), !preserveStructure);

        TournamentCategory category = null;
        if (request.getCategoryId() != null) {
            category = tournament.getCategories().stream()
                    .filter(c -> c.getId().equals(request.getCategoryId()))
                    .findFirst()
                    .orElse(null);
        }

        if (request.getCategoryId() == null) {
            // Update tournament format settings (Global)
            tournament.setFormat(request.getFormat());
            tournament.setNumberOfPools(request.getNumberOfPools());
            tournament.setHasPlacementStages(
                    request.getIncludePlacementStages() != null ? request.getIncludePlacementStages() : false);
            tournamentRepository.save(tournament);
        } else {
            // Update category-specific config
            TournamentFormatConfig config = tournament.getFormatConfig(request.getCategoryId());
            if (config != null) {
                config.setFormatType(request.getFormat());
                if (request.getNumberOfPools() != null) config.setPoolCount(request.getNumberOfPools());
                if (request.getIncludePlacementStages() != null) config.setIncludePlacementStages(request.getIncludePlacementStages());
                // Persisted so the Format tab shows the size the brackets were actually built
                // with, rather than resetting to the default when the page reloads.
                if (request.getPlacementBracketSize() != null) config.setPlacementBracketSize(request.getPlacementBracketSize());
                tournamentRepository.save(tournament);
            }
        }

        // Generate bracket based on format
        switch (request.getFormat()) {
            case ROUND_ROBIN:
                generateRoundRobinBracket(tournament, teams, request.getNumberOfPools(), request.getPoolNames(), category);
                break;
            case KNOCKOUT:
                generateKnockoutBracket(tournament, teams, category);
                break;
            case MIXED:
            case POOL_TO_KNOCKOUT:
                generateMixedFormatBracket(tournament, teams, request.getNumberOfPools(), request.getPoolNames(),
                        request, category);
                break;
            default:
                throw new IllegalArgumentException("Unsupported tournament format: " + request.getFormat());
        }

        // Return the generated bracket
        return getBracketForTournament(tournamentId);
    }

    @SuppressWarnings("null")
    private List<Team> getTeamsForBracket(UUID tournamentId, BracketGenerationRequest request) {
        if (request.getTeamIds() == null || request.getTeamIds().isEmpty()) {
            return Collections.emptyList();
        }

        return request.getTeamIds().stream()
                .distinct()
                .map(teamId -> {
                    TournamentTeam entry = tournamentTeamRepository.findByTournamentIdAndTeamId(tournamentId, teamId)
                            .filter(TournamentTeam::isActive)
                            .filter(tt -> !tt.isDeleted())
                            .orElseThrow(() -> new IllegalArgumentException(
                                    "Team is not an active participant in this tournament: " + teamId));
                    if (request.getCategoryId() != null
                            && (entry.getCategory() == null
                                    || !request.getCategoryId().equals(entry.getCategory().getId()))) {
                        throw new IllegalArgumentException(
                                "Team does not belong to the selected tournament category: " + teamId);
                    }
                    return entry.getTeam();
                })
                .collect(Collectors.toList());
    }

    @Transactional

    protected void clearExistingBracket(UUID tournamentId, UUID categoryId) {
        clearExistingBracket(tournamentId, categoryId, true);
    }

    @Transactional
    @SuppressWarnings("null")
    protected void clearExistingBracket(UUID tournamentId, UUID categoryId, boolean clearStructure) {
        log.info("Clearing existing bracket for tournament: {}, category: {} (clearStructure={})", tournamentId,
                categoryId, clearStructure);

        if (categoryId != null) {
            // Find matches for this category to clean up dependencies
            List<Match> matches = matchRepository.findByTournamentId(tournamentId).stream()
                    .filter(m -> m.getStage() != null && m.getStage().getCategory() != null
                            && m.getStage().getCategory().getId().equals(categoryId))
                    .collect(Collectors.toList());

            if (!matches.isEmpty()) {
                // Delete events, lineups, suspensions, and officials for these matches
                for (Match match : matches) {
                    playerSuspensionRepository.deleteByMatchId(match.getId());
                    matchOfficialRepository.deleteByMatchId(match.getId());
                    matchEventRepository.deleteByMatchId(match.getId());
                    matchLineupRepository.deleteByMatchId(match.getId());
                    mediaAssetRepository.deleteByMatchId(match.getId());
                    eventRepository.deleteByLinkedMatchId(match.getId());
                }
            }

            // Break self-references first
            matchRepository.clearNextMatchReferencesForCategory(tournamentId, categoryId);

            // Delete matches for this category
            matchRepository.deleteByTournamentIdAndCategoryId(tournamentId, categoryId);

            if (clearStructure) {
                // Delete stages for this category
                stageRepository.deleteByTournamentIdAndCategoryId(tournamentId, categoryId);
            } else {
                // Preserve Phases enabled: Only delete Knockout stages, keep Pool stages
                List<TournamentStage> stages = stageRepository.findByTournamentIdAndCategoryId(tournamentId,
                        categoryId);
                for (TournamentStage stage : stages) {
                    if (stage.getStageType() != TournamentStageType.POOL) {
                        stageRepository.delete(stage);
                    }
                }
            }
        } else {
            // Delete dependent entities first for ALL matches
            playerSuspensionRepository.deleteByMatch_Tournament_Id(tournamentId);
            matchOfficialRepository.deleteByMatch_Tournament_Id(tournamentId);
            matchEventRepository.deleteByMatch_Tournament_Id(tournamentId);
            matchLineupRepository.deleteByMatch_Tournament_Id(tournamentId);

            // For MediaAsset and Event
            List<UUID> matchIds = matchRepository.findByTournamentId(tournamentId).stream()
                    .map(Match::getId)
                    .collect(Collectors.toList());
            if (!matchIds.isEmpty()) {
                mediaAssetRepository.deleteByMatchIdIn(matchIds);
                eventRepository.deleteByLinkedMatchIdIn(matchIds);
            }

            // Break self-references first
            matchRepository.clearNextMatchReferences(tournamentId);

            // Delete all matches for this tournament
            List<Match> existingMatches = matchRepository.findByTournamentId(tournamentId);
            matchRepository.deleteAll(existingMatches);

            if (clearStructure) {
                // Delete all stages for this tournament
                stageRepository.deleteByTournamentId(tournamentId);
            } else {
                // Preserve Phases enabled: Only delete Knockout stages, keep Pool stages
                List<TournamentStage> stages = stageRepository.findByTournamentIdOrderByDisplayOrderAsc(tournamentId);
                for (TournamentStage stage : stages) {
                    if (stage.getStageType() != TournamentStageType.POOL) {
                        stageRepository.delete(stage);
                    }
                }
            }
        }
    }

    @SuppressWarnings("null")
    private void generateRoundRobinBracket(Tournament tournament, List<Team> teams, Integer numberOfPools,
            List<String> poolNames, TournamentCategory category) {
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
                    .category(category)
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
        // Fetch format config
        UUID categoryId = stage.getCategory() != null ? stage.getCategory().getId() : null;
        TournamentFormatConfig config = tournament.getFormatConfig(categoryId);

        // Timings defaults
        LocalTime startTime = LocalTime.of(9, 0);
        LocalTime endTime = LocalTime.of(17, 0);
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
        if (minutesAvailable <= 0)
            minutesAvailable = 480;

        int matchesPerDay = (int) (minutesAvailable / slotMinutes);
        if (matchesPerDay < 1)
            matchesPerDay = 1;

        // Count existing matches in this stage/tournament to offset timing?
        // Actually, for a fresh generation, we might want a counter passed in, or
        // calculate locally.
        // Assuming localized round robin for now, but really we should coordinate
        // across pools if concurrent.
        // For simplicity, we restart counter for each pool OR we need a global counter
        // if we want strictly sequential across pools.
        // Given existing structure, let's keep it simple: Reset per pool or pass a
        // global counter?
        // Let's use a simple counter for this pool.
        int matchCounter = 0;

        // Generate all possible pairings (each team plays every other team once)
        for (int i = 0; i < teams.size(); i++) {
            for (int j = i + 1; j < teams.size(); j++) {
                Team homeTeam = teams.get(i);
                Team awayTeam = teams.get(j);

                // Calculate timing
                int dayIndex = matchCounter / matchesPerDay;
                int matchInDay = matchCounter % matchesPerDay;

                java.time.LocalDate matchDate = tournament.getStartDate().plusDays(dayIndex);
                LocalTime kickOffTime = startTime.plusMinutes(matchInDay * slotMinutes);

                Match match = Match.builder()
                        .tournament(tournament)
                        .category(stage.getCategory())
                        .stage(stage)
                        .homeTeam(homeTeam)
                        .awayTeam(awayTeam)
                        .matchDate(matchDate)
                        .kickOffTime(kickOffTime)
                        .venue(tournament.getVenue())
                        .status(MatchStatus.SCHEDULED)
                        .phase(truncate(poolName, 50))
                        .matchCode(String.format("%s-%s-M%d", matchCodePrefix(tournament, stage.getCategory(), 20),
                                truncate(poolName.replace(" ", ""), 10),
                                i * teams.size() + j))
                        .matchNumber(nextMatchNumber(tournament))
                        .build();

                matchRepository.save(match);
                matchCounter++;
            }
        }
    }

    private void generateKnockoutBracket(Tournament tournament, List<Team> teams, TournamentCategory category) {
        log.info("Generating knockout bracket for {} teams", teams.size());

        // Generate knockout bracket logic
        if (teams.size() == 16) {
            // Check if we want standard 16 knockout or full rugby 16
            // For now, if 16, assume full Rugby bracket as before (Cup, Plate, etc) which
            // is implicitly placement enabled
            // We could check tournament.getHasPlacementStages() to restrict it, but Rugby16
            // usually implies all.
            generateRugby16Bracket(tournament, teams, category);
        } else {
            // Allow linking of placement stages
            legacyKnockoutGeneration(tournament, teams, isPlacementEnabled(tournament, category), category);
        }
        log.info("Knockout bracket generated.");
    }

    @SuppressWarnings("null")
    private void legacyKnockoutGeneration(Tournament tournament, List<Team> teams, boolean includePlacement, TournamentCategory category) {
        int teamCount = teams.size();
        int drawSize = nextPowerOfTwo(teamCount);

        // Check if team count is power of 2
        if (!isPowerOfTwo(teamCount)) {
            log.warn("Team count {} is not a power of 2. Some teams will receive BYEs.", teamCount);
        }

        // Determine knockout stages needed
        List<KnockoutStageInfo> stages = determineKnockoutStages(drawSize);
        // Map to store matches by stage type for linking losers later
        Map<TournamentStageType, List<Match>> matchesByStageType = new HashMap<>();

        int stageOrder = 1;
        int currentTeamCount = drawSize;
        List<Team> currentRoundTeams = buildOpeningRoundSlots(teams, drawSize);

        List<Match> previousRoundMatches = new ArrayList<>();

        for (KnockoutStageInfo stageInfo : stages) {
            TournamentStage stage = TournamentStage.builder()
                    .tournament(tournament)
                    .category(category)
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
                        .category(stage.getCategory()) // Ensure category is set
                        .stage(stage)
                        .homeTeam(homeTeam)
                        .awayTeam(awayTeam)
                        .matchDate(tournament.getStartDate())
                        .kickOffTime(LocalTime.of(14, 0)) // Default afternoon kick-off
                        .venue(tournament.getVenue())
                        .status(MatchStatus.SCHEDULED)
                        .phase(stageInfo.name)
                        .matchCode(String.format("%s-%s-M%d", matchCodePrefix(tournament, stage.getCategory(), 20),
                                stageInfo.abbreviation, i + 1))
                        .matchNumber(nextMatchNumber(tournament))
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
            generateAndLinkPlacementMatches(tournament, matchesByStageType, stageOrder, category);
        }
    }

    /** Places every bye beside a real team so the bye processor can advance it. */
    static List<Team> buildOpeningRoundSlots(List<Team> teams, int drawSize) {
        List<Team> slots = new ArrayList<>(drawSize);
        int byeCount = drawSize - teams.size();
        int teamIndex = 0;

        for (int matchIndex = 0; matchIndex < drawSize / 2; matchIndex++) {
            slots.add(teams.get(teamIndex++));
            if (matchIndex < byeCount) {
                slots.add(null);
            } else {
                slots.add(teams.get(teamIndex++));
            }
        }
        return slots;
    }

    private void generateAndLinkPlacementMatches(Tournament tournament,
            Map<TournamentStageType, List<Match>> mainBracketMatches, int startDisplayOrder, TournamentCategory category) {
        int nextDisplayOrder = startDisplayOrder;

        // 1. Link Losers of Semi-Finals to 3rd Place Playoff
        if (mainBracketMatches.containsKey(TournamentStageType.SEMI_FINAL)) {
            List<Match> semiFinals = mainBracketMatches.get(TournamentStageType.SEMI_FINAL);
            if (semiFinals.size() == 2) {
                TournamentStage thirdPlaceStage = createStage(tournament, "3rd Place Playoff",
                        TournamentStageType.THIRD_PLACE, nextDisplayOrder++, category);
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
                        nextDisplayOrder++, category);
                List<Match> plateSemis = createMatches(tournament, plateSemiStage, 2, "PSF");

                linkLosers(quarterFinals, plateSemis);

                // Plate Final (5th Place)
                TournamentStage plateFinalStage = createStage(tournament, "Plate Final (5th Place)",
                        TournamentStageType.PLATE, nextDisplayOrder++, category);
                List<Match> plateFinal = createMatches(tournament, plateFinalStage, 1, "PF");

                linkRounds(plateSemis, plateFinal); // Winners of Plate Semis go to Plate Final

                // Optional: 7th Place (Losers of Plate Semis)
                // Determine if we want 7th place? Usually yes for full ranking.
                // Tagged PLATE so it groups with the semis that feed it, mirroring how
                // 3rd place sits inside the Cup bracket.
                TournamentStage seventhPlaceStage = createStage(tournament, "7th Place Playoff",
                        TournamentStageType.PLATE, nextDisplayOrder++, category);
                List<Match> seventhPlaceMatch = createMatches(tournament, seventhPlaceStage, 1, "7th");

                linkLosers(plateSemis, seventhPlaceMatch);
            }
        }

        // Note: Can extend for Round of 16 (Bowl) if needed, but usually R16 uses the
        // specific rugby generator.
        // This covers standard 4 and 8 team knockouts.
    }

    /**
     * The standard rugby placement ladder. Each rung covers four places: its semi-finals feed
     * the rung's final (top two) and its placement playoff (bottom two).
     *
     * Cup is expressed with the SEMI_FINAL/FINAL/THIRD_PLACE stage types rather than a "CUP"
     * type, because the enum has no CUP value — the frontend groups those under Cup by default.
     */
    private static final class LadderRung {
        final String label;
        /** Null for Cup, which uses the generic round types so the frontend groups it under Cup. */
        final TournamentStageType type;
        final String abbr;

        LadderRung(String label, TournamentStageType type, String abbr) {
            this.label = label;
            this.type = type;
            this.abbr = abbr;
        }
    }

    // Every non-Cup rung tags all of its stages with the rung's own type so they group together;
    // the stage name is what distinguishes the rounds within a rung.
    private static final List<LadderRung> PLACEMENT_LADDER = List.of(
            new LadderRung("Cup", null, "CUP"),
            new LadderRung("Plate", TournamentStageType.PLATE, "PLT"),
            new LadderRung("Bowl", TournamentStageType.BOWL, "BWL"),
            new LadderRung("Shield", TournamentStageType.SHIELD, "SHD"),
            new LadderRung("Spoon", TournamentStageType.SPOON, "SPN"),
            new LadderRung("Fork", TournamentStageType.FORK, "FRK"));

    /** Default teams per placement bracket — four places per rung (Cup 1-4, Plate 5-8, ...). */
    private static final int DEFAULT_PLACEMENT_BRACKET_SIZE = 4;

    /**
     * Generates the placement ladder for a pool-based tournament: one self-contained bracket per
     * rung, seeded from the overall standings.
     *
     * {@code bracketSize} sets how many places each rung covers, and therefore its rounds. At the
     * default of 4 a rung is Semi Finals -> Final + placement playoff (Cup 1-4, Plate 5-8, ...);
     * at 8 it gains a quarter-final and each rung covers eight places (Cup 1-8, Plate 9-16, ...).
     * A quarter-final only exists when a rung holds more than four teams — a four-team bracket's
     * first round *is* its semi-final.
     *
     * Note that in rungs larger than four, the teams knocked out before the semi-finals are not
     * ranked any further; they occupy the lower half of the rung's range in no fixed order.
     *
     * Slots are left as seed placeholders rather than resolved teams. Pool results are not known
     * at generation time, and organisers routinely override seeding anyway, so the ladder is
     * created ready for assignment — either automatically once pools complete, or by hand.
     *
     * @return the next free display order after the ladder
     */
    private int generatePlacementLadder(Tournament tournament, int qualifyingTeamCount, int bracketSize,
            int startDisplayOrder, TournamentCategory category) {
        int size = nextPowerOfTwo(Math.max(bracketSize, 2));
        int rungCount = (int) Math.ceil(qualifyingTeamCount / (double) size);
        if (rungCount > PLACEMENT_LADDER.size()) {
            log.warn("{} qualifying teams at {} per bracket exceed the {}-rung ladder; generating {} brackets only.",
                    qualifyingTeamCount, size, PLACEMENT_LADDER.size(), PLACEMENT_LADDER.size());
            rungCount = PLACEMENT_LADDER.size();
        }

        int displayOrder = startDisplayOrder;
        for (int i = 0; i < rungCount; i++) {
            LadderRung rung = PLACEMENT_LADDER.get(i);
            int basePlace = i * size;

            List<Match> previousRound = new ArrayList<>();
            List<Match> semiFinals = new ArrayList<>();
            List<Match> finalMatch = new ArrayList<>();

            for (KnockoutStageInfo round : determineKnockoutStages(size)) {
                boolean isFinal = round.type == TournamentStageType.FINAL;
                String stageName = isFinal
                        ? (i == 0 ? rung.label + " Final"
                                : rung.label + " Final (" + ordinal(basePlace + 1) + " Place)")
                        : rung.label + " " + round.name;
                TournamentStageType stageType = rung.type != null ? rung.type : round.type;

                TournamentStage stage = createStage(tournament, stageName, stageType, displayOrder++, category);
                int matchCount = size / (int) Math.pow(2, determineKnockoutStages(size).indexOf(round) + 1);
                List<Match> matches = createMatches(tournament, stage, Math.max(matchCount, 1),
                        rung.abbr + round.abbreviation);

                if (previousRound.isEmpty()) {
                    applyOpeningRoundSeeds(matches, basePlace, size);
                } else {
                    linkRounds(previousRound, matches);
                }
                if (round.type == TournamentStageType.SEMI_FINAL) {
                    semiFinals = matches;
                }
                if (isFinal) {
                    finalMatch = matches;
                }
                previousRound = matches;
            }

            // Semi losers contest the rung's placement playoff, mirroring 3rd place in the Cup.
            if (semiFinals.size() == 2 && !finalMatch.isEmpty()) {
                String playoffName = ordinal(basePlace + 3) + " Place Playoff";
                TournamentStageType playoffType = rung.type != null ? rung.type
                        : TournamentStageType.THIRD_PLACE;
                TournamentStage playoffStage = createStage(tournament, playoffName, playoffType, displayOrder++,
                        category);
                List<Match> playoffMatches = createMatches(tournament, playoffStage, 1, rung.abbr + "PO");
                linkLosers(semiFinals, playoffMatches);
            }
        }

        log.info("Generated {}-rung placement ladder ({} teams per bracket) for {} qualifying teams.",
                rungCount, size, qualifyingTeamCount);
        return displayOrder;
    }

    /** Standard bracket seeding for the opening round: 1 v last, 2 v second-last, and so on. */
    private void applyOpeningRoundSeeds(List<Match> matches, int basePlace, int size) {
        for (int m = 0; m < matches.size(); m++) {
            applySeedPlaceholders(matches.get(m), basePlace + m + 1, basePlace + size - m);
        }
    }

    private String ordinal(int n) {
        if (n % 100 >= 11 && n % 100 <= 13) {
            return n + "th";
        }
        switch (n % 10) {
            case 1: return n + "st";
            case 2: return n + "nd";
            case 3: return n + "rd";
            default: return n + "th";
        }
    }

    /**
     * Resolves whether placement/consolation brackets are enabled.
     *
     * Generation is normally category-scoped (the Format tab saves "Include Consolation Rounds"
     * per category), in which case the flag lives on that category's TournamentFormatConfig.
     * The tournament-level flag is only set for whole-tournament generation, so it is used as
     * the fallback — reading it alone silently misses the per-category setting.
     */
    /**
     * Teams per placement bracket: the request wins when it names one, otherwise the value
     * saved on the category's format config, otherwise the default of 4. The saved fallback
     * matters for generation paths that do not carry the setting, so a regenerate cannot
     * quietly rebuild an 8-team ladder as a 4-team one.
     */
    private int resolvePlacementBracketSize(Tournament tournament, TournamentCategory category,
            BracketGenerationRequest request) {
        if (request != null && request.getPlacementBracketSize() != null) {
            return request.getPlacementBracketSize();
        }
        if (category != null) {
            TournamentFormatConfig config = tournament.getFormatConfig(category.getId());
            if (config != null && config.getPlacementBracketSize() != null) {
                return config.getPlacementBracketSize();
            }
        }
        return DEFAULT_PLACEMENT_BRACKET_SIZE;
    }

    private boolean isPlacementEnabled(Tournament tournament, TournamentCategory category) {
        if (category != null) {
            TournamentFormatConfig config = tournament.getFormatConfig(category.getId());
            if (config != null && config.getIncludePlacementStages() != null) {
                return config.getIncludePlacementStages();
            }
        }
        return Boolean.TRUE.equals(tournament.getHasPlacementStages());
    }

    private void applySeedPlaceholders(Match match, int homeSeed, int awaySeed) {
        match.setHomeTeamPlaceholder(truncate("Seed " + homeSeed, 50));
        match.setAwayTeamPlaceholder(truncate("Seed " + awaySeed, 50));
        matchRepository.save(match);
    }

    @SuppressWarnings("null")
    private TournamentStage createStage(Tournament tournament, String name, TournamentStageType type,
            int displayOrder, TournamentCategory category) {
        TournamentStage stage = TournamentStage.builder()
                .tournament(tournament)
                .category(category)
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
                    .category(stage.getCategory())
                    .stage(stage)
                    .matchDate(tournament.getEndDate())
                    .kickOffTime(LocalTime.of(12, 0))
                    .venue(tournament.getVenue())
                    .status(MatchStatus.SCHEDULED)
                    .phase(stage.getName())
                    .matchCode(String.format("%s-%s-M%d", matchCodePrefix(tournament, stage.getCategory(), 20), abbr, i + 1))
                    .matchNumber(nextMatchNumber(tournament))
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

    private void generateRugby16Bracket(Tournament tournament, List<Team> teams, TournamentCategory category) {
        // 16 teams fill four placement brackets: Cup 1-4, Plate 5-8, Bowl 9-12, Shield 13-16.
        // Spoon (17-20) and Fork (21-24) only come into play for larger draws.
        log.info("Generating Rugby 16-team cascading bracket (Cup, Plate, Bowl, Shield)");

        int nextDisplayOrder = 1;

        // Maps to hold stages and their matches by a unique key (stage name)
        Map<String, TournamentStage> stagesMap = new HashMap<>();
        Map<String, List<Match>> matchesMap = new HashMap<>();

        // 1. Create Stages and Matches
        // Helper to create and store stage and its matches
        createAndStoreStage(tournament, "Round of 16", TournamentStageType.ROUND_OF_16, nextDisplayOrder++, 8,
                stagesMap, matchesMap, category);

        // Cup Path
        createAndStoreStage(tournament, "Cup Quarter Finals", TournamentStageType.QUARTER_FINAL, nextDisplayOrder++, 4,
                stagesMap, matchesMap, category);
        createAndStoreStage(tournament, "Cup Semi Finals", TournamentStageType.SEMI_FINAL, nextDisplayOrder++, 2,
                stagesMap, matchesMap, category);
        createAndStoreStage(tournament, "Cup Final", TournamentStageType.FINAL, nextDisplayOrder++, 1, stagesMap,
                matchesMap, category);
        createAndStoreStage(tournament, "3rd Place Playoff", TournamentStageType.THIRD_PLACE, nextDisplayOrder++, 1,
                stagesMap, matchesMap, category);

        // Bowl Path (Losers of R16)
        createAndStoreStage(tournament, "Bowl Quarter Finals", TournamentStageType.BOWL, nextDisplayOrder++, 4,
                stagesMap, matchesMap, category);
        createAndStoreStage(tournament, "Bowl Semi Finals", TournamentStageType.BOWL, nextDisplayOrder++, 2, stagesMap,
                matchesMap, category);
        createAndStoreStage(tournament, "Bowl Final (9th Place)", TournamentStageType.BOWL, nextDisplayOrder++, 1,
                stagesMap, matchesMap, category);
        // 11th place is contested by the losers of the Bowl semis, so it belongs to
        // the Bowl bracket (places 9-12), the same relationship 3rd place has to Cup.
        // Not "Fork" — under the standard rugby ladder Fork covers places 21-24.
        createAndStoreStage(tournament, "11th Place Playoff", TournamentStageType.BOWL, nextDisplayOrder++, 1,
                stagesMap, matchesMap, category);

        // Plate Path (Losers of Cup QF)
        createAndStoreStage(tournament, "Plate Semi Finals", TournamentStageType.PLATE, nextDisplayOrder++, 2,
                stagesMap, matchesMap, category);
        createAndStoreStage(tournament, "Plate Final (5th Place)", TournamentStageType.PLATE, nextDisplayOrder++, 1,
                stagesMap, matchesMap, category);
        // 7th place is contested by the losers of the Plate semis, so it belongs to
        // the Plate bracket.
        createAndStoreStage(tournament, "7th Place Playoff", TournamentStageType.PLATE, nextDisplayOrder++, 1, stagesMap,
                matchesMap, category);

        // Shield Path (Losers of Bowl QF)
        createAndStoreStage(tournament, "Shield Semi Finals", TournamentStageType.SHIELD, nextDisplayOrder++, 2,
                stagesMap, matchesMap, category);
        createAndStoreStage(tournament, "Shield Final (13th Place)", TournamentStageType.SHIELD, nextDisplayOrder++, 1,
                stagesMap, matchesMap, category);
        // 15th place is contested by the losers of the Shield semis, so it belongs to
        // the Shield bracket (places 13-16).
        // Not "Spoon" — under the standard rugby ladder Spoon covers places 17-20.
        createAndStoreStage(tournament, "15th Place Playoff", TournamentStageType.SHIELD, nextDisplayOrder++, 1,
                stagesMap, matchesMap, category);

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

        // Link Bowl SF -> Bowl Final (Winners - 9th) & 11th Place Playoff (Losers)
        linkComplexRound(matchesMap.get("Bowl Semi Finals"), matchesMap.get("Bowl Final (9th Place)"),
                matchesMap.get("11th Place Playoff"));

        // Link Shield SF -> Shield Final (Winners - 13th) & 15th Place Playoff (Losers)
        linkComplexRound(matchesMap.get("Shield Semi Finals"), matchesMap.get("Shield Final (13th Place)"),
                matchesMap.get("15th Place Playoff"));
    }

    @SuppressWarnings("null")
    private TournamentStage createAndStoreStage(Tournament tournament, String name, TournamentStageType type, int order,
            int matchCount, Map<String, TournamentStage> stagesMap,
            Map<String, List<Match>> matchesMap, TournamentCategory category) {
        TournamentStage stage = TournamentStage.builder()
                .tournament(tournament)
                .category(category)
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
                    .category(stage.getCategory())
                    .stage(stage)
                    .matchDate(tournament.getStartDate())
                    .kickOffTime(LocalTime.of(10, 0))
                    .venue(tournament.getVenue())
                    .status(MatchStatus.SCHEDULED)
                    .phase(truncate(name, 50))
                    .matchCode(String.format("%s-%s%d", matchCodePrefix(tournament, stage.getCategory(), 30), getStageAbbreviation(type),
                            (i + 1)))
                    .matchNumber(nextMatchNumber(tournament))
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

    /** Smallest power of two greater than or equal to n, with a floor of 2 (a draw needs two slots). */
    static int nextPowerOfTwo(int n) {
        if (n < 1) {
            throw new IllegalArgumentException("A knockout draw needs at least one team");
        }
        if (n > (1 << 20)) {
            throw new IllegalArgumentException("Knockout draw is too large: " + n);
        }
        int result = 2;
        while (result < n) {
            result <<= 1;
        }
        return result;
    }

    /**
     * Builds the ordered list of knockout rounds for a given draw size.
     *
     * Rounds above the quarter-final are included so that a large draw does not collapse
     * into a single oversized "Quarter Finals" round. Round of 32/64 reuse the ROUND_OF_16
     * stage type because the enum has no dedicated value for them; the stage name still
     * distinguishes them, and getRoundWeight() on the frontend orders them by name.
     */
    static List<KnockoutStageInfo> determineKnockoutStages(int teamCount) {
        List<KnockoutStageInfo> stages = new ArrayList<>();

        int drawSize = nextPowerOfTwo(teamCount);
        for (int roundSize = drawSize; roundSize >= 16; roundSize /= 2) {
            stages.add(new KnockoutStageInfo("Round of " + roundSize,
                    TournamentStageType.ROUND_OF_16, "R" + roundSize));
        }
        if (drawSize >= 8) {
            stages.add(new KnockoutStageInfo("Quarter Finals", TournamentStageType.QUARTER_FINAL, "QF"));
        }
        if (drawSize >= 4) {
            stages.add(new KnockoutStageInfo("Semi Finals", TournamentStageType.SEMI_FINAL, "SF"));
        }
        if (drawSize >= 2) {
            stages.add(new KnockoutStageInfo("Final", TournamentStageType.FINAL, "F"));
        }

        return stages;
    }

    @SuppressWarnings("null")
    private void generateMixedFormatBracket(Tournament tournament, List<Team> teams, Integer numberOfPools,
            List<String> poolNames, BracketGenerationRequest request, TournamentCategory category) {
        log.info("Generating mixed format bracket.");

        boolean useExistingGroups = Boolean.TRUE.equals(request.getUseExistingGroups());

        if (useExistingGroups) {
            log.info("Using existing pools/groups for Mixed Format.");
            // We assume pools already exist and are populated.
            // We might need to regenerate matches for them if they were cleared, OR just
            // assume they are fine?
            // "Preserve manual pool assignments" usually means: Don't reshuffle teams. But
            // DO regenerate match schedule?
            // The User Request says: "It doesn't generate the bracket".
            // So we likely need to KEEP the pools (Stage + TournamentTeam links) but
            // potentially regenerate the Matches (if clearSchedule was called).
            // Usually `generateBracketForTournament` calls `clearExistingBracket` first.
            // WE NEED TO CHECK `clearExistingBracket`. If it deletes the stages, we can't
            // preserve them!
            // Wait, logic:
            // 1. If preserve=true, we should probably NOT have called
            // `clearExistingBracket` fully.
            // BUT `generateBracketForTournament` (caller) calls `clearExistingBracket`.
            // We need to fix the caller OR changing `clearExistingBracket` behavior?
            // ACTUALLY: `FormatServiceImpl` handles `useExistingGroups` by calling
            // `generateMatchesForExistingGroups` and RETURNING.
            // We want to enter here instead.
            // If `clearExistingBracket` was called, existing groups are GONE (stages
            // deleted).
            // So we must have skipped `clearExistingBracket` or modified it?
            // Let's assume the caller will be modified to NOT clear stages if
            // preserve=true.

            // Re-fetch existing stages
            List<TournamentStage> existingStages = stageRepository
                    .findByTournamentIdOrderByDisplayOrderAsc(tournament.getId());
            List<TournamentStage> poolStages = existingStages.stream()
                    .filter(s -> s.getStageType() == TournamentStageType.POOL)
                    .filter(s -> category == null
                            ? s.getCategory() == null
                            : s.getCategory() != null && category.getId().equals(s.getCategory().getId()))
                    .collect(Collectors.toList());

            if (poolStages.isEmpty()) {
                // Fallback if no stages found
                log.warn("No existing pools found despite useExistingGroups=true. Falling back to fresh generation.");
                useExistingGroups = false;
            } else {
                numberOfPools = poolStages.size();
                // Regenerate matches for these pools
                for (TournamentStage stage : poolStages) {
                    List<Team> poolTeams = tournamentTeamRepository.findByTournamentId(tournament.getId()).stream()
                            .filter(TournamentTeam::isActive)
                            .filter(tt -> !tt.isDeleted())
                            .filter(tt -> category == null
                                    ? tt.getCategory() == null
                                    : tt.getCategory() != null && category.getId().equals(tt.getCategory().getId()))
                            .filter(tt -> stage.getName().equals(tt.getPoolNumber()))
                            .map(TournamentTeam::getTeam)
                            .collect(Collectors.toList());

                    if (!poolTeams.isEmpty()) {
                        generateRoundRobinMatches(tournament, stage, poolTeams, stage.getName());
                    }
                }
            }
        }

        if (!useExistingGroups) {
            if (numberOfPools == null || numberOfPools < 2) {
                // Dynamic pool calculation
                if (teams.size() >= 12) {
                    numberOfPools = 4;
                } else {
                    numberOfPools = 2;
                }
                log.info("Auto-calculated numberOfPools: {} for {} teams", numberOfPools, teams.size());
            }

            // Step 1: Generate pool stage (round-robin within pools)
            generateRoundRobinBracket(tournament, teams, numberOfPools, poolNames, category);
        }

        // Step 2: Create knockout stages for pool winners/runners-up
        int teamsAdvancingPerPool = 2; // Top 2 from each pool
        int qualifyingTeamCount = numberOfPools * teamsAdvancingPerPool;

        // Round the draw up to a power of two. Halving an odd count each round produces
        // malformed brackets (12 qualifiers would give 6 quarter-finals -> 3 semi-finals -> 1
        // final). Padding to the next power of two keeps every round well-formed; the surplus
        // slots stay empty and act as byes.
        int knockoutTeamCount = nextPowerOfTwo(qualifyingTeamCount);
        if (knockoutTeamCount != qualifyingTeamCount) {
            log.info("{} qualifying teams padded to a {}-slot draw; {} slot(s) will be byes.",
                    qualifyingTeamCount, knockoutTeamCount, knockoutTeamCount - qualifyingTeamCount);
        }

        // Determine knockout stages needed
        List<KnockoutStageInfo> knockoutStages = determineKnockoutStages(knockoutTeamCount);

        // Get current highest display order from pool stages
        List<TournamentStage> existingStages = stageRepository
                .findByTournamentIdOrderByDisplayOrderAsc(tournament.getId());
        int nextDisplayOrder = existingStages.stream()
                .mapToInt(TournamentStage::getDisplayOrder)
                .max()
                .orElse(0) + 1;

        // With placement stages enabled, every team continues into a four-team placement
        // bracket (Cup 1-4, Plate 5-8, ...) rather than only the pool qualifiers playing on.
        // This is the shape that yields more than four brackets for larger draws.
        if (isPlacementEnabled(tournament, category)) {
            generatePlacementLadder(tournament, teams.size(), resolvePlacementBracketSize(tournament, category, request),
                    nextDisplayOrder, category);
            return;
        }

        // Create knockout stages with placeholder teams
        List<Match> previousRoundMatches = new ArrayList<>();
        Map<TournamentStageType, List<Match>> matchesByStageType = new HashMap<>();

        for (KnockoutStageInfo stageInfo : knockoutStages) {
            TournamentStage stage = TournamentStage.builder()
                    .tournament(tournament)
                    .category(category)
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
                        .category(stage.getCategory())
                        .stage(stage)
                        .matchDate(tournament.getStartDate().plusDays(3)) // Schedule after pool stage
                        .kickOffTime(LocalTime.of(14, 0))
                        .venue(tournament.getVenue())
                        .status(MatchStatus.SCHEDULED)
                        .phase(truncate(stageInfo.name, 50))
                        .matchCode(String.format("%s-%s-M%d", matchCodePrefix(tournament, stage.getCategory(), 20),
                                stageInfo.abbreviation, i + 1))
                        .matchNumber(nextMatchNumber(tournament))
                        .build();

                // Set initial placeholders for first round (Pool qualifiers)
                if (previousRoundMatches.isEmpty()) {
                    String[] placeholders = getPoolKnockoutPlaceholders(numberOfPools, i);
                    match.setHomeTeamPlaceholder(truncate(placeholders[0], 50));
                    match.setAwayTeamPlaceholder(truncate(placeholders[1], 50));
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
        if (isPlacementEnabled(tournament, category)) {
            generateAndLinkPlacementMatches(tournament, matchesByStageType, nextDisplayOrder, category);
        }

        log.info("Mixed format bracket generated. Pool winners/runners-up will be assigned via progression logic.");
    }

    @Transactional
    @SuppressWarnings("null")
    public void progressPoolsToKnockout(UUID tournamentId) {
        log.info("Progressing pool winners to knockout stage for tournament: {}", tournamentId);

        Tournament tournament = tournamentRepository.findById(tournamentId)
                .filter(t -> !Boolean.TRUE.equals(t.getDeleted()))
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));

        // Get all pool stages
        List<TournamentStage> poolStages = stageRepository.findByTournamentIdOrderByDisplayOrderAsc(tournamentId)
                .stream()
                .filter(s -> Boolean.TRUE.equals(s.getIsGroupStage()))
                .toList();

        if (poolStages.isEmpty()) {
            log.warn("No pool stages found for tournament {}", tournamentId);
            return;
        }

        // Pools and their brackets belong to a category, so each category is ranked and
        // seeded on its own — pooling every category together would rank teams that never
        // played each other.
        Map<UUID, List<TournamentStage>> poolsByCategory = new LinkedHashMap<>();
        for (TournamentStage stage : poolStages) {
            UUID key = stage.getCategory() != null ? stage.getCategory().getId() : null;
            poolsByCategory.computeIfAbsent(key, k -> new ArrayList<>()).add(stage);
        }

        for (Map.Entry<UUID, List<TournamentStage>> entry : poolsByCategory.entrySet()) {
            List<PoolStanding> ranked = rankTeamsAcrossPools(tournament, entry.getKey(), entry.getValue());
            seedBracketsFromStandings(tournamentId, entry.getKey(), ranked);
        }
    }

    /**
     * Orders every team in a category across its pools: all pool winners first (ranked against
     * each other), then all runners-up, and so on.
     *
     * This ordering is what makes "Seed N" meaningful. Simply concatenating each pool's table —
     * as this previously did — made seed 1 and seed 2 the winner and runner-up of the *same*
     * pool, so the opening round paired teams that had just played each other.
     */
    private List<PoolStanding> rankTeamsAcrossPools(Tournament tournament, UUID categoryId,
            List<TournamentStage> poolStages) {
        // Match the scoring the public standings table uses, so the bracket cannot disagree
        // with the table an organiser is looking at.
        TournamentFormatConfig config = tournament.getFormatConfig(categoryId);
        int pointsWin = config != null && config.getPointsWin() != null ? config.getPointsWin() : 4;
        int pointsDraw = config != null && config.getPointsDraw() != null ? config.getPointsDraw() : 2;
        int pointsLoss = config != null && config.getPointsLoss() != null ? config.getPointsLoss() : 0;

        List<PoolStanding> ranked = new ArrayList<>();
        for (TournamentStage poolStage : poolStages) {
            List<PoolStanding> table = calculatePoolStandings(poolStage, pointsWin, pointsDraw, pointsLoss);
            for (int position = 0; position < table.size(); position++) {
                PoolStanding standing = table.get(position);
                standing.poolPosition = position + 1;
                standing.poolName = poolStage.getName();
                ranked.add(standing);
            }
        }

        ranked.sort(Comparator.comparingInt((PoolStanding s) -> s.poolPosition)
                .thenComparing(s -> s.getPoints(), Comparator.reverseOrder())
                .thenComparing(s -> s.pointsFor - s.pointsAgainst, Comparator.reverseOrder())
                .thenComparing(s -> s.pointsFor, Comparator.reverseOrder()));
        return ranked;
    }

    /**
     * Fills the "Seed N" placeholders left by {@link #generatePlacementLadder} with the team that
     * finished Nth overall, across every bracket in the ladder rather than only the opening stage.
     *
     * Slots that already hold a team are left alone, so a manual assignment is never overwritten.
     */
    private void seedBracketsFromStandings(UUID tournamentId, UUID categoryId, List<PoolStanding> ranked) {
        if (ranked.isEmpty()) {
            return;
        }

        Map<String, Team> teamBySeedLabel = new HashMap<>();
        for (int i = 0; i < ranked.size(); i++) {
            teamBySeedLabel.put("Seed " + (i + 1), ranked.get(i).team);
        }

        // Also resolve slots written as a pool position, e.g. "Pool A1" for the winner of Pool A.
        // These are what an organiser picks when a bracket should take a specific finisher from a
        // specific pool rather than an overall seed. Both the spaced and unspaced spellings are
        // accepted because the generator and the editor have historically produced each.
        for (PoolStanding standing : ranked) {
            if (standing.poolName == null || standing.poolPosition <= 0) {
                continue;
            }
            teamBySeedLabel.put(standing.poolName + standing.poolPosition, standing.team);
            teamBySeedLabel.put(standing.poolName + " " + standing.poolPosition, standing.team);
        }

        List<Match> knockoutMatches = matchRepository.findByTournamentId(tournamentId).stream()
                .filter(m -> m.getStage() != null && Boolean.TRUE.equals(m.getStage().getIsKnockoutStage()))
                .filter(m -> {
                    TournamentCategory stageCategory = m.getStage().getCategory();
                    return categoryId == null
                            ? stageCategory == null
                            : stageCategory != null && categoryId.equals(stageCategory.getId());
                })
                .toList();

        int seededMatches = 0;
        for (Match match : knockoutMatches) {
            boolean changed = false;

            // The seed label has served its purpose once the real team is known; clearing it
            // keeps the slot from showing a stale "Seed 3" beside an assigned team.
            Team home = teamBySeedLabel.get(match.getHomeTeamPlaceholder());
            if (home != null && match.getHomeTeam() == null) {
                match.setHomeTeam(home);
                match.setHomeTeamPlaceholder(null);
                changed = true;
            }
            Team away = teamBySeedLabel.get(match.getAwayTeamPlaceholder());
            if (away != null && match.getAwayTeam() == null) {
                match.setAwayTeam(away);
                match.setAwayTeamPlaceholder(null);
                changed = true;
            }

            if (changed) {
                matchRepository.save(match);
                seededMatches++;
            }
        }

        log.info("Seeded {} ranked team(s) into {} knockout match(es) for category {}.",
                ranked.size(), seededMatches, categoryId);
    }

    /**
     * Builds one pool's table, ordered best-first.
     *
     * Scoring is passed in from the tournament's format config rather than hardcoded. It used to
     * assume 4/2/0 plus a bonus point for any score of 28 or more — a stand-in for the four-try
     * bonus that no configuration controlled. That could rank a pool differently from the public
     * standings table, meaning the bracket and the table disagreed about who had qualified. The
     * fabricated bonus is gone; try counts are not recorded, so it cannot be derived.
     */
    private List<PoolStanding> calculatePoolStandings(TournamentStage poolStage, int pointsWin, int pointsDraw,
            int pointsLoss) {
        List<Match> poolMatches = matchRepository.findByStageId(poolStage.getId());
        Map<UUID, PoolStanding> standingsMap = new HashMap<>();

        // Initialize standings for all teams in pool. Slots can still be unassigned at this
        // point (an unfilled pool, or a bye), so both sides are checked before dereferencing.
        for (Match match : poolMatches) {
            if (match.getHomeTeam() != null) {
                standingsMap.putIfAbsent(match.getHomeTeam().getId(), new PoolStanding(match.getHomeTeam()));
            }
            if (match.getAwayTeam() != null) {
                standingsMap.putIfAbsent(match.getAwayTeam().getId(), new PoolStanding(match.getAwayTeam()));
            }
        }

        // Calculate points from completed matches
        for (Match match : poolMatches) {
            if (match.getStatus() != MatchStatus.COMPLETED ||
                    match.getHomeTeam() == null ||
                    match.getAwayTeam() == null) {
                continue;
            }

            // Walkovers now carry the awarded scoreline, so they flow through the normal path
            // below. This branch only catches ones recorded before that change, which have a
            // winner but no scores.
            if (match.getResultType() == com.athleticaos.backend.enums.MatchResultType.WALKOVER
                    && match.getWinnerTeam() != null
                    && (match.getHomeScore() == null || match.getAwayScore() == null)) {
                PoolStanding winner = standingsMap.get(match.getWinnerTeam().getId());
                UUID loserId = match.getWinnerTeam().getId().equals(match.getHomeTeam().getId())
                        ? match.getAwayTeam().getId()
                        : match.getHomeTeam().getId();
                PoolStanding loser = standingsMap.get(loserId);
                if (winner != null) {
                    winner.points += pointsWin;
                }
                if (loser != null) {
                    loser.points += pointsLoss;
                }
                continue;
            }

            if (match.getHomeScore() == null || match.getAwayScore() == null) {
                continue;
            }

            PoolStanding homeStanding = standingsMap.get(match.getHomeTeam().getId());
            PoolStanding awayStanding = standingsMap.get(match.getAwayTeam().getId());

            homeStanding.pointsFor += match.getHomeScore();
            homeStanding.pointsAgainst += match.getAwayScore();
            awayStanding.pointsFor += match.getAwayScore();
            awayStanding.pointsAgainst += match.getHomeScore();

            if (match.getHomeScore() > match.getAwayScore()) {
                homeStanding.points += pointsWin;
                awayStanding.points += pointsLoss;
            } else if (match.getAwayScore() > match.getHomeScore()) {
                awayStanding.points += pointsWin;
                homeStanding.points += pointsLoss;
            } else {
                homeStanding.points += pointsDraw;
                awayStanding.points += pointsDraw;
            }
        }

        // Sort by points, then point differential — same order as the standings table.
        return standingsMap.values().stream()
                .sorted(Comparator.comparing((PoolStanding s) -> s.getPoints()).reversed()
                        .thenComparing(s -> s.pointsFor - s.pointsAgainst, Comparator.reverseOrder())
                        .thenComparing(s -> s.pointsFor, Comparator.reverseOrder()))
                .toList();
    }

    // Helper class for pool standings
    private static class PoolStanding {
        Team team;
        // Fields for calculation logic only
        int pointsFor = 0;
        int pointsAgainst = 0;
        int points = 0;
        /** Finishing position within this team's own pool, 1-based. Set during cross-pool ranking. */
        int poolPosition = 0;
        /** Name of the pool this team played in, e.g. "Pool A". Used to resolve "Pool A1" slots. */
        String poolName;

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
                        .categoryId(
                                match.getStage().getCategory() != null ? match.getStage().getCategory().getId() : null)
                        .build() : null)
                .phase(match.getPhase())
                .homeScore(match.getHomeScore())
                .awayScore(match.getAwayScore())
                .matchCode(match.getMatchCode())
                .matchNumber(match.getMatchNumber())
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
                .categoryId(stage.getCategory() != null ? stage.getCategory().getId() : null)
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

    private String[] getPoolKnockoutPlaceholders(int numberOfPools, int matchIndex) {
        String[] placeholders = new String[] { "Pool Qualifier", "Pool Qualifier" };

        if (numberOfPools == 2) {
            // 2 Pools: A, B
            // Match 1: Winner A vs Runner-up B
            // Match 2: Winner B vs Runner-up A
            if (matchIndex == 0) {
                placeholders[0] = "Winner Pool A";
                placeholders[1] = "Runner-up Pool B";
            } else if (matchIndex == 1) {
                placeholders[0] = "Winner Pool B";
                placeholders[1] = "Runner-up Pool A";
            }
        } else if (numberOfPools == 4) {
            // 4 Pools: A, B, C, D
            // Standard Seeding for A vs D and B vs C Semis
            // SF1: QF1 vs QF2
            // SF2: QF3 vs QF4
            switch (matchIndex) {
                case 0: // QF1
                    placeholders[0] = "Winner Pool A";
                    placeholders[1] = "Runner-up Pool B";
                    break;
                case 1: // QF2 - Meets QF1 in SF1
                    placeholders[0] = "Winner Pool D";
                    placeholders[1] = "Runner-up Pool C";
                    break;
                case 2: // QF3
                    placeholders[0] = "Winner Pool B";
                    placeholders[1] = "Runner-up Pool A";
                    break;
                case 3: // QF4 - Meets QF3 in SF2
                    placeholders[0] = "Winner Pool C";
                    placeholders[1] = "Runner-up Pool D";
                    break;
            }
        } else {
            int pool1 = (matchIndex * 2) % numberOfPools;
            int pool2 = (matchIndex * 2 + 1) % numberOfPools;
            placeholders[0] = "Winner Pool " + (char) ('A' + pool1);
            placeholders[1] = "Runner-up Pool " + (char) ('A' + pool2);
        }
        return placeholders;
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

    // Helper for DB constraints
    private String truncate(String value, int limit) {
        if (value == null || value.length() <= limit) {
            return value;
        }
        return value.substring(0, limit);
    }

    /**
     * Generates a short abbreviation from a category name for use in match codes.
     * Takes the first letter of each word and strips non-alphanumeric characters,
     * capped at 6 characters. Returns empty string if category is null.
     * Example: "Men's U21 7s - Women" → "MU27W"
     */
    private String categoryAbbr(TournamentCategory category) {
        if (category == null || category.getName() == null || category.getName().isBlank()) {
            return "";
        }
        String[] words = category.getName().split("[\\s\\-_]+");
        StringBuilder sb = new StringBuilder();
        for (String word : words) {
            String cleaned = word.replaceAll("[^a-zA-Z0-9]", "");
            if (!cleaned.isEmpty()) {
                sb.append(Character.toUpperCase(cleaned.charAt(0)));
            }
        }
        String abbr = sb.toString();
        return abbr.length() > 6 ? abbr.substring(0, 6) : abbr;
    }

    /**
     * Builds a match code prefix that includes the tournament slug and, when present,
     * a category abbreviation to ensure uniqueness across categories.
     */
    private String matchCodePrefix(Tournament tournament, TournamentCategory category, int slugLimit) {
        String slug = truncate(tournament.getSlug(), slugLimit);
        String catAbbr = categoryAbbr(category);
        if (catAbbr.isEmpty()) {
            return slug;
        }
        return slug + "-" + catAbbr;
    }

    /** Returns the next sequential match number for the given tournament. */
    private int nextMatchNumber(Tournament tournament) {
        return matchRepository.findMaxMatchNumberByTournamentId(tournament.getId()) + 1;
    }

    @Override
    @Transactional
    @SuppressWarnings("null")
    public BracketViewResponse generateManualKnockoutBracket(UUID tournamentId,
            com.athleticaos.backend.dtos.tournament.ManualBracketCreateRequest request) {
        com.athleticaos.backend.enums.TournamentStageType type = request.getType();
        UUID categoryId = request.getCategoryId();
        // Pad to a power of two so every round is well-formed; surplus slots act as byes.
        int teamCount = nextPowerOfTwo(Math.max(request.getTeamCount(), 2));

        Tournament tournament = tournamentRepository.findById(tournamentId).orElseThrow();

        // Idempotency guard: prevent duplicate bracket creation (defect #4 root cause)
        boolean bracketExists;
        if (categoryId != null) {
            bracketExists = stageRepository.existsByTournamentIdAndStageTypeAndCategoryId(tournamentId, type, categoryId);
        } else {
            bracketExists = stageRepository.existsByTournamentIdAndStageTypeAndCategoryIsNull(tournamentId, type);
        }
        if (bracketExists) {
            throw new IllegalStateException(
                    "A " + type.name() + " bracket already exists for this " +
                    (categoryId != null ? "category" : "tournament") +
                    ". Delete the existing bracket first before creating a new one.");
        }

        TournamentCategory category = null;
        if (categoryId != null) {
            category = tournament.getCategories().stream()
                    .filter(c -> c.getId().equals(categoryId))
                    .findFirst()
                    .orElse(null);
        }

        List<KnockoutStageInfo> stages = determineKnockoutStages(teamCount);
        int displayOrder = 100;
        List<Match> previousRoundMatches = new ArrayList<>();
        List<Match> semiFinalMatches = new ArrayList<>();
        String bracketLabel = (request.getName() != null && !request.getName().isBlank())
                ? request.getName().trim()
                : null;

        for (KnockoutStageInfo stageInfo : stages) {
            String stageName = bracketLabel != null
                    ? bracketLabel + " " + stageInfo.name
                    : formatStageName(type, stageInfo.name);

            TournamentStage stage = TournamentStage.builder()
                    .tournament(tournament)
                    .category(category)
                    .name(stageName)
                    .stageType(type)
                    .displayOrder(displayOrder++)
                    .isGroupStage(false)
                    .isKnockoutStage(true)
                    .build();
            stage = stageRepository.save(stage);

            List<Match> currentRoundMatches = new ArrayList<>();
            int matchesInRound = teamCount / (int) Math.pow(2, stages.indexOf(stageInfo) + 1);
            if (matchesInRound < 1) matchesInRound = 1;
            
            for (int i = 0; i < matchesInRound; i++) {
                Match match = Match.builder()
                        .tournament(tournament)
                        .category(category)
                        .stage(stage)
                        .matchDate(tournament.getStartDate())
                        .kickOffTime(java.time.LocalTime.of(12, 0))
                        .venue(tournament.getVenue())
                        .status(MatchStatus.SCHEDULED)
                        .phase(stageName)
                        .matchCode(String.format("%s-%s-M%d", matchCodePrefix(tournament, category, 20),
                                type.name().substring(0, Math.min(2, type.name().length())) + stageInfo.abbreviation, i + 1))
                        .matchNumber(nextMatchNumber(tournament))
                        .homeTeamPlaceholder("TBD")
                        .awayTeamPlaceholder("TBD")
                        .build();
                match = matchRepository.save(match);
                currentRoundMatches.add(match);
            }
            
            if (!previousRoundMatches.isEmpty()) {
                linkRounds(previousRoundMatches, currentRoundMatches);
            }
            if (stageInfo.type == TournamentStageType.SEMI_FINAL) {
                semiFinalMatches = currentRoundMatches;
            }
            previousRoundMatches = currentRoundMatches;
        }

        // Optional placement playoff for the losers of this bracket's semi-finals, mirroring
        // the Cup bracket's 3rd Place Playoff. Needs exactly two semi-finals to feed it.
        if (Boolean.TRUE.equals(request.getIncludePlacementPlayoff())) {
            if (semiFinalMatches.size() == 2) {
                String playoffName = bracketLabel != null
                        ? bracketLabel + " Placement Playoff"
                        : placementPlayoffNameFor(type);
                TournamentStage playoffStage = createStage(tournament, playoffName, type, displayOrder++, category);
                List<Match> playoffMatches = createMatches(tournament, playoffStage, 1,
                        type.name().substring(0, Math.min(2, type.name().length())) + "PO");
                linkLosers(semiFinalMatches, playoffMatches);
            } else {
                log.warn("Placement playoff requested for a {}-team {} bracket, which has no semi-final round; skipped.",
                        teamCount, type);
            }
        }

        return getBracketForTournament(tournamentId);
    }

    /**
     * Playoff label for a bracket, taken from the standard ladder so a manually added bracket
     * reads the same as a generated one (Plate -> "7th Place Playoff", Bowl -> "11th", ...).
     */
    private String placementPlayoffNameFor(com.athleticaos.backend.enums.TournamentStageType type) {
        for (int i = 0; i < PLACEMENT_LADDER.size(); i++) {
            if (PLACEMENT_LADDER.get(i).type == type) {
                // Derived the same way the generated ladder derives it, so a manually added
                // Plate bracket reads "7th Place Playoff" just like a generated one.
                return ordinal(i * DEFAULT_PLACEMENT_BRACKET_SIZE + 3) + " Place Playoff";
            }
        }
        return "Placement Playoff";
    }
    
    private String formatStageName(com.athleticaos.backend.enums.TournamentStageType bracketType, String phaseName) {
        if (bracketType == com.athleticaos.backend.enums.TournamentStageType.QUARTER_FINAL || bracketType == com.athleticaos.backend.enums.TournamentStageType.SEMI_FINAL || bracketType == com.athleticaos.backend.enums.TournamentStageType.FINAL) {
            return "Cup " + phaseName;
        }
        String typeStr = bracketType.name().substring(0, 1).toUpperCase() + bracketType.name().substring(1).toLowerCase().replace("_", " ");
        return typeStr + " " + phaseName;
    }

    @Override
    @Transactional
    @SuppressWarnings("null")
    public void deleteKnockoutBracket(UUID tournamentId, com.athleticaos.backend.enums.TournamentStageType type, UUID categoryId) {
        List<TournamentStage> stages = stageRepository.findByTournamentIdOrderByDisplayOrderAsc(tournamentId);
        List<TournamentStage> bracketStages = stages.stream()
                .filter(s -> s.getStageType() == type)
                .filter(s -> categoryId == null || (s.getCategory() != null && s.getCategory().getId().equals(categoryId)))
                .collect(Collectors.toList());

        for (TournamentStage stage : bracketStages) {
            List<Match> matches = matchRepository.findByStageId(stage.getId());
            for (Match m : matches) {
                // Clear any incoming references
                clearIncomingMatchReferencesToSlot(m.getId());
            }
            matchRepository.deleteAll(matches);
            stageRepository.delete(stage);
        }
    }

    @SuppressWarnings("null")
    private void clearIncomingMatchReferencesToSlot(UUID deletedMatchId) {
        List<Match> winnerFeeders = matchRepository.findByNextMatchIdForWinnerAndWinnerSlot(deletedMatchId, null);
        for(Match m : winnerFeeders) {
            m.setNextMatchIdForWinner(null);
            m.setWinnerSlot(null);
        }
        matchRepository.saveAll(winnerFeeders);
        
        List<Match> loserFeeders = matchRepository.findByNextMatchIdForLoserAndLoserSlot(deletedMatchId, null);
        for(Match m : loserFeeders) {
            m.setNextMatchIdForLoser(null);
            m.setLoserSlot(null);
        }
        matchRepository.saveAll(loserFeeders);
    }
}
