package com.athleticaos.backend.controllers;

import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.entities.TournamentCategory;
import com.athleticaos.backend.entities.TournamentStage;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.enums.TournamentStageType;
import com.athleticaos.backend.enums.TournamentStatus;
import com.athleticaos.backend.repositories.MatchRepository;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.TeamRepository;
import com.athleticaos.backend.repositories.TournamentCategoryRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import com.athleticaos.backend.repositories.TournamentStageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@Tag("integration")
@SuppressWarnings("null")
class TournamentExportIntegrationTest {

    @Container
    @SuppressWarnings("resource")
    private static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("athleticaos_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(org.springframework.test.context.DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.flyway.enabled", () -> "true");
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private OrganisationRepository organisationRepository;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private TournamentRepository tournamentRepository;

    @Autowired
    private TournamentStageRepository tournamentStageRepository;

    @Autowired
    private MatchRepository matchRepository;

    @Autowired
    private TournamentCategoryRepository tournamentCategoryRepository;

    private static boolean seeded = false;
    private static UUID tournamentId;
    private static UUID match1Id;
    private static UUID match2Id;
    private static Organisation sharedOrg;
    private static Team sharedTeamA;
    private static Team sharedTeamB;

    @BeforeEach
    void setUp() {
        if (seeded || organisationRepository.findBySlug("test-export-org").isPresent()) {
            seeded = true;
            return;
        }

        Organisation org = organisationRepository.saveAndFlush(Organisation.builder()
                .name("Test Club Org")
                .slug("test-export-org")
                .orgType("CLUB")
                .build());
        sharedOrg = org;

        Team teamA = teamRepository.saveAndFlush(Team.builder()
                .name("Test Club A")
                .shortName("TCA")
                .slug("test-export-team-a")
                .organisation(org)
                .status("Active")
                .category("SENIOR")
                .ageGroup("OPEN")
                .division("DIV_1")
                .state("SELANGOR")
                .build());
        sharedTeamA = teamA;

        Team teamB = teamRepository.saveAndFlush(Team.builder()
                .name("Test Club B")
                .shortName("TCB")
                .slug("test-export-team-b")
                .organisation(org)
                .status("Active")
                .category("SENIOR")
                .ageGroup("OPEN")
                .division("DIV_1")
                .state("KUALA_LUMPUR")
                .build());
        sharedTeamB = teamB;

        Tournament tournament = tournamentRepository.saveAndFlush(Tournament.builder()
                .name("Test Export Cup")
                .slug("test-export-cup")
                .level("NATIONAL")
                .venue("Stadium A")
                .isPublished(true)
                .status(TournamentStatus.PUBLISHED)
                .organiserOrg(org)
                .startDate(LocalDate.of(2026, 9, 20))
                .endDate(LocalDate.of(2026, 9, 22))
                .build());
        tournamentId = tournament.getId();

        TournamentStage stage = tournamentStageRepository.saveAndFlush(TournamentStage.builder()
                .tournament(tournament)
                .name("Pool Stage")
                .stageType(TournamentStageType.POOL)
                .displayOrder(1)
                .isGroupStage(true)
                .isKnockoutStage(false)
                .build());

        Match match1 = matchRepository.saveAndFlush(Match.builder()
                .tournament(tournament)
                .stage(stage)
                .homeTeam(teamA)
                .awayTeam(teamB)
                .matchCode("EXP-001")
                .matchDate(LocalDate.of(2026, 9, 20))
                .kickOffTime(LocalTime.of(10, 0))
                .status(MatchStatus.SCHEDULED)
                .venue("Pitch 1")
                .deleted(false)
                .homeScore(null)
                .awayScore(null)
                .build());
        match1Id = match1.getId();

        Match match2 = matchRepository.saveAndFlush(Match.builder()
                .tournament(tournament)
                .stage(stage)
                .homeTeam(teamB)
                .awayTeam(teamA)
                .matchCode("EXP-002")
                .matchDate(LocalDate.of(2026, 9, 20))
                .kickOffTime(LocalTime.of(14, 30))
                .status(MatchStatus.COMPLETED)
                .venue("Pitch 2")
                .deleted(false)
                .homeScore(24)
                .awayScore(17)
                .build());
        match2Id = match2.getId();

        seeded = true;
    }

