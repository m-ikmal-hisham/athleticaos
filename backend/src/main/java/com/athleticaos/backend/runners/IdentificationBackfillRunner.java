package com.athleticaos.backend.runners;

import com.athleticaos.backend.services.IdentificationBackfillService;
import com.athleticaos.backend.services.IdentificationHashService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.function.IntConsumer;

@Component
@ConditionalOnProperty(name = "athleticaos.backfill.identification.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class IdentificationBackfillRunner implements CommandLineRunner {

    private final IdentificationBackfillService backfillService;
    private final IdentificationHashService identificationHashService;
    private final ApplicationContext applicationContext;

    // Package-private exit handler with default System::exit for production; can be overridden in tests
    IntConsumer exitHandler = System::exit;

    @Value("${athleticaos.backfill.identification.dry-run:true}")
    private boolean dryRun;

    @Value("${athleticaos.backfill.identification.batch-size:100}")
    private int batchSize;

    @Value("${spring.datasource.url:unknown}")
    private String datasourceUrl;

    @Override
    public void run(String... args) {
        // Safety: log the database target (sanitized — no password) to prevent
        // accidentally running backfill against the wrong environment
        log.info("========================================================");
        log.info("IDENTIFICATION BACKFILL RUNNER STARTING");
        log.info("Database target: {}", sanitizeDatasourceUrl(datasourceUrl));
        log.info("HMAC configured: {}", identificationHashService.isConfigured());
        log.info("Dry-run: {}, Batch size: {}", dryRun, batchSize);
        log.info("========================================================");

        if (!identificationHashService.isConfigured()) {
            log.error("HMAC service is not configured. Backfill cannot run without a valid HMAC key.");
            log.error("Set ATHLETICAOS_IDENTIFICATION_HMAC_SECRET before enabling backfill.");
            int exitCode = SpringApplication.exit(applicationContext, () -> 1);
            exitHandler.accept(exitCode != 0 ? exitCode : 1);
            return;
        }

        try {
            Map<String, Object> summary = backfillService.runBackfill(dryRun, batchSize);
            log.info("Backfill completed successfully. Summary: {}", summary);
        } catch (Exception e) {
            log.error("Backfill failed with error: {}", e.getMessage(), e);
            int exitCode = SpringApplication.exit(applicationContext, () -> 1);
            exitHandler.accept(exitCode != 0 ? exitCode : 1);
        }
    }

    /**
     * Sanitize the datasource URL to remove any embedded password.
     * Example: jdbc:postgresql://host:5432/db?user=foo&password=bar → jdbc:postgresql://host:5432/db
     */
    private String sanitizeDatasourceUrl(String url) {
        if (url == null) return "null";
        // Remove query parameters that may contain credentials
        int queryStart = url.indexOf('?');
        return queryStart > 0 ? url.substring(0, queryStart) : url;
    }
}
