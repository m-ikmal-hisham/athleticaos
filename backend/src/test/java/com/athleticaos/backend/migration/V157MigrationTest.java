package com.athleticaos.backend.migration;

import org.flywaydb.core.Flyway;
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
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration test for Flyway migration V157: store "no email" as NULL.
 * Uses Testcontainers PostgreSQL.
 */
@Tag("integration")
@Testcontainers
class V157MigrationTest {

    @Container
    @SuppressWarnings("resource")
    private static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("athleticaos_test")
            .withUsername("test")
            .withPassword("test");

    private static String jdbcUrl;
    private static String username;
    private static String password;

    private static final UUID PERSON_EMPTY_EMAIL = UUID.fromString("00000000-0000-4000-d000-000000000001");
    private static final UUID PERSON_BLANK_EMAIL = UUID.fromString("00000000-0000-4000-d000-000000000002");
    private static final UUID PERSON_CASE_EMAIL = UUID.fromString("00000000-0000-4000-d000-000000000003");
    private static final UUID PERSON_NULL_EMAIL = UUID.fromString("00000000-0000-4000-d000-000000000004");

    @BeforeAll
    static void setUp() throws Exception {
        postgres.start();
        jdbcUrl = postgres.getJdbcUrl();
        username = postgres.getUsername();
        password = postgres.getPassword();

        // 1. Migrate up to V156
        Flyway flyway156 = Flyway.configure()
                .dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration")
                .target("156")
                .load();
        flyway156.migrate();

        // 2. Insert test data before V157
        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password)) {
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO persons (id, first_name, last_name, gender, dob, ic_or_passport, nationality, identification_verification_status, email) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")) {
                insertPerson(ps, PERSON_EMPTY_EMAIL, "");
                insertPerson(ps, PERSON_BLANK_EMAIL, "   ");
                insertPerson(ps, PERSON_CASE_EMAIL, "Case@Example.Test");
                insertPerson(ps, PERSON_NULL_EMAIL, null);
            }
        }

        // 3. Migrate up to V157
        Flyway flyway157 = Flyway.configure()
                .dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration")
                .target("157")
                .load();
        flyway157.migrate();
    }

    private static void insertPerson(PreparedStatement ps, UUID id, String email) throws SQLException {
        ps.setObject(1, id);
        ps.setString(2, "SyntheticFirst");
        ps.setString(3, "SyntheticLast");
        ps.setString(4, "MALE");
        ps.setDate(5, Date.valueOf("2000-01-01"));
        ps.setString(6, "FABRICATED-" + UUID.randomUUID());
        ps.setString(7, "MALAYSIAN");
        ps.setString(8, "UNVERIFIED");
        if (email == null) {
            ps.setNull(9, java.sql.Types.VARCHAR);
        } else {
            ps.setString(9, email);
        }
        ps.executeUpdate();
    }

    private static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(jdbcUrl, username, password);
    }

    @Test
    @DisplayName("V157 converts empty string and whitespace emails to NULL, preserves case on valid emails and leaves existing NULLs intact")
    void v157Migration_nullsBlankEmails_preservesValidEmails() throws Exception {
        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement("SELECT email FROM persons WHERE id = ?")) {

            // Empty string became NULL
            ps.setObject(1, PERSON_EMPTY_EMAIL);
            try (ResultSet rs = ps.executeQuery()) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getString("email")).isNull();
            }

            // Whitespace became NULL
            ps.setObject(1, PERSON_BLANK_EMAIL);
            try (ResultSet rs = ps.executeQuery()) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getString("email")).isNull();
            }

            // Case@Example.Test is untouched
            ps.setObject(1, PERSON_CASE_EMAIL);
            try (ResultSet rs = ps.executeQuery()) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getString("email")).isEqualTo("Case@Example.Test");
            }

            // NULL remains NULL
            ps.setObject(1, PERSON_NULL_EMAIL);
            try (ResultSet rs = ps.executeQuery()) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getString("email")).isNull();
            }
        }
    }

    @Test
    @DisplayName("Rerunning V157 SQL statement affects 0 rows")
    void v157Migration_idempotent_rerunAffectsZeroRows() throws Exception {
        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "UPDATE persons SET email = NULL WHERE email IS NOT NULL AND trim(email) = ''")) {
            int affected = ps.executeUpdate();
            assertThat(affected).isEqualTo(0);
        }
    }
}
