package com.athleticaos.backend.migration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.Connection;
import java.sql.Date;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration test verifying that V156 preflight fails loudly if a person row is already VERIFIED.
 * Uses its own Testcontainers PostgreSQL container.
 */
@Tag("integration")
@Testcontainers
class V156PreflightMigrationTest {

    @Container
    @SuppressWarnings("resource")
    private static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("athleticaos_test")
            .withUsername("test")
            .withPassword("test");

    private static String jdbcUrl;
    private static String username;
    private static String password;

    @BeforeAll
    static void setUp() throws Exception {
        postgres.start();
        jdbcUrl = postgres.getJdbcUrl();
        username = postgres.getUsername();
        password = postgres.getPassword();

        // Migrate to V155
        Flyway flyway155 = Flyway.configure()
                .dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration")
                .target("155")
                .load();
        flyway155.migrate();

        // Insert a row that has status VERIFIED (manual edit / corrupted state)
        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password);
             PreparedStatement ps = conn.prepareStatement(
                     "INSERT INTO persons (id, first_name, last_name, gender, dob, ic_or_passport, nationality, identification_verification_status) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?)")) {
            ps.setObject(1, UUID.randomUUID());
            ps.setString(2, "CorruptedFirst");
            ps.setString(3, "CorruptedLast");
            ps.setString(4, "MALE");
            ps.setDate(5, Date.valueOf("2000-01-01"));
            ps.setString(6, "CORRUPTED-" + UUID.randomUUID());
            ps.setString(7, "MALAYSIAN");
            ps.setString(8, "VERIFIED");
            ps.executeUpdate();
        }
    }

    @Test
    @DisplayName("Preflight check fails if a row already has VERIFIED status before V156")
    void v156Migration_failsWithPreflightMessage_whenVerifiedRowExists() {
        Flyway flyway156 = Flyway.configure()
                .dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration")
                .target("156")
                .load();

        assertThatThrownBy(flyway156::migrate)
                .isInstanceOf(FlywayException.class)
                .hasMessageContaining("V156 preflight failed:")
                .hasMessageContaining("already have status VERIFIED without attestation data");
    }

    @AfterAll
    static void tearDown() {
        if (postgres != null && postgres.isRunning()) {
            postgres.stop();
        }
    }
}
