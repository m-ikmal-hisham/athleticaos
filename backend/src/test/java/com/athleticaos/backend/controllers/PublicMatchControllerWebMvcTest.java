package com.athleticaos.backend.controllers;

import com.athleticaos.backend.config.PublicHttpCache;
import com.athleticaos.backend.dtos.match.MatchResponse;
import com.athleticaos.backend.dtos.public_api.PublicMatchDayResponse;
import com.athleticaos.backend.dtos.public_api.PublicMatchFeedCounts;
import com.athleticaos.backend.dtos.tournament.TournamentResponse;
import com.athleticaos.backend.exceptions.GlobalExceptionHandler;
import com.athleticaos.backend.mappers.PublicMatchMapper;
import com.athleticaos.backend.repositories.*;
import com.athleticaos.backend.security.JwtAuthenticationFilter;
import com.athleticaos.backend.security.SecurityConfig;
import com.athleticaos.backend.services.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {PublicMatchController.class, PublicTournamentController.class})
@Import({SecurityConfig.class, GlobalExceptionHandler.class, PublicMatchMapper.class})
public class PublicMatchControllerWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MatchRepository matchRepository;

    @MockBean
    private Clock clock;

    // PublicTournamentController dependencies
    @MockBean
    private TournamentService tournamentService;

    @MockBean
    private MatchService matchService;

    @MockBean
    private StandingsService standingsService;

    @MockBean
    private TournamentTeamRepository tournamentTeamRepository;

    @MockBean
    private MatchEventRepository matchEventRepository;

    @MockBean
    private OrganisationRepository organisationRepository;

    @MockBean
    private TournamentCategoryService categoryService;

    @MockBean
    private StatisticsService statisticsService;

    @MockBean
    private MatchOfficialRepository matchOfficialRepository;

    @MockBean
    private TournamentStageRepository stageRepository;

    @MockBean
    private MatchLineupService matchLineupService;

    // Security filter dependencies
    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private UserDetailsService userDetailsService;

    private static final ZoneId KL_ZONE = ZoneId.of("Asia/Kuala_Lumpur");
    private static final Instant FIXED_INSTANT = Instant.parse("2026-10-24T04:00:00Z"); // 12:00 PM KL

    @BeforeEach
    void setUp() throws Exception {
        doAnswer(invocation -> {
            jakarta.servlet.FilterChain chain = invocation.getArgument(2);
            chain.doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(jwtAuthenticationFilter).doFilter(any(), any(), any());

        when(clock.instant()).thenReturn(FIXED_INSTANT);
        when(clock.getZone()).thenReturn(KL_ZONE);
        when(clock.withZone(any())).thenReturn(Clock.fixed(FIXED_INSTANT, KL_ZONE));
    }

    @Test
    @DisplayName("GET /api/public/matches missing view parameter returns 400")
    void missingViewReturns400() throws Exception {
        mockMvc.perform(get("/api/public/matches"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid view: must be one of live, today, results, upcoming, range"));
    }

    @Test
    @DisplayName("GET /api/public/matches with unknown view returns 400")
    void unknownViewReturns400() throws Exception {
        mockMvc.perform(get("/api/public/matches?view=nope"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid view: must be one of live, today, results, upcoming, range"));
    }

    @Test
    @DisplayName("GET /api/public/matches with from/to when view is not range returns 400")
    void fromToDisallowedForNonRangeView() throws Exception {
        mockMvc.perform(get("/api/public/matches?view=live&from=2026-10-01"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Parameters 'from' and 'to' are only permitted for range view"));
    }

    @Test
    @DisplayName("GET /api/public/matches with view=range missing from/to returns 400")
    void rangeViewMissingDatesReturns400() throws Exception {
        mockMvc.perform(get("/api/public/matches?view=range"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Parameters 'from' and 'to' are required for range view"));
    }

    @Test
    @DisplayName("GET /api/public/matches with to < from returns 400")
    void rangeViewToBeforeFromReturns400() throws Exception {
        mockMvc.perform(get("/api/public/matches?view=range&from=2026-10-10&to=2026-10-01"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("'to' date must be on or after 'from' date"));
    }

    @Test
    @DisplayName("GET /api/public/matches with span > 62 days returns 400")
    void rangeViewSpanExceeds62DaysReturns400() throws Exception {
        mockMvc.perform(get("/api/public/matches?view=range&from=2026-01-01&to=2026-03-15"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Date range cannot exceed 62 days"));
    }

    @Test
    @DisplayName("GET /api/public/matches?view=live sends 10s max-age Cache-Control header")
    void liveViewCacheControlHeader() throws Exception {
        when(matchRepository.findFeedLive(any(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(matchRepository.countFeed(any(), any(), any(), any(), any(), any()))
                .thenReturn(new PublicMatchFeedCounts(0, 0, 0, 0));

        mockMvc.perform(get("/api/public/matches?view=live"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "public, max-age=10, stale-while-revalidate=30"));
    }

    @Test
    @DisplayName("GET /api/public/matches?view=today sends PublicHttpCache Cache-Control header")
    void todayViewCacheControlHeader() throws Exception {
        when(matchRepository.findFeedToday(any(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(matchRepository.countFeed(any(), any(), any(), any(), any(), any()))
                .thenReturn(new PublicMatchFeedCounts(0, 0, 0, 0));

        mockMvc.perform(get("/api/public/matches?view=today"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", PublicHttpCache.CACHE_CONTROL));
    }

    @Test
    @DisplayName("GET /api/public/matches/days missing from/to returns 400")
    void daysMissingDatesReturns400() throws Exception {
        mockMvc.perform(get("/api/public/matches/days"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Parameters 'from' and 'to' are required"));
    }

    @Test
    @DisplayName("GET /api/public/matches/days with span > 62 days returns 400")
    void daysSpanExceeds62DaysReturns400() throws Exception {
        mockMvc.perform(get("/api/public/matches/days?from=2026-01-01&to=2026-03-15"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Date range cannot exceed 62 days"));
    }

    @Test
    @DisplayName("GET /api/public/matches/days with valid range returns 200 with PublicHttpCache")
    void daysValidRangeReturns200() throws Exception {
        LocalDate date = LocalDate.of(2026, 10, 15);
        when(matchRepository.findMatchDays(any(), eq(date), eq(date), any()))
                .thenReturn(List.of(new PublicMatchDayResponse(date, 5, 1, 3, 1)));

        mockMvc.perform(get("/api/public/matches/days?from=2026-10-15&to=2026-10-15"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", PublicHttpCache.CACHE_CONTROL))
                .andExpect(jsonPath("$[0].date").value("2026-10-15"))
                .andExpect(jsonPath("$[0].total").value(5))
                .andExpect(jsonPath("$[0].live").value(1))
                .andExpect(jsonPath("$[0].completed").value(3))
                .andExpect(jsonPath("$[0].cancelled").value(1));
    }

    @Test
    @DisplayName("Routing: /api/public/matches/days is not shadowed by /api/public/matches/{idOrSlug}")
    void routingCollisionDaysVsDetail() throws Exception {
        LocalDate date = LocalDate.of(2026, 10, 15);
        when(matchRepository.findMatchDays(any(), eq(date), eq(date), any()))
                .thenReturn(List.of(new PublicMatchDayResponse(date, 2, 0, 2, 0)));

        // 1. /matches/days hits PublicMatchController.getDays
        mockMvc.perform(get("/api/public/matches/days?from=2026-10-15&to=2026-10-15"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].date").value("2026-10-15"));

        // 2. /matches/{slug} hits PublicTournamentController.getMatchDetail
        String slug = "cup-final-2026";
        UUID matchId = UUID.randomUUID();
        UUID tournamentId = UUID.randomUUID();

        when(matchService.getMatchByCode(slug)).thenReturn(MatchResponse.builder()
                .id(matchId)
                .tournamentId(tournamentId)
                .matchCode(slug)
                .homeTeamName("Tigers")
                .awayTeamName("Lions")
                .build());
        when(matchService.getMatchById(matchId)).thenReturn(MatchResponse.builder()
                .id(matchId)
                .tournamentId(tournamentId)
                .matchCode(slug)
                .homeTeamName("Tigers")
                .awayTeamName("Lions")
                .build());
        when(tournamentService.getTournamentById(tournamentId)).thenReturn(TournamentResponse.builder()
                .id(tournamentId)
                .status("PUBLISHED")
                .build());
        when(matchEventRepository.findByMatchId(matchId)).thenReturn(List.of());
        when(matchOfficialRepository.findByMatchId(matchId)).thenReturn(List.of());

        mockMvc.perform(get("/api/public/matches/" + slug))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(slug))
                .andExpect(jsonPath("$.homeTeamName").value("Tigers"));
    }
}
