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
 * Integration test for Flyway migration V158 preflight check.
 * Verifies that migration fails if any person row has a gender other than MALE or FEMALE.
 */
@Tag("integration")
@Testcontainers
class V158PreflightMigrationTest {

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

        // 1. Migrate up to V157
        Flyway flyway157 = Flyway.configure()
                .dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration")
                .target("157")
                .load();
        flyway157.migrate();

        // 2. Insert a person with gender OTHER before V158
        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password);
             PreparedStatement ps = conn.prepareStatement(
                     "INSERT INTO persons (id, first_name, last_name, gender, dob, ic_or_passport, nationality, identification_verification_status) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?)")) {
            ps.setObject(1, UUID.randomUUID());
            ps.setString(2, "InvalidFirst");
            ps.setString(3, "InvalidLast");
            ps.setString(4, "OTHER");
            ps.setDate(5, Date.valueOf("2000-01-01"));
            ps.setString(6, "FABRICATED-" + UUID.randomUUID());
            ps.setString(7, "MALAYSIAN");
            ps.setString(8, "UNVERIFIED");
            ps.executeUpdate();
        }
    }

    @Test
    @DisplayName("Preflight check fails if a person row has gender other than MALE or FEMALE before V158")
    void v158Migration_failsWithPreflightMessage_whenInvalidGenderExists() {
        Flyway flyway158 = Flyway.configure()
                .dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration")
                .target("158")
                .load();

        assertThatThrownBy(flyway158::migrate)
                .isInstanceOf(FlywayException.class)
                .hasMessageContaining("V158 preflight failed");
    }

    @AfterAll
    static void tearDown() {
        if (postgres != null && postgres.isRunning()) {
            postgres.stop();
        }
    }
}
