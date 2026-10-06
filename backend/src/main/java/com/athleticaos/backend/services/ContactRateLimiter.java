package com.athleticaos.backend.services;

import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory rate limiter for public contact form submissions.
 * Limits submissions to a maximum of 5 submissions per IP address
 * within a rolling 1-hour window.
 */
@Component
public class ContactRateLimiter {

    private static final int MAX_SUBMISSIONS = 5;
    private static final Duration WINDOW_DURATION = Duration.ofHours(1);

    private final Clock clock;
    private final ConcurrentHashMap<String, List<Instant>> cache = new ConcurrentHashMap<>();

    public ContactRateLimiter() {
        this(Clock.systemUTC());
    }

    public ContactRateLimiter(Clock clock) {
        this.clock = clock;
    }

    /**
     * Atomically check if the IP is allowed to submit and record the submission if allowed.
     * Returns true if allowed (under the limit), false if rate-limited.
     */
    public boolean tryAcquire(String ip) {
        if (ip == null || ip.isBlank()) {
            return true;
        }

        Instant now = clock.instant();
        Instant cutoff = now.minus(WINDOW_DURATION);
        final boolean[] acquired = new boolean[1];

        cache.compute(ip, (key, existing) -> {
            List<Instant> timestamps = (existing == null) ? new ArrayList<>() : new ArrayList<>(existing);
            timestamps.removeIf(ts -> ts.isBefore(cutoff));

            if (timestamps.size() < MAX_SUBMISSIONS) {
                timestamps.add(now);
                acquired[0] = true;
            } else {
                acquired[0] = false;
            }
            return timestamps;
        });

        return acquired[0];
    }

    /**
     * Checks whether an IP is currently rate limited without modifying attempt counts.
     */
    public boolean isRateLimited(String ip) {
        if (ip == null || ip.isBlank()) {
            return false;
        }
        List<Instant> timestamps = cache.get(ip);
        if (timestamps == null) {
            return false;
        }
        Instant cutoff = clock.instant().minus(WINDOW_DURATION);
        long count = timestamps.stream().filter(ts -> !ts.isBefore(cutoff)).count();
        return count >= MAX_SUBMISSIONS;
    }

    /**
     * Records a submission for an IP.
     */
    public void recordSubmission(String ip) {
        if (ip == null || ip.isBlank()) {
            return;
        }
        Instant now = clock.instant();
        Instant cutoff = now.minus(WINDOW_DURATION);
        cache.compute(ip, (key, existing) -> {
            List<Instant> timestamps = (existing == null) ? new ArrayList<>() : new ArrayList<>(existing);
            timestamps.removeIf(ts -> ts.isBefore(cutoff));
            timestamps.add(now);
            return timestamps;
        });
    }

    /**
     * Resets rate limit state for a given IP.
     */
    public void reset(String ip) {
        if (ip != null) {
            cache.remove(ip);
        }
    }

    /**
     * Clears all rate limiter state.
     */
    public void clear() {
        cache.clear();
    }
}
