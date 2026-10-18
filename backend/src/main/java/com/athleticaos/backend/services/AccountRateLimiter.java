package com.athleticaos.backend.services;

import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory rate limiters for account email actions:
 * - Forgot password: max 3 per email/hour, max 10 per IP/hour
 * - Resend invite: max 5 per user ID/hour
 */
@Component
public class AccountRateLimiter {

    private static final int FORGOT_PASSWORD_MAX_EMAIL = 3;
    private static final int FORGOT_PASSWORD_MAX_IP = 10;
    private static final int RESEND_INVITE_MAX_USER = 5;

    private static final Duration WINDOW_1_HOUR = Duration.ofHours(1);

    private final Clock clock;
    private final ConcurrentHashMap<String, List<Instant>> emailCache = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, List<Instant>> ipCache = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<UUID, List<Instant>> resendUserCache = new ConcurrentHashMap<>();

    public AccountRateLimiter() {
        this(Clock.systemUTC());
    }

    public AccountRateLimiter(Clock clock) {
        this.clock = clock;
    }

    /**
     * Atomically checks and records an attempt for forgot-password.
     * Returns true if allowed, false if rate limited.
     */
    public boolean tryAcquireForgotPassword(String email, String ip) {
        Instant now = clock.instant();
        Instant cutoff = now.minus(WINDOW_1_HOUR);

        String normalizedEmail = (email != null) ? email.trim().toLowerCase(Locale.ROOT) : "";
        String normalizedIp = (ip != null) ? ip.trim() : "";

        // Check if either is already over limit
        if (!normalizedEmail.isEmpty() && isCountExceeded(emailCache.get(normalizedEmail), cutoff, FORGOT_PASSWORD_MAX_EMAIL)) {
            return false;
        }
        if (!normalizedIp.isEmpty() && isCountExceeded(ipCache.get(normalizedIp), cutoff, FORGOT_PASSWORD_MAX_IP)) {
            return false;
        }

        // Atomically record for email
        if (!normalizedEmail.isEmpty()) {
            boolean acquiredEmail = recordTimestampIfAllowed(emailCache, normalizedEmail, now, cutoff, FORGOT_PASSWORD_MAX_EMAIL);
            if (!acquiredEmail) {
                return false;
            }
        }

        // Atomically record for IP
        if (!normalizedIp.isEmpty()) {
            boolean acquiredIp = recordTimestampIfAllowed(ipCache, normalizedIp, now, cutoff, FORGOT_PASSWORD_MAX_IP);
            if (!acquiredIp) {
                return false;
            }
        }

        return true;
    }

    /**
     * Atomically checks and records a resend-invite attempt for a user ID.
     * Returns true if allowed, false if rate limited.
     */
    public boolean tryAcquireResendInvite(UUID userId) {
        if (userId == null) {
            return true;
        }
        Instant now = clock.instant();
        Instant cutoff = now.minus(WINDOW_1_HOUR);
        return recordTimestampIfAllowed(resendUserCache, userId, now, cutoff, RESEND_INVITE_MAX_USER);
    }

    private <K> boolean recordTimestampIfAllowed(ConcurrentHashMap<K, List<Instant>> map, K key, Instant now, Instant cutoff, int max) {
        final boolean[] allowed = new boolean[1];
        map.compute(key, (k, existing) -> {
            List<Instant> timestamps = (existing == null) ? new ArrayList<>() : new ArrayList<>(existing);
            timestamps.removeIf(ts -> ts.isBefore(cutoff));
            if (timestamps.size() < max) {
                timestamps.add(now);
                allowed[0] = true;
            } else {
                allowed[0] = false;
            }
            return timestamps;
        });
        return allowed[0];
    }

    private boolean isCountExceeded(List<Instant> timestamps, Instant cutoff, int max) {
        if (timestamps == null) {
            return false;
        }
        long count = timestamps.stream().filter(ts -> !ts.isBefore(cutoff)).count();
        return count >= max;
    }

    public void clear() {
        emailCache.clear();
        ipCache.clear();
        resendUserCache.clear();
    }
}