    @Test
    @DisplayName("exportMatches returns 200 with matches CSV without scores")
    @WithMockUser(roles = "PLAYER")
    void exportMatches_ShouldReturnCsv_WhenAuthenticated() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/tournaments/{idOrSlug}/export/matches", tournamentId))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=matches.csv"))
                .andReturn();

        String content = result.getResponse().getContentAsString();
        String[] lines = content.split("\n");
        assertThat(lines).hasSize(3);

        assertThat(lines[0]).isEqualTo("MatchNumber,TournamentName,Category,Stage,HomeTeam,AwayTeam,Date,Time,Venue,Status");

        assertThat(lines[1]).startsWith("EXP-001,");
        assertThat(lines[1]).doesNotContain(match1Id.toString());
        assertThat(lines[1]).contains("Test Export Cup");
        assertThat(lines[1]).contains("Pool Stage");
        assertThat(lines[1]).contains("Test Club A");
        assertThat(lines[1]).contains("Test Club B");
        assertThat(lines[1]).contains("2026-09-20");
        assertThat(lines[1]).contains("10:00");
        assertThat(lines[1]).contains("Pitch 1");
        assertThat(lines[1]).contains("SCHEDULED");
        assertThat(lines[1].split(",", -1)).hasSize(10);

        assertThat(lines[2]).startsWith("EXP-002,");
        assertThat(lines[2]).doesNotContain(match2Id.toString());
        assertThat(lines[2]).contains("Test Export Cup");
        assertThat(lines[2]).contains("Pool Stage");
        assertThat(lines[2]).contains("Test Club B");
        assertThat(lines[2]).contains("Test Club A");
        assertThat(lines[2]).contains("2026-09-20");
        assertThat(lines[2]).contains("14:30");
        assertThat(lines[2]).contains("Pitch 2");
        assertThat(lines[2]).contains("COMPLETED");
        assertThat(lines[2].split(",", -1)).hasSize(10);

        // Assert scores are not present in lines
        assertThat(lines[0]).doesNotContain("HomeScore");
        assertThat(lines[0]).doesNotContain("AwayScore");
    }

    @Test
    @DisplayName("exportResults returns 200 with results CSV including scores")
    @WithMockUser(roles = "PLAYER")
    void exportResults_ShouldReturnCsv_WhenAuthenticated() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/tournaments/{idOrSlug}/export/results", tournamentId))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=results.csv"))
                .andReturn();

        String content = result.getResponse().getContentAsString();
        String[] lines = content.split("\n");
        assertThat(lines).hasSize(3);

        assertThat(lines[0]).isEqualTo("MatchNumber,TournamentName,Category,Stage,HomeTeam,AwayTeam,Date,Time,Venue,Status,HomeScore,AwayScore");

        // Line 1: match1 has null scores
        assertThat(lines[1]).startsWith("EXP-001,");
        assertThat(lines[1]).doesNotContain(match1Id.toString());
        assertThat(lines[1]).contains("Test Export Cup");
        assertThat(lines[1]).contains("Pool Stage");
        assertThat(lines[1]).contains("Test Club A");
        assertThat(lines[1]).contains("Test Club B");
        assertThat(lines[1]).contains("SCHEDULED");
        assertThat(lines[1].split(",", -1)).hasSize(12);

        // Line 2: match2 has scores 24 and 17
        assertThat(lines[2]).startsWith("EXP-002,");
        assertThat(lines[2]).doesNotContain(match2Id.toString());
        assertThat(lines[2]).contains("Test Export Cup");
        assertThat(lines[2]).contains("Pool Stage");
        assertThat(lines[2]).contains("Test Club B");
        assertThat(lines[2]).contains("Test Club A");
        assertThat(lines[2]).contains("COMPLETED");
        assertThat(lines[2]).endsWith("24,17");
        assertThat(lines[2].split(",", -1)).hasSize(12);
    }

    @Test
    @DisplayName("export matches and results with category grouping, match number fallbacks, and exact field count")
    @WithMockUser(roles = "PLAYER")
    void export_ShouldGroupByCategoryAndFallbackMatchNumber_AndHaveMatchingFieldCounts() throws Exception {
        Organisation org = sharedOrg != null ? sharedOrg : organisationRepository.findBySlug("test-export-org").orElseThrow();
        Team teamA = sharedTeamA != null ? sharedTeamA : teamRepository.findBySlug("test-export-team-a").orElseThrow();
        Team teamB = sharedTeamB != null ? sharedTeamB : teamRepository.findBySlug("test-export-team-b").orElseThrow();

        Tournament multiCatTournament = tournamentRepository.saveAndFlush(Tournament.builder()
                .name("Test MultiCat Cup")
                .slug("test-multicat-cup-" + UUID.randomUUID())
                .level("REGIONAL")
                .venue("Complex X")
                .isPublished(true)
                .status(TournamentStatus.PUBLISHED)
                .organiserOrg(org)
                .startDate(LocalDate.of(2026, 10, 1))
                .endDate(LocalDate.of(2026, 10, 2))
                .build());

        TournamentCategory catU16 = tournamentCategoryRepository.saveAndFlush(TournamentCategory.builder()
                .tournament(multiCatTournament)
                .name("U16 Boys")
                .build());

        TournamentCategory catMens = tournamentCategoryRepository.saveAndFlush(TournamentCategory.builder()
                .tournament(multiCatTournament)
                .name("Men's Open")
                .build());

        TournamentStage stage = tournamentStageRepository.saveAndFlush(TournamentStage.builder()
                .tournament(multiCatTournament)
                .name("Group Stage")
                .stageType(TournamentStageType.POOL)
                .displayOrder(1)
                .build());

        TournamentStage stageU16 = tournamentStageRepository.saveAndFlush(TournamentStage.builder()
                .tournament(multiCatTournament)
                .category(catU16)
                .name("U16 Group Stage")
                .stageType(TournamentStageType.POOL)
                .displayOrder(2)
                .build());

        // Match 1: Category "U16 Boys", explicit matchNumber 101
        matchRepository.saveAndFlush(Match.builder()
                .tournament(multiCatTournament)
                .stage(stage)
                .category(catU16)
                .homeTeam(teamA)
                .awayTeam(teamB)
                .matchNumber(101)
                .matchCode("U16-01")
                .matchDate(LocalDate.of(2026, 10, 1))
                .kickOffTime(LocalTime.of(10, 0))
                .status(MatchStatus.SCHEDULED)
                .venue("Field 1")
                .deleted(false)
                .build());

        // Match 2: Category "Men's Open", null matchNumber, fallback to matchCode "MEN-FB"
        matchRepository.saveAndFlush(Match.builder()
                .tournament(multiCatTournament)
                .stage(stage)
                .category(catMens)
                .homeTeam(teamB)
                .awayTeam(teamA)
                .matchNumber(null)
                .matchCode("MEN-FB")
                .matchDate(LocalDate.of(2026, 10, 1))
                .kickOffTime(LocalTime.of(11, 0))
                .status(MatchStatus.SCHEDULED)
                .venue("Field 2")
                .deleted(false)
                .build());

        // Match 3: Category "Men's Open", explicit matchNumber 50, earlier time 09:00
        matchRepository.saveAndFlush(Match.builder()
                .tournament(multiCatTournament)
                .stage(stage)
                .category(catMens)
                .homeTeam(teamA)
                .awayTeam(teamB)
                .matchNumber(50)
                .matchCode("MEN-50")
                .matchDate(LocalDate.of(2026, 10, 1))
                .kickOffTime(LocalTime.of(9, 0))
                .status(MatchStatus.SCHEDULED)
                .venue("Field 2")
                .deleted(false)
                .build());

        // Match 4: No category (null) on match or stage -> falls back to empty string
        matchRepository.saveAndFlush(Match.builder()
                .tournament(multiCatTournament)
                .stage(stage)
                .category(null)
                .homeTeam(teamB)
                .awayTeam(teamA)
                .matchNumber(null)
                .matchCode(null)
                .matchDate(LocalDate.of(2026, 10, 1))
                .kickOffTime(LocalTime.of(12, 0))
                .status(MatchStatus.SCHEDULED)
                .venue("Field 3")
                .deleted(false)
                .build());

        // Match 5: Manually created match with category null, but stage has catU16.
        // It must resolve to "U16 Boys" and sort within the U16 Boys group (kickOff 10:30, after 10:00).
        matchRepository.saveAndFlush(Match.builder()
                .tournament(multiCatTournament)
                .stage(stageU16)
                .category(null)
                .homeTeam(teamA)
                .awayTeam(teamB)
                .matchNumber(102)
                .matchCode("U16-HAND")
                .matchDate(LocalDate.of(2026, 10, 1))
                .kickOffTime(LocalTime.of(10, 30))
                .status(MatchStatus.SCHEDULED)
                .venue("Field 1")
                .deleted(false)
                .build());

        // Verify Matches Export
        MvcResult matchesResult = mockMvc.perform(get("/api/v1/tournaments/{idOrSlug}/export/matches", multiCatTournament.getId()))
                .andExpect(status().isOk())
                .andReturn();

        String matchesContent = matchesResult.getResponse().getContentAsString();
        String[] matchLines = matchesContent.split("\n");
        assertThat(matchLines).hasSize(6); // Header + 5 matches

        // Header: 10 fields
        String[] headerCols = matchLines[0].split(",", -1);
        assertThat(headerCols).hasSize(10);
        assertThat(matchLines[0]).isEqualTo("MatchNumber,TournamentName,Category,Stage,HomeTeam,AwayTeam,Date,Time,Venue,Status");

        // Every row has exactly 10 fields (no trailing comma)
        for (int i = 1; i < matchLines.length; i++) {
            String[] rowCols = matchLines[i].split(",", -1);
            assertThat(rowCols).withFailMessage("Line %d expected 10 columns but got %d: %s", i, rowCols.length, matchLines[i]).hasSize(10);
            assertThat(matchLines[i]).doesNotEndWith(",");
        }

        // Check category grouping and chronological sorting inside category:
        // 1st match: Men's Open (09:00, matchNumber 50)
        String[] row1 = matchLines[1].split(",", -1);
        assertThat(row1[0]).isEqualTo("50");
        assertThat(row1[2]).isEqualTo("Men's Open");
        assertThat(row1[7]).isEqualTo("09:00");

        // 2nd match: Men's Open (11:00, matchNumber null -> fallback to matchCode MEN-FB)
        String[] row2 = matchLines[2].split(",", -1);
        assertThat(row2[0]).isEqualTo("MEN-FB");
        assertThat(row2[2]).isEqualTo("Men's Open");
        assertThat(row2[7]).isEqualTo("11:00");

        // 3rd match: U16 Boys (10:00, matchNumber 101, direct category)
        String[] row3 = matchLines[3].split(",", -1);
        assertThat(row3[0]).isEqualTo("101");
        assertThat(row3[2]).isEqualTo("U16 Boys");
        assertThat(row3[7]).isEqualTo("10:00");

        // 4th match: U16 Boys (10:30, matchNumber 102, category null on match but stage carries U16 Boys)
        String[] row4 = matchLines[4].split(",", -1);
        assertThat(row4[0]).isEqualTo("102");
        assertThat(row4[2]).isEqualTo("U16 Boys");
        assertThat(row4[3]).isEqualTo("U16 Group Stage");
        assertThat(row4[7]).isEqualTo("10:30");

        // 5th match: Uncategorized (empty category last, matchNumber null and matchCode null -> empty string)
        String[] row5 = matchLines[5].split(",", -1);
        assertThat(row5[0]).isEmpty();
        assertThat(row5[2]).isEmpty();

        // Verify Results Export
        MvcResult resultsResult = mockMvc.perform(get("/api/v1/tournaments/{idOrSlug}/export/results", multiCatTournament.getId()))
                .andExpect(status().isOk())
                .andReturn();

        String resultsContent = resultsResult.getResponse().getContentAsString();
        String[] resultLines = resultsContent.split("\n");
        assertThat(resultLines).hasSize(6);

        // Header: 12 fields
        assertThat(resultLines[0].split(",", -1)).hasSize(12);
        assertThat(resultLines[0]).isEqualTo("MatchNumber,TournamentName,Category,Stage,HomeTeam,AwayTeam,Date,Time,Venue,Status,HomeScore,AwayScore");

        // Every row has exactly 12 fields
        for (int i = 1; i < resultLines.length; i++) {
            String[] rowCols = resultLines[i].split(",", -1);
            assertThat(rowCols).withFailMessage("Result line %d expected 12 columns but got %d: %s", i, rowCols.length, resultLines[i]).hasSize(12);
        }
    }
}
