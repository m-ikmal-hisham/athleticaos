package com.athleticaos.backend.migration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Disabled;
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
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration test for Flyway migration V153 database integrity constraints.
 * Uses Testcontainers PostgreSQL to verify CHECK constraints against real Postgres syntax.
 *
 * <p>To run separately: {@code mvn test -Dtest=V153MigrationTest} (enable by removing @Disabled or activating profile).
 */
@Tag("integration")
@Testcontainers
@Disabled("Executed in separate integration testing session with Docker daemon per Phase 2.1 plan")
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
                .load();
        flyway.migrate();
    }

    private Connection getConnection() throws SQLException {
        return DriverManager.getConnection(jdbcUrl, username, password);
    }

    @Test
    @DisplayName("Valid 64-char lowercase hex hash with positive version succeeds")
    void validHashAndVersion_insertedSuccessfully() throws Exception {
        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "INSERT INTO persons (id, first_name, last_name, identification_hash, identification_hash_version, identification_verification_status) "
                     + "VALUES (?, ?, ?, ?, ?, ?)")) {
            ps.setObject(1, UUID.randomUUID());
            ps.setString(2, "Valid");
            ps.setString(3, "Person");
            ps.setString(4, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
            ps.setInt(5, 1);
            ps.setString(6, "LEGACY");

            int rows = ps.executeUpdate();
            assertThat(rows).isEqualTo(1);
        }
    }

    @Test
    @DisplayName("Both hash and version null succeeds")
    void bothHashAndVersionNull_insertedSuccessfully() throws Exception {
        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "INSERT INTO persons (id, first_name, last_name, identification_hash, identification_hash_version) "
                     + "VALUES (?, ?, ?, ?, ?)")) {
            ps.setObject(1, UUID.randomUUID());
            ps.setString(2, "Unhashed");
            ps.setString(3, "Person");
            ps.setString(4, null);
            ps.setObject(5, null);

            int rows = ps.executeUpdate();
            assertThat(rows).isEqualTo(1);
        }
    }

    @Test
    @DisplayName("Malformed hash format (uppercase or non-64 length) fails chk_persons_id_hash_format")
    void malformedHash_failsFormatConstraint() {
        assertThatThrownBy(() -> {
            try (Connection conn = getConnection();
                 PreparedStatement ps = conn.prepareStatement(
                         "INSERT INTO persons (id, first_name, last_name, identification_hash, identification_hash_version) "
                         + "VALUES (?, ?, ?, ?, ?)")) {
                ps.setObject(1, UUID.randomUUID());
                ps.setString(2, "Bad");
                ps.setString(3, "Hash");
                // Upper case chars violate regex ^[0-9a-f]{64}$
                ps.setString(4, "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855");
                ps.setInt(5, 1);
                ps.executeUpdate();
            }
        }).isInstanceOf(SQLException.class)
          .hasMessageContaining("chk_persons_id_hash_format");
    }

    @Test
    @DisplayName("Hash present with null version fails chk_persons_id_hash_version_atomic")
    void hashWithoutVersion_failsAtomicityConstraint() {
        assertThatThrownBy(() -> {
            try (Connection conn = getConnection();
                 PreparedStatement ps = conn.prepareStatement(
                         "INSERT INTO persons (id, first_name, last_name, identification_hash, identification_hash_version) "
                         + "VALUES (?, ?, ?, ?, ?)")) {
                ps.setObject(1, UUID.randomUUID());
                ps.setString(2, "Orphan");
                ps.setString(3, "Hash");
                ps.setString(4, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
                ps.setObject(5, null);
                ps.executeUpdate();
            }
        }).isInstanceOf(SQLException.class)
          .hasMessageContaining("chk_persons_id_hash_version_atomic");
    }

    @Test
    @DisplayName("Version present with null hash fails chk_persons_id_hash_version_atomic")
    void versionWithoutHash_failsAtomicityConstraint() {
        assertThatThrownBy(() -> {
            try (Connection conn = getConnection();
                 PreparedStatement ps = conn.prepareStatement(
                         "INSERT INTO persons (id, first_name, last_name, identification_hash, identification_hash_version) "
                         + "VALUES (?, ?, ?, ?, ?)")) {
                ps.setObject(1, UUID.randomUUID());
                ps.setString(2, "Orphan");
                ps.setString(3, "Version");
                ps.setString(4, null);
                ps.setInt(5, 1);
                ps.executeUpdate();
            }
        }).isInstanceOf(SQLException.class)
          .hasMessageContaining("chk_persons_id_hash_version_atomic");
    }

    @Test
    @DisplayName("Non-positive version (<=0) fails chk_persons_id_hash_version_positive")
    void nonPositiveVersion_failsVersionPositiveConstraint() {
        assertThatThrownBy(() -> {
            try (Connection conn = getConnection();
                 PreparedStatement ps = conn.prepareStatement(
                         "INSERT INTO persons (id, first_name, last_name, identification_hash, identification_hash_version) "
                         + "VALUES (?, ?, ?, ?, ?)")) {
                ps.setObject(1, UUID.randomUUID());
                ps.setString(2, "Zero");
                ps.setString(3, "Version");
                ps.setString(4, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
                ps.setInt(5, 0);
                ps.executeUpdate();
            }
        }).isInstanceOf(SQLException.class)
          .hasMessageContaining("chk_persons_id_hash_version_positive");
    }

    @AfterAll
    static void tearDown() {
        if (postgres != null && postgres.isRunning()) {
            postgres.stop();
        }
    }
}
