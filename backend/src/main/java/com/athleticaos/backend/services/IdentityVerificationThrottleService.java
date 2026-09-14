package com.athleticaos.backend.services;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory brute-force throttle for identity verification attestation.
 * Tracks failed verification attempts per (admin user id, person id) pair.
 * Locks out an administrator for a person if they have 5 mismatches within a 15-minute window.
 *
 * <p>Note: This throttle is per-instance (staging and single-node production run one instance).
 * Uses ConcurrentHashMap — no Redis or database dependency.
 */
@Service
public class IdentityVerificationThrottleService {

    private static final int MAX_MISMATCHES = 5;
    private static final long WINDOW_MINUTES = 15;

    private record Key(UUID adminUserId, UUID personId) {}

    private final ConcurrentHashMap<Key, List<Instant>> mismatchTimestamps = new ConcurrentHashMap<>();

    /**
     * Checks if the given admin is currently locked out from attempting verification for the given person.
     * Cleans up expired mismatch timestamps opportunistically.
     *
     * @param adminUserId the ID of the administrator attempting verification
     * @param personId the ID of the person being verified
     * @return true if locked out (>= 5 mismatches within the last 15 minutes), false otherwise
     */
    public boolean isLocked(UUID adminUserId, UUID personId) {
        if (adminUserId == null || personId == null) {
            return false;
        }
        Key key = new Key(adminUserId, personId);
        List<Instant> timestamps = mismatchTimestamps.get(key);
        if (timestamps == null) {
            return false;
        }

        Instant cutoff = Instant.now().minus(WINDOW_MINUTES, ChronoUnit.MINUTES);
        synchronized (timestamps) {
            timestamps.removeIf(instant -> instant.isBefore(cutoff));
            if (timestamps.isEmpty()) {
                mismatchTimestamps.remove(key, timestamps);
                return false;
            }
            return timestamps.size() >= MAX_MISMATCHES;
        }
    }

    /**
     * Records a verification mismatch for the (adminUserId, personId) pair.
     *
     * @param adminUserId the ID of the administrator
     * @param personId the ID of the person
     */
    public void recordFailure(UUID adminUserId, UUID personId) {
        if (adminUserId == null || personId == null) {
            return;
        }
        Key key = new Key(adminUserId, personId);
        Instant now = Instant.now();
        Instant cutoff = now.minus(WINDOW_MINUTES, ChronoUnit.MINUTES);

        mismatchTimestamps.compute(key, (k, existing) -> {
            List<Instant> list = existing != null ? existing : new ArrayList<>();
            synchronized (list) {
                list.removeIf(instant -> instant.isBefore(cutoff));
                list.add(now);
            }
            return list;
        });
    }

    /**
     * Records a successful verification match, clearing any failure records for the pair.
     *
     * @param adminUserId the ID of the administrator
     * @param personId the ID of the person
     */
    public void recordSuccess(UUID adminUserId, UUID personId) {
        if (adminUserId == null || personId == null) {
            return;
        }
        mismatchTimestamps.remove(new Key(adminUserId, personId));
    }
}
