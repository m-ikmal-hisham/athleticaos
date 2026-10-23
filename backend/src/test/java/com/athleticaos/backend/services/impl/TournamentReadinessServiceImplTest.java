package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.tournament.TournamentReadinessIssue;
import com.athleticaos.backend.dtos.tournament.TournamentReadinessResponse;
import com.athleticaos.backend.entities.*;
import com.athleticaos.backend.enums.TournamentStageType;
import com.athleticaos.backend.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TournamentReadinessServiceImplTest {

    @Mock
    private TournamentRepository tournamentRepository;

    @Mock
    private TournamentStageRepository stageRepository;

    @Mock
    private MatchRepository matchRepository;

    @Mock
    private TournamentTeamRepository tournamentTeamRepository;

    @Mock
    private TournamentPlayerRepository tournamentPlayerRepository;

    @InjectMocks
    private TournamentReadinessServiceImpl readinessService;

    private UUID tournamentId;
    private Tournament tournament;
    private TournamentCategory categoryOpen;

    @BeforeEach
    void setUp() {
        tournamentId = UUID.randomUUID();
        categoryOpen = TournamentCategory.builder()
                .id(UUID.randomUUID())
                .name("Men's Open")
                .build();

        TournamentFormatConfig formatConfig = TournamentFormatConfig.builder()
                .category(categoryOpen)
                .startersCount(15)
                .maxBenchCount(10)
                .build();

        tournament = Tournament.builder()
                .id(tournamentId)
                .name("Ready Cup")
                .categories(new ArrayList<>(List.of(categoryOpen)))
                .formatConfigs(new ArrayList<>(List.of(formatConfig)))
                .build();

        when(tournamentRepository.findById(tournamentId)).thenReturn(Optional.of(tournament));
    }

    @Test
    @DisplayName("Check 1: STAGE_WITHOUT_CATEGORY (ERROR) when tournament has categories and stage has none")
    void check1_stageWithoutCategory_reportsError() {
        TournamentStage stageWithoutCat = TournamentStage.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .name("Plate Semis")
                .category(null)
                .stageType(TournamentStageType.SEMI_FINAL)
                .build();

        when(stageRepository.findByTournamentIdOrderByDisplayOrderAsc(tournamentId))
                .thenReturn(List.of(stageWithoutCat));
        when(matchRepository.findByTournamentId(tournamentId)).thenReturn(Collections.emptyList());
        when(tournamentTeamRepository.findByTournamentId(tournamentId)).thenReturn(Collections.emptyList());

        TournamentReadinessResponse res = readinessService.checkReadiness(tournamentId);

        assertThat(res.isOk()).isFalse();
        assertThat(res.getIssues()).anyMatch(i ->
                "STAGE_WITHOUT_CATEGORY".equals(i.getCode()) &&
                "ERROR".equals(i.getSeverity()) &&
                i.getStageId().equals(stageWithoutCat.getId())
        );
    }

    @Test
    @DisplayName("Check 2: SLOT_WILL_NOT_SEED (ERROR) when placeholder cannot match pool positions or position > pool size")
    void check2_slotWillNotSeed_reportsError() {
        TournamentStage poolStage = TournamentStage.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .name("Group A")
                .stageType(TournamentStageType.POOL)
                .category(categoryOpen)
                .build();

        TournamentStage koStage = TournamentStage.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .name("Cup Final")
                .stageType(TournamentStageType.FINAL)
                .category(categoryOpen)
                .build();

        Team team1 = Team.builder().id(UUID.randomUUID()).name("Team 1").build();
        Team team2 = Team.builder().id(UUID.randomUUID()).name("Team 2").build();

        // Pool match with 2 teams -> Group A has size 2
        Match poolMatch = Match.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .stage(poolStage)
                .category(categoryOpen)
                .homeTeam(team1)
                .awayTeam(team2)
                .matchNumber(1)
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(10, 0))
                .build();

        // KO match slot with invalid placeholder "Group A first" (typo)
        Match koMatch = Match.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .stage(koStage)
                .category(categoryOpen)
                .homeTeam(null)
                .homeTeamPlaceholder("Group A first")
                .awayTeam(team1)
                .matchNumber(2)
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(14, 0))
                .build();

        when(stageRepository.findByTournamentIdOrderByDisplayOrderAsc(tournamentId))
                .thenReturn(List.of(poolStage, koStage));
        when(matchRepository.findByTournamentId(tournamentId)).thenReturn(List.of(poolMatch, koMatch));
        when(tournamentTeamRepository.findByTournamentId(tournamentId)).thenReturn(Collections.emptyList());

        TournamentReadinessResponse res = readinessService.checkReadiness(tournamentId);

        assertThat(res.isOk()).isFalse();
        assertThat(res.getIssues()).anyMatch(i ->
                "SLOT_WILL_NOT_SEED".equals(i.getCode()) &&
                "ERROR".equals(i.getSeverity()) &&
                i.getMessage().contains("Group A first")
        );
    }

    @Test
    @DisplayName("Check 3: SLOT_EMPTY (ERROR) when knockout slot has no team, no placeholder, and no incoming link")
    void check3_slotEmpty_reportsError() {
        TournamentStage koStage = TournamentStage.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .name("Final")
                .stageType(TournamentStageType.FINAL)
                .category(categoryOpen)
                .build();

        Match koMatch = Match.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .stage(koStage)
                .category(categoryOpen)
                .homeTeam(null)
                .homeTeamPlaceholder(null) // empty slot
                .awayTeam(Team.builder().id(UUID.randomUUID()).name("Away Team").build())
                .matchNumber(10)
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(15, 0))
                .build();

        when(stageRepository.findByTournamentIdOrderByDisplayOrderAsc(tournamentId)).thenReturn(List.of(koStage));
        when(matchRepository.findByTournamentId(tournamentId)).thenReturn(List.of(koMatch));
        when(tournamentTeamRepository.findByTournamentId(tournamentId)).thenReturn(Collections.emptyList());

        TournamentReadinessResponse res = readinessService.checkReadiness(tournamentId);

        assertThat(res.isOk()).isFalse();
        assertThat(res.getIssues()).anyMatch(i ->
                "SLOT_EMPTY".equals(i.getCode()) &&
                "ERROR".equals(i.getSeverity()) &&
                i.getMatchId().equals(koMatch.getId())
        );
    }

    @Test
    @DisplayName("Check 4: LOSER_WINNER_LINK_DUPLICATE (WARNING) when same result feeds multiple slots or fed by later match")
    void check4_duplicateOrLaterLink_reportsWarning() {
        TournamentStage koStage = TournamentStage.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .name("Knockout")
                .stageType(TournamentStageType.SEMI_FINAL)
                .category(categoryOpen)
                .build();

        UUID feederId = UUID.randomUUID();
        UUID targetMatch1Id = UUID.randomUUID();

        // Match 5 feeds Winner to match 10 HOME
        Match feeder1 = Match.builder()
                .id(feederId)
                .tournament(tournament)
                .stage(koStage)
                .category(categoryOpen)
                .matchNumber(5)
                .nextMatchIdForWinner(targetMatch1Id)
                .winnerSlot("HOME")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(10, 0))
                .build();

        // Match 6 also feeds Winner to match 10 HOME (duplicate feed to same slot)
        Match feeder2 = Match.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .stage(koStage)
                .category(categoryOpen)
                .matchNumber(6)
                .nextMatchIdForWinner(targetMatch1Id)
                .winnerSlot("HOME")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(11, 0))
                .build();

        Match target1 = Match.builder()
                .id(targetMatch1Id)
                .tournament(tournament)
                .stage(koStage)
                .category(categoryOpen)
                .matchNumber(10)
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(14, 0))
                .build();

        when(stageRepository.findByTournamentIdOrderByDisplayOrderAsc(tournamentId)).thenReturn(List.of(koStage));
        when(matchRepository.findByTournamentId(tournamentId)).thenReturn(List.of(feeder1, feeder2, target1));
        when(tournamentTeamRepository.findByTournamentId(tournamentId)).thenReturn(Collections.emptyList());

        TournamentReadinessResponse res = readinessService.checkReadiness(tournamentId);

        assertThat(res.getIssues()).anyMatch(i ->
                "LOSER_WINNER_LINK_DUPLICATE".equals(i.getCode()) &&
                "WARNING".equals(i.getSeverity())
        );
    }

    @Test
    @DisplayName("Check 5: MATCH_WITHOUT_TIME (WARNING) and MATCH_TIME_CLASH (WARNING)")
    void check5_missingTimeAndClash_reportsWarnings() {
        TournamentStage stage = TournamentStage.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .name("Group A")
                .stageType(TournamentStageType.POOL)
                .category(categoryOpen)
                .build();

        // Match without time
        Match matchNoTime = Match.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .stage(stage)
                .category(categoryOpen)
                .matchNumber(1)
                .matchDate(null)
                .kickOffTime(null)
                .build();

        // Two matches clashing at same pitch and time
        LocalDate today = LocalDate.now();
        LocalTime time = LocalTime.of(10, 0);

        Match matchClash1 = Match.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .stage(stage)
                .category(categoryOpen)
                .matchNumber(2)
                .matchDate(today)
                .kickOffTime(time)
                .pitch("Pitch 1")
                .build();

        Match matchClash2 = Match.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .stage(stage)
                .category(categoryOpen)
                .matchNumber(3)
                .matchDate(today)
                .kickOffTime(time)
                .pitch("Pitch 1")
                .build();

        when(stageRepository.findByTournamentIdOrderByDisplayOrderAsc(tournamentId)).thenReturn(List.of(stage));
        when(matchRepository.findByTournamentId(tournamentId))
                .thenReturn(List.of(matchNoTime, matchClash1, matchClash2));
        when(tournamentTeamRepository.findByTournamentId(tournamentId)).thenReturn(Collections.emptyList());

        TournamentReadinessResponse res = readinessService.checkReadiness(tournamentId);

        assertThat(res.getIssues()).anyMatch(i ->
                "MATCH_WITHOUT_TIME".equals(i.getCode()) &&
                "WARNING".equals(i.getSeverity()) &&
                i.getMatchId().equals(matchNoTime.getId())
        );

        assertThat(res.getIssues()).anyMatch(i ->
                "MATCH_TIME_CLASH".equals(i.getCode()) &&
                "WARNING".equals(i.getSeverity())
        );
    }

    @Test
    @DisplayName("Check 6: FORMAT_CONFIG_MISSING (WARNING) when category has matches but no format config")
    void check6_formatConfigMissing_reportsWarning() {
        TournamentCategory catNoConfig = TournamentCategory.builder()
                .id(UUID.randomUUID())
                .name("Veterans")
                .build();

        // Set tournament without format configs
        tournament.setCategories(List.of(catNoConfig));
        tournament.setFormatConfigs(Collections.emptyList());

        TournamentStage stage = TournamentStage.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .name("Vets Group")
                .stageType(TournamentStageType.POOL)
                .category(catNoConfig)
                .build();

        Match match = Match.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .stage(stage)
                .category(catNoConfig)
                .matchNumber(1)
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(9, 0))
                .build();

        when(stageRepository.findByTournamentIdOrderByDisplayOrderAsc(tournamentId)).thenReturn(List.of(stage));
        when(matchRepository.findByTournamentId(tournamentId)).thenReturn(List.of(match));
        when(tournamentTeamRepository.findByTournamentId(tournamentId)).thenReturn(Collections.emptyList());

        TournamentReadinessResponse res = readinessService.checkReadiness(tournamentId);

        assertThat(res.getIssues()).anyMatch(i ->
                "FORMAT_CONFIG_MISSING".equals(i.getCode()) &&
                "WARNING".equals(i.getSeverity()) &&
                i.getMessage().contains("Veterans")
        );
    }

    @Test
    @DisplayName("Check 7: TEAM_WITHOUT_ROSTER (WARNING) when team in tournament has no registered players")
    void check7_teamWithoutRoster_reportsWarning() {
        Team emptyTeam = Team.builder().id(UUID.randomUUID()).name("Empty RFC").build();
        TournamentTeam tt = TournamentTeam.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .team(emptyTeam)
                .build();

        when(stageRepository.findByTournamentIdOrderByDisplayOrderAsc(tournamentId)).thenReturn(Collections.emptyList());
        when(matchRepository.findByTournamentId(tournamentId)).thenReturn(Collections.emptyList());
        when(tournamentTeamRepository.findByTournamentId(tournamentId)).thenReturn(List.of(tt));
        when(tournamentPlayerRepository.findByTournamentIdAndTeamId(tournamentId, emptyTeam.getId())).thenReturn(Collections.emptyList());

        TournamentReadinessResponse res = readinessService.checkReadiness(tournamentId);

        assertThat(res.getIssues()).anyMatch(i ->
                "TEAM_WITHOUT_ROSTER".equals(i.getCode()) &&
                "WARNING".equals(i.getSeverity()) &&
                i.getMessage().contains("Empty RFC")
        );
    }

    @Test
    @DisplayName("Check 2: Accepts Rank 8 with 8 teams in category, flags Rank 9, resolves Pool A #1, flags Champion")
    void check2_seedSynonyms_validationThresholds() {
        TournamentStage poolStage = TournamentStage.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .name("Pool A")
                .stageType(TournamentStageType.POOL)
                .isGroupStage(true)
                .category(categoryOpen)
                .build();

        List<TournamentTeam> teams = new ArrayList<>();
        for (int i = 1; i <= 8; i++) {
            Team t = Team.builder().id(UUID.randomUUID()).name("Team " + i).build();
            teams.add(TournamentTeam.builder()
                    .id(UUID.randomUUID())
                    .tournament(tournament)
                    .team(t)
                    .category(categoryOpen)
                    .poolNumber("Pool A")
                    .isActive(true)
                    .deleted(false)
                    .build());
        }

        TournamentStage koStage = TournamentStage.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .name("Knockout")
                .stageType(TournamentStageType.QUARTER_FINAL)
                .isKnockoutStage(true)
                .category(categoryOpen)
                .build();

        // Valid: "Rank 8" and "Pool A #1"
        Match matchValid = Match.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .stage(koStage)
                .category(categoryOpen)
                .homeTeamPlaceholder("Rank 8")
                .awayTeamPlaceholder("Pool A #1")
                .matchNumber(1)
                .build();

        // Invalid: "Rank 9" and "Champion"
        Match matchInvalid = Match.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .stage(koStage)
                .category(categoryOpen)
                .homeTeamPlaceholder("Rank 9")
                .awayTeamPlaceholder("Champion")
                .matchNumber(2)
                .build();

        when(stageRepository.findByTournamentIdOrderByDisplayOrderAsc(tournamentId))
                .thenReturn(List.of(poolStage, koStage));
        when(matchRepository.findByTournamentId(tournamentId))
                .thenReturn(List.of(matchValid, matchInvalid));
        when(tournamentTeamRepository.findByTournamentId(tournamentId))
                .thenReturn(teams);

        TournamentReadinessResponse res = readinessService.checkReadiness(tournamentId);

        // "Rank 8" and "Pool A #1" must NOT produce errors
        assertThat(res.getIssues()).noneMatch(i ->
                "SLOT_WILL_NOT_SEED".equals(i.getCode()) && i.getMessage().contains("Rank 8")
        );
        assertThat(res.getIssues()).noneMatch(i ->
                "SLOT_WILL_NOT_SEED".equals(i.getCode()) && i.getMessage().contains("Pool A #1")
        );

        // "Rank 9" and "Champion" MUST produce SLOT_WILL_NOT_SEED errors
        assertThat(res.getIssues()).anyMatch(i ->
                "SLOT_WILL_NOT_SEED".equals(i.getCode()) && i.getMessage().contains("Rank 9")
        );
        assertThat(res.getIssues()).anyMatch(i ->
                "SLOT_WILL_NOT_SEED".equals(i.getCode()) && i.getMessage().contains("Champion")
        );
    }
}
