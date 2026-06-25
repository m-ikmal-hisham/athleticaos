package com.athleticaos.backend.services;

import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory brute-force login protection.
 * Tracks failed login attempts per IP address and locks out after MAX_ATTEMPTS
 * failures within the tracking window.
 * 
 * Uses ConcurrentHashMap — no Redis or database dependency.
 * Entries auto-expire after the lockout duration.
 */
@Service
public class LoginAttemptService {

    private static final int MAX_ATTEMPTS = 5;
    private static final long LOCKOUT_DURATION_MINUTES = 15;
    private static final long LOCKOUT_DURATION_MS = LOCKOUT_DURATION_MINUTES * 60 * 1000;

    private final ConcurrentHashMap<String, AttemptRecord> attemptsCache = new ConcurrentHashMap<>();

    /**
     * Check if a given IP is currently locked out.
     * Also cleans up expired entries opportunistically.
     */
    public boolean isBlocked(String ip) {
        AttemptRecord record = attemptsCache.get(ip);
        if (record == null) {
            return false;
        }

        // If lockout has expired, remove the record
        if (record.lockedUntil != null && Instant.now().isAfter(record.lockedUntil)) {
            attemptsCache.remove(ip);
            return false;
        }

        return record.lockedUntil != null && Instant.now().isBefore(record.lockedUntil);
    }

    /**
     * Returns the remaining lockout time in minutes (rounded up), or 0 if not locked.
     */
    public long getRemainingLockoutMinutes(String ip) {
        AttemptRecord record = attemptsCache.get(ip);
        if (record == null || record.lockedUntil == null) {
            return 0;
        }

        long remainingMs = record.lockedUntil.toEpochMilli() - Instant.now().toEpochMilli();
        if (remainingMs <= 0) {
            attemptsCache.remove(ip);
            return 0;
        }

        return (long) Math.ceil(remainingMs / 60000.0);
    }

    /**
     * Record a failed login attempt from the given IP.
     * After MAX_ATTEMPTS failures, the IP is locked out.
     */
    public void recordFailure(String ip) {
        attemptsCache.compute(ip, (key, existing) -> {
            if (existing == null) {
                return new AttemptRecord(1, null);
            }

            // If previous lockout expired, start fresh
            if (existing.lockedUntil != null && Instant.now().isAfter(existing.lockedUntil)) {
                return new AttemptRecord(1, null);
            }

            int newCount = existing.attempts + 1;
            Instant lockUntil = null;

            if (newCount >= MAX_ATTEMPTS) {
                lockUntil = Instant.now().plusMillis(LOCKOUT_DURATION_MS);
            }

            return new AttemptRecord(newCount, lockUntil);
        });
    }

    /**
     * Record a successful login — resets the failure counter for the IP.
     */
    public void recordSuccess(String ip) {
        attemptsCache.remove(ip);
    }

    /**
     * Internal record for tracking attempts.
     */
    private static class AttemptRecord {
        final int attempts;
        final Instant lockedUntil;

        AttemptRecord(int attempts, Instant lockedUntil) {
            this.attempts = attempts;
            this.lockedUntil = lockedUntil;
        }
    }
}
