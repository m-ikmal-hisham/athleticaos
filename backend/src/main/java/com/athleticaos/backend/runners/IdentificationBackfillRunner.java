package com.athleticaos.backend.runners;

import com.athleticaos.backend.services.IdentificationBackfillService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "athleticaos.backfill.identification.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class IdentificationBackfillRunner implements CommandLineRunner {

    private final IdentificationBackfillService backfillService;

    @Value("${athleticaos.backfill.identification.dry-run:true}")
    private boolean dryRun;

    @Value("${athleticaos.backfill.identification.batch-size:100}")
    private int batchSize;

    @Override
    public void run(String... args) {
        log.info("Triggering IdentificationBackfillRunner: dryRun={}, batchSize={}", dryRun, batchSize);
        backfillService.runBackfill(dryRun, batchSize);
    }
}
