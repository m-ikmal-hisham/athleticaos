package com.athleticaos.backend.runner;

import com.athleticaos.backend.services.PlaceholderEmailBackfillService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Runs the placeholder-email backfill once, only when explicitly switched on
 * (intended for a one-off container: --athleticaos.backfill.placeholder-email.enabled=true).
 * Never enable it for the long-running application.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "athleticaos.backfill.placeholder-email.enabled", havingValue = "true")
public class PlaceholderEmailBackfillRunner implements CommandLineRunner {

    private final PlaceholderEmailBackfillService placeholderEmailBackfillService;

    @Value("${athleticaos.backfill.placeholder-email.dry-run:true}")
    private boolean dryRun;

    @Value("${athleticaos.backfill.placeholder-email.batch-size:200}")
    private int batchSize;

    @Override
    public void run(String... args) {
        log.info("PLACEHOLDER EMAIL BACKFILL STARTING. Dry-run: {}, batch size: {}", dryRun, batchSize);
        PlaceholderEmailBackfillService.Summary summary = placeholderEmailBackfillService.run(dryRun, batchSize);
        log.info("Placeholder email backfill completed. Summary: dryRun={}, candidates={}, filled={}",
                summary.dryRun(), summary.candidates(), summary.filled());
    }
}
