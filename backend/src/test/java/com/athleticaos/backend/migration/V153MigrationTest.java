package com.athleticaos.backend.migration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Types;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration test for Flyway migration V153 database integrity constraints.
 * Uses Testcontainers PostgreSQL to verify CHECK constraints against real Postgres syntax.
 *
 * <p>To run locally: {@code ./mvnw test -Pintegration}
 */
@Tag("integration")
@Testcontainers
class V153MigrationTest {

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
    static void setUp() {
        postgres.start();
        jdbcUrl = postgres.getJdbcUrl();
        username = postgres.getUsername();
        password = postgres.getPassword();

        // Run Flyway migrations up to V153
        Flyway flyway = Flyway.configure()
                .dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration")
                .target("153")
                .load();
        flyway.migrate();
    }

    private Connection getConnection() throws SQLException {
        return DriverManager.getConnection(jdbcUrl, username, password);
    }

    private int executeInsert(UUID id, String firstName, String lastName, String hash, Integer version, String verificationStatus) throws SQLException {
        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "INSERT INTO persons (id, first_name, last_name, gender, dob, ic_or_passport, nationality, "
                     + "identification_hash, identification_hash_version, identification_verification_status) "
                     + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")) {
            ps.setObject(1, id != null ? id : UUID.randomUUID());
            ps.setString(2, firstName);
            ps.setString(3, lastName);
            ps.setString(4, "MALE");
            ps.setDate(5, java.sql.Date.valueOf("2000-01-01"));
            ps.setString(6, "FABRICATED-" + UUID.randomUUID());
            ps.setString(7, "MALAYSIAN");
            ps.setString(8, hash);
            if (version == null) {
                ps.setNull(9, Types.INTEGER);
            } else {
                ps.setInt(9, version);
            }
            ps.setString(10, verificationStatus != null ? verificationStatus : "UNVERIFIED");
            return ps.executeUpdate();
        }
    }

    @Test
    @DisplayName("Valid 64-char lowercase hex hash with positive version succeeds")
    void validHashAndVersion_insertedSuccessfully() throws Exception {
        int rows = executeInsert(UUID.randomUUID(), "Valid", "Person",
                "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", 1, "LEGACY");
        assertThat(rows).isEqualTo(1);
    }

    @Test
    @DisplayName("Both hash and version null succeeds")
    void bothHashAndVersionNull_insertedSuccessfully() throws Exception {
        int rows = executeInsert(UUID.randomUUID(), "Unhashed", "Person",
                null, null, "UNVERIFIED");
        assertThat(rows).isEqualTo(1);
    }

    @Test
    @DisplayName("Malformed hash format (uppercase or non-64 length) fails chk_persons_identification_hash_format")
    void malformedHash_failsFormatConstraint() {
        assertThatThrownBy(() -> {
            executeInsert(UUID.randomUUID(), "Bad", "Hash",
                    "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855", 1, "UNVERIFIED");
        }).isInstanceOf(SQLException.class)
          .hasMessageContaining("chk_persons_identification_hash_format");
    }

    @Test
    @DisplayName("Hash present with null version fails chk_persons_hash_version_consistency")
    void hashWithoutVersion_failsAtomicityConstraint() {
        assertThatThrownBy(() -> {
            executeInsert(UUID.randomUUID(), "Orphan", "Hash",
                    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", null, "UNVERIFIED");
        }).isInstanceOf(SQLException.class)
          .hasMessageContaining("chk_persons_hash_version_consistency");
    }

    @Test
    @DisplayName("Version present with null hash fails chk_persons_hash_version_consistency")
    void versionWithoutHash_failsAtomicityConstraint() {
        assertThatThrownBy(() -> {
            executeInsert(UUID.randomUUID(), "Orphan", "Version",
                    null, 1, "UNVERIFIED");
        }).isInstanceOf(SQLException.class)
          .hasMessageContaining("chk_persons_hash_version_consistency");
    }

    @Test
    @DisplayName("Non-positive version (<=0) fails chk_persons_hash_version_positive")
    void nonPositiveVersion_failsVersionPositiveConstraint() {
        assertThatThrownBy(() -> {
            executeInsert(UUID.randomUUID(), "Zero", "Version",
                    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", 0, "UNVERIFIED");
        }).isInstanceOf(SQLException.class)
          .hasMessageContaining("chk_persons_hash_version_positive");
    }

    @AfterAll
    static void tearDown() {
        if (postgres != null && postgres.isRunning()) {
            postgres.stop();
        }
    }
}
