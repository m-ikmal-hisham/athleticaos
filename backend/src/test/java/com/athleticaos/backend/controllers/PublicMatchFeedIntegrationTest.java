package com.athleticaos.backend.controllers;

import com.athleticaos.backend.config.PublicHttpCache;
import com.athleticaos.backend.entities.*;
import com.athleticaos.backend.enums.MatchResultType;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.enums.TournamentStageType;
import com.athleticaos.backend.enums.TournamentStatus;
import com.athleticaos.backend.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.*;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@Tag("integration")
public class PublicMatchFeedIntegrationTest {

    @Container
    @SuppressWarnings("resource")
    private static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("athleticaos_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
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
    private TournamentStageRepository stageRepository;

    @Autowired
    private TournamentCategoryRepository categoryRepository;

    @Autowired
    private TournamentVenueRepository venueRepository;

    @Autowired
    private MatchRepository matchRepository;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @MockBean
    private Clock clock;

    private static final ZoneId KL_ZONE = ZoneId.of("Asia/Kuala_Lumpur");
    private static final Instant REF_NOON = Instant.parse("2026-10-24T04:00:00Z"); // 12:00 PM KL on 2026-10-24

    private static boolean seeded = false;
    private static UUID t1Id;
    private static UUID t2Id;
    private static UUID draftTournId;
    private static UUID deletedTournId;
    private static UUID mLiveId;
    private static UUID mOngoingId;
    private static UUID mTodayEarlierId;
    private static UUID mTodayLaterId;
    private static UUID mTodayNoTimeId;
    private static UUID mTodayCancelledId;
    private static UUID mResultTodayId;
    private static UUID mResultPastId;
    private static UUID mUpcomingTomorrowId;

    @BeforeEach
    void setUp() {
        setFixedClock(REF_NOON);

        if (seeded) {
            return;
        }

        jdbcTemplate.execute("ALTER TABLE matches ALTER COLUMN kick_off_time DROP NOT NULL");

        // 1. Organiser organisation
        Organisation org = organisationRepository.saveAndFlush(Organisation.builder()
                .name("Feed Test Org")
                .orgType("CLUB")
                .slug("feed-test-org-" + UUID.randomUUID())
                .build());

        // 2. Teams
        Team teamA = teamRepository.saveAndFlush(Team.builder()
                .name("Alpha Warriors")
                .slug("alpha-warriors-" + UUID.randomUUID())
                .shortName("ALF")
                .category("SENIOR")
                .ageGroup("OPEN")
                .organisation(org)
                .build());

        Team teamB = teamRepository.saveAndFlush(Team.builder()
                .name("Beta Titans")
                .slug("beta-titans-" + UUID.randomUUID())
                .shortName("BET")
                .category("SENIOR")
                .ageGroup("OPEN")
                .organisation(org)
                .build());

        // 3. Tournaments
        Tournament t1 = tournamentRepository.saveAndFlush(Tournament.builder()
                .name("Premier Championship 2026")
                .slug("premier-championship-2026-" + UUID.randomUUID())
                .level("NATIONAL")
                .organiserOrg(org)
                .startDate(LocalDate.of(2026, 10, 1))
                .endDate(LocalDate.of(2026, 11, 30))
                .venue("National Stadium")
                .isPublished(true)
                .status(TournamentStatus.PUBLISHED)
                .deleted(false)
                .build());
        t1Id = t1.getId();

        Tournament t2 = tournamentRepository.saveAndFlush(Tournament.builder()
                .name("State Cup 2026")
                .slug("state-cup-2026-" + UUID.randomUUID())
                .level("STATE")
                .organiserOrg(org)
                .startDate(LocalDate.of(2026, 10, 1))
                .endDate(LocalDate.of(2026, 11, 30))
                .venue("Community Arena")
                .isPublished(true)
                .status(TournamentStatus.PUBLISHED)
                .deleted(false)
                .build());
        t2Id = t2.getId();

        Tournament tDraft = tournamentRepository.saveAndFlush(Tournament.builder()
                .name("Draft Tournament")
                .slug("draft-tourn-" + UUID.randomUUID())
                .level("SCHOOL")
                .organiserOrg(org)
                .startDate(LocalDate.of(2026, 10, 1))
                .endDate(LocalDate.of(2026, 11, 30))
                .venue("School Ground")
                .isPublished(false)
                .status(TournamentStatus.DRAFT)
                .deleted(false)
                .build());
        draftTournId = tDraft.getId();

        Tournament tDel = tournamentRepository.saveAndFlush(Tournament.builder()
                .name("Deleted Tournament")
                .slug("deleted-tourn-" + UUID.randomUUID())
                .level("SCHOOL")
                .organiserOrg(org)
                .startDate(LocalDate.of(2026, 10, 1))
                .endDate(LocalDate.of(2026, 11, 30))
                .venue("Park")
                .isPublished(true)
                .status(TournamentStatus.PUBLISHED)
                .deleted(true)
                .build());
        deletedTournId = tDel.getId();

        // 4. Category & Stage
        TournamentCategory cat = categoryRepository.saveAndFlush(TournamentCategory.builder()
                .tournament(t1)
                .name("Men's Open")
                .build());

        TournamentStage stage = stageRepository.saveAndFlush(TournamentStage.builder()
                .tournament(t1)
                .category(cat)
                .name("Group Stage")
                .stageType(TournamentStageType.POOL)
                .displayOrder(1)
                .build());

        TournamentVenue venue = venueRepository.saveAndFlush(TournamentVenue.builder()
                .tournament(t1)
                .name("Pitch 1")
                .build());

        // 5. Matches
        // a) LIVE match in T1
        Match mLive = matchRepository.saveAndFlush(Match.builder()
                .tournament(t1)
                .stage(stage)
                .category(cat)
                .tournamentVenue(venue)
                .homeTeam(teamA)
                .awayTeam(teamB)
                .status(MatchStatus.LIVE)
                .matchDate(LocalDate.of(2026, 10, 24))
                .kickOffTime(LocalTime.of(11, 0))
                .matchCode("M-LIVE-01")
                .matchNumber(1)
                .deleted(false)
                .build());
        mLiveId = mLive.getId();

        // b) ONGOING match in T2
        Match mOngoing = matchRepository.saveAndFlush(Match.builder()
                .tournament(t2)
                .homeTeam(teamA)
                .awayTeam(teamB)
                .status(MatchStatus.ONGOING)
                .matchDate(LocalDate.of(2026, 10, 24))
                .kickOffTime(LocalTime.of(11, 30))
                .matchCode("M-ONGOING-02")
                .matchNumber(2)
                .deleted(false)
                .build());
        mOngoingId = mOngoing.getId();

        // c) TODAY earlier scheduled match (09:00 AM, in the past relative to 12:00 PM) in T1
        Match mTodayEarlier = matchRepository.saveAndFlush(Match.builder()
                .tournament(t1)
                .homeTeam(teamA)
                .awayTeam(teamB)
                .status(MatchStatus.SCHEDULED)
                .matchDate(LocalDate.of(2026, 10, 24))
                .kickOffTime(LocalTime.of(9, 0))
                .matchCode("M-TODAY-03")
                .matchNumber(3)
                .deleted(false)
                .build());
        mTodayEarlierId = mTodayEarlier.getId();

        // d) TODAY later scheduled match (15:00 PM, upcoming today) in T1
        Match mTodayLater = matchRepository.saveAndFlush(Match.builder()
                .tournament(t1)
                .homeTeam(teamA)
                .awayTeam(teamB)
                .status(MatchStatus.SCHEDULED)
                .matchDate(LocalDate.of(2026, 10, 24))
                .kickOffTime(LocalTime.of(15, 0))
                .matchCode("M-TODAY-04")
                .matchNumber(4)
                .deleted(false)
                .build());
        mTodayLaterId = mTodayLater.getId();

        // e) TODAY match with null kickOffTime (upcoming today) in T1
        Match mTodayNoTime = matchRepository.saveAndFlush(Match.builder()
                .tournament(t1)
                .homeTeam(teamA)
                .awayTeam(teamB)
                .status(MatchStatus.SCHEDULED)
                .matchDate(LocalDate.of(2026, 10, 24))
                .kickOffTime(null)
                .matchCode("M-TODAY-05")
                .matchNumber(5)
                .deleted(false)
                .build());
        mTodayNoTimeId = mTodayNoTime.getId();

        // f) TODAY CANCELLED match in T1
        Match mTodayCancelled = matchRepository.saveAndFlush(Match.builder()
                .tournament(t1)
                .homeTeam(teamA)
                .awayTeam(teamB)
                .status(MatchStatus.CANCELLED)
                .matchDate(LocalDate.of(2026, 10, 24))
                .kickOffTime(LocalTime.of(14, 0))
                .matchCode("M-TODAY-06")
                .matchNumber(6)
                .deleted(false)
                .build());
        mTodayCancelledId = mTodayCancelled.getId();

        // g) RESULT today (COMPLETED) in T1
        Match mResultToday = matchRepository.saveAndFlush(Match.builder()
                .tournament(t1)
                .homeTeam(teamA)
                .awayTeam(teamB)
                .status(MatchStatus.COMPLETED)
                .homeScore(22)
                .awayScore(17)
                .matchDate(LocalDate.of(2026, 10, 24))
                .kickOffTime(LocalTime.of(10, 0))
                .matchCode("M-RES-07")
                .matchNumber(7)
                .deleted(false)
                .build());
        mResultTodayId = mResultToday.getId();

        // h) RESULT past (9 days ago, within today-13) in T1
        Match mResultPast = matchRepository.saveAndFlush(Match.builder()
                .tournament(t1)
                .homeTeam(teamA)
                .awayTeam(teamB)
                .status(MatchStatus.COMPLETED)
                .homeScore(10)
                .awayScore(12)
                .matchDate(LocalDate.of(2026, 10, 15))
                .kickOffTime(LocalTime.of(16, 0))
                .matchCode("M-RES-08")
                .matchNumber(8)
                .deleted(false)
                .build());
        mResultPastId = mResultPast.getId();

        // i) RESULT too old (20 days ago, > today-13) in T1
        matchRepository.saveAndFlush(Match.builder()
                .tournament(t1)
                .homeTeam(teamA)
                .awayTeam(teamB)
                .status(MatchStatus.COMPLETED)
                .matchDate(LocalDate.of(2026, 10, 4))
                .kickOffTime(LocalTime.of(16, 0))
                .matchCode("M-RES-OLD")
                .deleted(false)
                .build());

        // j) UPCOMING tomorrow (2026-10-25) in T1
        Match mUpcomingTomorrow = matchRepository.saveAndFlush(Match.builder()
                .tournament(t1)
                .homeTeam(teamA)
                .awayTeam(teamB)
                .status(MatchStatus.SCHEDULED)
                .matchDate(LocalDate.of(2026, 10, 25))
                .kickOffTime(LocalTime.of(10, 0))
                .matchCode("M-UP-10")
                .matchNumber(10)
                .deleted(false)
                .build());
        mUpcomingTomorrowId = mUpcomingTomorrow.getId();

        // k) UPCOMING at day +14 (2026-11-07) in T1
        matchRepository.saveAndFlush(Match.builder()
                .tournament(t1)
                .homeTeam(teamA)
                .awayTeam(teamB)
                .status(MatchStatus.SCHEDULED)
                .matchDate(LocalDate.of(2026, 11, 7))
                .kickOffTime(LocalTime.of(14, 0))
                .matchCode("M-UP-14")
                .deleted(false)
                .build());

        // l) UPCOMING too far (> 14 days, 2026-11-08) in T1
        matchRepository.saveAndFlush(Match.builder()
                .tournament(t1)
                .homeTeam(teamA)
                .awayTeam(teamB)
                .status(MatchStatus.SCHEDULED)
                .matchDate(LocalDate.of(2026, 11, 8))
                .kickOffTime(LocalTime.of(14, 0))
                .matchCode("M-UP-FAR")
                .deleted(false)
                .build());

        // m) BYE match (should be excluded from all public feeds) in T1
        matchRepository.saveAndFlush(Match.builder()
                .tournament(t1)
                .homeTeam(teamA)
                .status(MatchStatus.SCHEDULED)
                .resultType(MatchResultType.BYE)
                .matchDate(LocalDate.of(2026, 10, 24))
                .matchCode("M-BYE")
                .deleted(false)
                .build());

        // n) Deleted match (should be excluded from all public feeds) in T1
        matchRepository.saveAndFlush(Match.builder()
                .tournament(t1)
                .homeTeam(teamA)
                .awayTeam(teamB)
                .status(MatchStatus.SCHEDULED)
                .matchDate(LocalDate.of(2026, 10, 24))
                .matchCode("M-DEL")
                .deleted(true)
                .build());

        // o) Match in draft tournament (should be excluded)
        matchRepository.saveAndFlush(Match.builder()
                .tournament(tDraft)
                .homeTeam(teamA)
                .awayTeam(teamB)
                .status(MatchStatus.LIVE)
                .matchDate(LocalDate.of(2026, 10, 24))
                .matchCode("M-DRAFT-T")
                .deleted(false)
                .build());

        // p) Match in deleted tournament (should be excluded)
        matchRepository.saveAndFlush(Match.builder()
                .tournament(tDel)
                .homeTeam(teamA)
                .awayTeam(teamB)
                .status(MatchStatus.LIVE)
                .matchDate(LocalDate.of(2026, 10, 24))
                .matchCode("M-DEL-T")
                .deleted(false)
                .build());

        // q) Match with placeholder teams
        matchRepository.saveAndFlush(Match.builder()
                .tournament(t1)
                .homeTeamPlaceholder("Winner SF1")
                .awayTeamPlaceholder("Winner SF2")
                .status(MatchStatus.SCHEDULED)
                .matchDate(LocalDate.of(2026, 10, 25))
                .kickOffTime(LocalTime.of(16, 0))
                .matchCode("M-FINAL-PH")
                .deleted(false)
                .build());

        seeded = true;
    }

    private void setFixedClock(Instant instant) {
        when(clock.instant()).thenReturn(instant);
        when(clock.getZone()).thenReturn(KL_ZONE);
        when(clock.withZone(any())).thenReturn(Clock.fixed(instant, KL_ZONE));
    }

    @Test
    @DisplayName("View=live without tournamentId returns LIVE and ONGOING across published active tournaments")
    void liveViewWithoutTournamentId() throws Exception {
        mockMvc.perform(get("/api/public/matches?view=live"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "public, max-age=10, stale-while-revalidate=30"))
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.items[*].id", containsInAnyOrder(mLiveId.toString(), mOngoingId.toString())))
                .andExpect(jsonPath("$.items[*].code", not(hasItem("M-DRAFT-T"))))
                .andExpect(jsonPath("$.items[*].code", not(hasItem("M-DEL-T"))));
    }

    @Test
    @DisplayName("View=live with tournamentId filters to that tournament only")
    void liveViewWithTournamentId() throws Exception {
        mockMvc.perform(get("/api/public/matches?view=live&tournamentId=" + t1Id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].id").value(mLiveId.toString()))
                .andExpect(jsonPath("$.items[0].tournamentId").value(t1Id.toString()));
    }

    @Test
    @DisplayName("View=today without tournamentId returns matches for today excluding CANCELLED and BYE")
    void todayViewWithoutTournamentId() throws Exception {
        mockMvc.perform(get("/api/public/matches?view=today"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", PublicHttpCache.CACHE_CONTROL))
                .andExpect(jsonPath("$.items[*].code", not(hasItem("M-TODAY-06")))) // CANCELLED
                .andExpect(jsonPath("$.items[*].code", not(hasItem("M-BYE"))))      // BYE
                .andExpect(jsonPath("$.items[*].code", not(hasItem("M-DEL"))))      // DELETED
                .andExpect(jsonPath("$.items[*].id", hasItems(
                        mLiveId.toString(),
                        mOngoingId.toString(),
                        mTodayEarlierId.toString(),
                        mTodayLaterId.toString(),
                        mTodayNoTimeId.toString(),
                        mResultTodayId.toString()
                )));
    }

    @Test
    @DisplayName("View=today null kickOffTime sorts last (NULLS LAST)")
    void todayViewNullsLastOrdering() throws Exception {
        mockMvc.perform(get("/api/public/matches?view=today&tournamentId=" + t1Id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[?(@.id == '" + mTodayNoTimeId + "')].matchTime").value(hasItem(nullValue())));
    }

    @Test
    @DisplayName("View=today with tournamentId filters strictly to that tournament")
    void todayViewWithTournamentId() throws Exception {
        mockMvc.perform(get("/api/public/matches?view=today&tournamentId=" + t2Id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].id").value(mOngoingId.toString()));
    }

    @Test
    @DisplayName("View=results without tournamentId returns completed matches in [today-13, today] ordered desc")
    void resultsViewWithoutTournamentId() throws Exception {
        mockMvc.perform(get("/api/public/matches?view=results"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(2)))
                // Most recent (Oct 24) before older (Oct 15)
                .andExpect(jsonPath("$.items[0].id").value(mResultTodayId.toString()))
                .andExpect(jsonPath("$.items[1].id").value(mResultPastId.toString()))
                .andExpect(jsonPath("$.items[*].code", not(hasItem("M-RES-OLD")))); // 20 days old excluded
    }

    @Test
    @DisplayName("View=results with tournamentId filters to tournament")
    void resultsViewWithTournamentId() throws Exception {
        mockMvc.perform(get("/api/public/matches?view=results&tournamentId=" + t2Id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(0)));
    }

    @Test
    @DisplayName("View=upcoming without tournamentId returns scheduled matches within 14 days and >= now time")
    void upcomingViewWithoutTournamentId() throws Exception {
        mockMvc.perform(get("/api/public/matches?view=upcoming"))
                .andExpect(status().isOk())
                // Includes 15:00 today, null time today, and tomorrow
                .andExpect(jsonPath("$.items[*].id", hasItems(
                        mTodayLaterId.toString(),
                        mTodayNoTimeId.toString(),
                        mUpcomingTomorrowId.toString()
                )))
                // Excludes earlier scheduled today (09:00 < 12:00)
                .andExpect(jsonPath("$.items[*].id", not(hasItem(mTodayEarlierId.toString()))))
                // Excludes > 14 days
                .andExpect(jsonPath("$.items[*].code", not(hasItem("M-UP-FAR"))));
    }

    @Test
    @DisplayName("View=upcoming with tournamentId filters to tournament")
    void upcomingViewWithTournamentId() throws Exception {
        mockMvc.perform(get("/api/public/matches?view=upcoming&tournamentId=" + t1Id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].tournamentId", everyItem(equalTo(t1Id.toString()))));
    }

    @Test
    @DisplayName("View=range includes all statuses (including CANCELLED) within from..to")
    void rangeViewIncludesCancelled() throws Exception {
        mockMvc.perform(get("/api/public/matches?view=range&from=2026-10-24&to=2026-10-24"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.counts").doesNotExist()) // counts omitted for range
                .andExpect(jsonPath("$.items[*].id", hasItem(mTodayCancelledId.toString())));
    }

    @Test
    @DisplayName("View=range with tournamentId filter")
    void rangeViewWithTournamentId() throws Exception {
        mockMvc.perform(get("/api/public/matches?view=range&from=2026-10-24&to=2026-10-24&tournamentId=" + t2Id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].id").value(mOngoingId.toString()));
    }

    @Test
    @DisplayName("Day boundary test at 23:59:59 vs 00:00:00 in Asia/Kuala_Lumpur")
    void dayBoundaryTransition() throws Exception {
        // Just before midnight KL on Oct 24: 2026-10-24T23:59:59+08:00 = 2026-10-24T15:59:59Z
        setFixedClock(Instant.parse("2026-10-24T15:59:59Z"));
        mockMvc.perform(get("/api/public/matches?view=today&tournamentId=" + t1Id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].id", hasItem(mTodayLaterId.toString())))
                .andExpect(jsonPath("$.items[*].id", not(hasItem(mUpcomingTomorrowId.toString()))));

        // Exactly midnight KL: 2026-10-25T00:00:00+08:00 = 2026-10-24T16:00:00Z
        setFixedClock(Instant.parse("2026-10-24T16:00:00Z"));
        mockMvc.perform(get("/api/public/matches?view=today&tournamentId=" + t1Id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].id", hasItem(mUpcomingTomorrowId.toString())))
                .andExpect(jsonPath("$.items[*].id", not(hasItem(mTodayLaterId.toString()))));
    }

    @Test
    @DisplayName("Counts respect tournamentId and compute accurate counts across tabs")
    void countsVerification() throws Exception {
        mockMvc.perform(get("/api/public/matches?view=live"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.counts.live").value(2)) // mLive (T1) + mOngoing (T2)
                .andExpect(jsonPath("$.counts.results").value(2))
                .andExpect(jsonPath("$.counts.upcoming").value(greaterThanOrEqualTo(3)));

        mockMvc.perform(get("/api/public/matches?view=live&tournamentId=" + t1Id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.counts.live").value(1)); // only mLive in T1
    }

    @Test
    @DisplayName("Live means today or yesterday: a match left on LIVE for days is not shown or counted as live")
    void staleLiveExcludedYesterdayKept() throws Exception {
        var t1 = tournamentRepository.findById(t1Id).orElseThrow();
        Match stale = matchRepository.saveAndFlush(Match.builder()
                .tournament(t1)
                .homeTeamPlaceholder("Stale Home")
                .awayTeamPlaceholder("Stale Away")
                .status(MatchStatus.LIVE)
                .matchDate(LocalDate.of(2026, 10, 15)) // nine days before the fixed clock
                .kickOffTime(LocalTime.of(15, 0))
                .matchCode("M-STALE-LIVE")
                .deleted(false)
                .build());
        Match lastNight = matchRepository.saveAndFlush(Match.builder()
                .tournament(t1)
                .homeTeamPlaceholder("Night Home")
                .awayTeamPlaceholder("Night Away")
                .status(MatchStatus.LIVE)
                .matchDate(LocalDate.of(2026, 10, 23)) // yesterday: evening match past midnight
                .kickOffTime(LocalTime.of(22, 30))
                .matchCode("M-YESTERDAY-LIVE")
                .deleted(false)
                .build());
        try {
            mockMvc.perform(get("/api/public/matches?view=live"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.items[*].code", not(hasItem("M-STALE-LIVE"))))
                    .andExpect(jsonPath("$.items[*].code", hasItem("M-YESTERDAY-LIVE")))
                    .andExpect(jsonPath("$.counts.live").value(3)); // mLive + mOngoing + last night

            mockMvc.perform(get("/api/public/matches/days?from=2026-10-15&to=2026-10-15"))
                    .andExpect(status().isOk())
                    // the seed data already has a match on 15 Oct; what matters is that none counts as live
                    .andExpect(jsonPath("$[0].total").value(greaterThanOrEqualTo(1)))
                    .andExpect(jsonPath("$[0].live").value(0));
        } finally {
            matchRepository.delete(stale);
            matchRepository.delete(lastNight);
            matchRepository.flush();
        }
    }

    @Test
    @DisplayName("Paging and size clamping: clamp size 1..50, default 20")
    void pagingAndClamping() throws Exception {
        // size=0 clamps to 1
        mockMvc.perform(get("/api/public/matches?view=today&page=0&size=0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(1))
                .andExpect(jsonPath("$.items", hasSize(1)));

        // size=100 clamps to 50
        mockMvc.perform(get("/api/public/matches?view=today&page=0&size=100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(50));
    }

    @Test
    @DisplayName("Placeholder teams map to fallback name and null slugs in feed")
    void placeholderTeamsMapping() throws Exception {
        mockMvc.perform(get("/api/public/matches?view=range&from=2026-10-25&to=2026-10-25&tournamentId=" + t1Id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[?(@.code == 'M-FINAL-PH')].homeTeamName").value(hasItem("Winner SF1")))
                .andExpect(jsonPath("$.items[?(@.code == 'M-FINAL-PH')].awayTeamName").value(hasItem("Winner SF2")))
                .andExpect(jsonPath("$.items[?(@.code == 'M-FINAL-PH')].homeTeamSlug").value(hasItem(nullValue())))
                .andExpect(jsonPath("$.items[?(@.code == 'M-FINAL-PH')].awayTeamSlug").value(hasItem(nullValue())));
    }

    @Test
    @DisplayName("GET /api/public/matches/days groups by date with accurate counts without tournamentId")
    void calendarDaysWithoutTournamentId() throws Exception {
        mockMvc.perform(get("/api/public/matches/days?from=2026-10-24&to=2026-10-25"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", PublicHttpCache.CACHE_CONTROL))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].date").value("2026-10-24"))
                .andExpect(jsonPath("$[0].live").value(2))
                .andExpect(jsonPath("$[0].completed").value(1))
                .andExpect(jsonPath("$[0].cancelled").value(1))
                .andExpect(jsonPath("$[1].date").value("2026-10-25"));
    }

    @Test
    @DisplayName("GET /api/public/matches/days groups by date with accurate counts WITH tournamentId")
    void calendarDaysWithTournamentId() throws Exception {
        mockMvc.perform(get("/api/public/matches/days?from=2026-10-24&to=2026-10-25&tournamentId=" + t1Id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].date").value("2026-10-24"))
                .andExpect(jsonPath("$[0].live").value(1)); // only 1 live match in T1
    }
}
