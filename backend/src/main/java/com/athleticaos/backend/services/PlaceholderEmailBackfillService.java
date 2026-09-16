package com.athleticaos.backend.services;

/**
 * One-off backfill that gives every person without an email address a machine-generated
 * placeholder derived from their registration number (CR-4).
 *
 * <p>It is never enabled by default. It exists so administrators on an environment full of
 * historical records are not blocked by the email rule, while the placeholders stay
 * recognisable and keep those people in the "missing email" list until a real address arrives.
 */
public interface PlaceholderEmailBackfillService {

    /** Result of one run. Counts only — no address is ever returned or logged. */
    record Summary(boolean dryRun, long candidates, long filled) {
    }

    Summary run(boolean dryRun, int batchSize);
}
