package com.athleticaos.backend.services;

import java.util.Map;

public interface IdentificationBackfillService {

    /**
     * Executes the backfill of HMAC hashes for legacy Person records.
     *
     * @param dryRun if true, simulates the backfill without persisting changes
     * @param batchSize number of records to process per batch
     * @return summary statistics of the backfill run
     */
    Map<String, Object> runBackfill(boolean dryRun, int batchSize);
}
