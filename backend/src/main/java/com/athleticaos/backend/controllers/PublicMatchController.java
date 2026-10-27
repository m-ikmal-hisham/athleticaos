package com.athleticaos.backend.controllers;

import com.athleticaos.backend.config.DateTimeConfig;
import com.athleticaos.backend.config.PublicHttpCache;
import com.athleticaos.backend.dtos.public_api.PublicMatchDayResponse;
import com.athleticaos.backend.dtos.public_api.PublicMatchFeedCounts;
import com.athleticaos.backend.dtos.public_api.PublicMatchFeedItemResponse;
import com.athleticaos.backend.dtos.public_api.PublicMatchFeedResponse;
import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.mappers.PublicMatchMapper;
import com.athleticaos.backend.repositories.MatchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/public/matches")
@RequiredArgsConstructor
/**
 * Public match feed (Matchday home, D10) and calendar day counts (D9). Invalid parameters throw
 * IllegalArgumentException, which GlobalExceptionHandler turns into the standard 400 JSON error.
 */
public class PublicMatchController {

    private static final Set<String> VALID_VIEWS = Set.of("live", "today", "results", "upcoming", "range");
    private static final String LIVE_CACHE_CONTROL = "public, max-age=10, stale-while-revalidate=30";
    private static final int MAX_RANGE_DAYS = 62;

    private final MatchRepository matchRepository;
    private final PublicMatchMapper publicMatchMapper;
    private final Clock clock;

    @GetMapping
    public ResponseEntity<?> getFeed(
            @RequestParam(required = false) String view,
            @RequestParam(required = false) UUID tournamentId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false) Integer size) {

        if (view == null || view.isBlank()) {
            throw new IllegalArgumentException("Invalid view: must be one of live, today, results, upcoming, range");
        }

        String normalizedView = view.trim().toLowerCase();
        if (!VALID_VIEWS.contains(normalizedView)) {
            throw new IllegalArgumentException("Invalid view: must be one of live, today, results, upcoming, range");
        }

        if (!"range".equals(normalizedView)) {
            if (from != null || to != null) {
                throw new IllegalArgumentException("Parameters 'from' and 'to' are only permitted for range view");
            }
        } else {
            if (from == null || to == null) {
                throw new IllegalArgumentException("Parameters 'from' and 'to' are required for range view");
            }
            if (to.isBefore(from)) {
                throw new IllegalArgumentException("'to' date must be on or after 'from' date");
            }
            if (ChronoUnit.DAYS.between(from, to) > MAX_RANGE_DAYS) {
                throw new IllegalArgumentException("Date range cannot exceed 62 days");
            }
        }

        int safePage = Math.max(0, page);
        int safeSize = size == null ? 20 : Math.max(1, Math.min(50, size));
        Pageable pageable = PageRequest.of(safePage, safeSize);

        LocalDate today = LocalDate.now(clock.withZone(DateTimeConfig.MALAYSIA_ZONE));
        LocalTime nowTime = LocalTime.now(clock.withZone(DateTimeConfig.MALAYSIA_ZONE));
        // "Live" means LIVE/ONGOING and dated today or yesterday (evening matches past midnight);
        // older matches still marked live were not ended by the scorer and are not shown as live.
        LocalDate liveFrom = today.minusDays(1);

        Page<Match> pageResult;
        PublicMatchFeedCounts counts = null;

        switch (normalizedView) {
            case "live" -> {
                pageResult = matchRepository.findFeedLive(liveFrom, tournamentId, pageable);
                counts = matchRepository.countFeed(liveFrom, today, nowTime, today.minusDays(13), today.plusDays(14), tournamentId);
            }
            case "today" -> {
                pageResult = matchRepository.findFeedToday(today, tournamentId, pageable);
                counts = matchRepository.countFeed(liveFrom, today, nowTime, today.minusDays(13), today.plusDays(14), tournamentId);
            }
            case "results" -> {
                pageResult = matchRepository.findFeedResults(today.minusDays(13), today, tournamentId, pageable);
                counts = matchRepository.countFeed(liveFrom, today, nowTime, today.minusDays(13), today.plusDays(14), tournamentId);
            }
            case "upcoming" -> {
                pageResult = matchRepository.findFeedUpcoming(today, nowTime, today.plusDays(14), tournamentId, pageable);
                counts = matchRepository.countFeed(liveFrom, today, nowTime, today.minusDays(13), today.plusDays(14), tournamentId);
            }
            case "range" -> pageResult = matchRepository.findFeedRange(from, to, tournamentId, pageable);
            default -> throw new IllegalStateException("Unexpected view: " + normalizedView);
        }

        List<PublicMatchFeedItemResponse> items = pageResult.getContent().stream()
                .map(publicMatchMapper::toFeedItem)
                .toList();

        LocalDateTime lastUpdated = items.stream()
                .map(PublicMatchFeedItemResponse::getUpdatedAt)
                .filter(Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(null);

        PublicMatchFeedResponse response = new PublicMatchFeedResponse(
                items,
                pageResult.getNumber(),
                pageResult.getSize(),
                pageResult.getTotalElements(),
                pageResult.getTotalPages(),
                pageResult.hasNext(),
                counts,
                lastUpdated
        );

        if ("live".equals(normalizedView)) {
            return ResponseEntity.ok()
                    .header(HttpHeaders.CACHE_CONTROL, LIVE_CACHE_CONTROL)
                    .body(response);
        }

        return PublicHttpCache.ok(response);
    }

    @GetMapping("/days")
    public ResponseEntity<?> getDays(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) UUID tournamentId) {

        if (from == null || to == null) {
            throw new IllegalArgumentException("Parameters 'from' and 'to' are required");
        }
        if (to.isBefore(from)) {
            throw new IllegalArgumentException("'to' date must be on or after 'from' date");
        }
        if (ChronoUnit.DAYS.between(from, to) > MAX_RANGE_DAYS) {
            throw new IllegalArgumentException("Date range cannot exceed 62 days");
        }

        LocalDate liveFrom = LocalDate.now(clock.withZone(DateTimeConfig.MALAYSIA_ZONE)).minusDays(1);
        List<PublicMatchDayResponse> days = matchRepository.findMatchDays(liveFrom, from, to, tournamentId);
        return PublicHttpCache.ok(days);
    }
}
