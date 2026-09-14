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
import java.sql.Date;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration test for Flyway migration V156 identity verification attestation.
 * Uses Testcontainers PostgreSQL. To run locally: {@code ./mvnw test -Pintegration}
 */
@Tag("integration")
@Testcontainers
class V156MigrationTest {

    @Container
    @SuppressWarnings("resource")
    private static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("athleticaos_test")
            .withUsername("test")
            .withPassword("test");

    private static String jdbcUrl;
    private static String username;
    private static String password;

    private static final UUID USER_ADMIN_ID = UUID.fromString("00000000-0000-4000-b000-000000000001");
    private static final UUID PERSON_ID_VALID = UUID.fromString("00000000-0000-4000-c000-000000000001");
    private static final UUID PERSON_ID_TEST2 = UUID.fromString("00000000-0000-4000-c000-000000000002");

    @BeforeAll
    static void setUp() throws Exception {
        postgres.start();
        jdbcUrl = postgres.getJdbcUrl();
        username = postgres.getUsername();
        password = postgres.getPassword();

        // Migrate up to V155 first
        Flyway flyway155 = Flyway.configure()
                .dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration")
                .target("155")
                .load();
        flyway155.migrate();

        // Insert a user to reference in fk_persons_identification_verified_by and unverified persons
        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password)) {
            try (PreparedStatement psUser = conn.prepareStatement(
                    "INSERT INTO users (id, email, password_hash, is_active) VALUES (?, ?, ?, ?)")) {
                psUser.setObject(1, USER_ADMIN_ID);
                psUser.setString(2, "v156_admin@athleticaos.com");
                psUser.setString(3, "synthetic_hash");
                psUser.setBoolean(4, true);
                psUser.executeUpdate();
            }

            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO persons (id, first_name, last_name, gender, dob, ic_or_passport, nationality, identification_verification_status) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?)")) {
                insertPerson(ps, PERSON_ID_VALID);
                insertPerson(ps, PERSON_ID_TEST2);
            }
        }

        // Apply V156 (and any subsequent migrations)
        Flyway flywayLatest = Flyway.configure()
                .dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration")
                .load();
        flywayLatest.migrate();
    }

    private static void insertPerson(PreparedStatement ps, UUID id) throws SQLException {
        ps.setObject(1, id);
        ps.setString(2, "SyntheticFirst");
        ps.setString(3, "SyntheticLast");
        ps.setString(4, "MALE");
        ps.setDate(5, Date.valueOf("2000-01-01"));
        ps.setString(6, "FABRICATED-" + UUID.randomUUID());
        ps.setString(7, "MALAYSIAN");
        ps.setString(8, "UNVERIFIED");
        ps.executeUpdate();
    }

    private static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(jdbcUrl, username, password);
    }

    @Test
    @DisplayName("VERIFIED with all attestation fields set is accepted")
    void verifiedWithAllAttestationFields_accepted() throws Exception {
        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "UPDATE persons SET identification_verification_status = 'VERIFIED', " +
                     "identification_verified_at = ?, identification_verified_by = ?, " +
                     "identification_verified_by_name = ?, identification_verification_method = ? " +
                     "WHERE id = ?")) {
            ps.setTimestamp(1, new Timestamp(System.currentTimeMillis()));
            ps.setObject(2, USER_ADMIN_ID);
            ps.setString(3, "Admin User");
            ps.setString(4, "PRE_REGISTRATION_RECORD");
            ps.setObject(5, PERSON_ID_VALID);
            int updated = ps.executeUpdate();
            assertThat(updated).isEqualTo(1);
        }

        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT identification_verification_status, identification_verified_by_name, identification_verification_method " +
                     "FROM persons WHERE id = ?")) {
            ps.setObject(1, PERSON_ID_VALID);
            try (ResultSet rs = ps.executeQuery()) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getString("identification_verification_status")).isEqualTo("VERIFIED");
                assertThat(rs.getString("identification_verified_by_name")).isEqualTo("Admin User");
                assertThat(rs.getString("identification_verification_method")).isEqualTo("PRE_REGISTRATION_RECORD");
            }
        }

        // Also assert DOCUMENT_SIGHTED is accepted by chk_persons_id_verification_method
        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "UPDATE persons SET identification_verification_method = 'DOCUMENT_SIGHTED' WHERE id = ?")) {
            ps.setObject(1, PERSON_ID_VALID);
            int updated = ps.executeUpdate();
            assertThat(updated).isEqualTo(1);
        }

        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT identification_verification_method FROM persons WHERE id = ?")) {
            ps.setObject(1, PERSON_ID_VALID);
            try (ResultSet rs = ps.executeQuery()) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getString("identification_verification_method")).isEqualTo("DOCUMENT_SIGHTED");
            }
        }
    }

    @Test
    @DisplayName("VERIFIED missing any attestation field is rejected by constraint")
    void verifiedMissingAnyAttestationField_rejected() throws Exception {
        try (Connection conn = getConnection()) {
            // Missing verified_by_name
            try (PreparedStatement ps = conn.prepareStatement(
                    "UPDATE persons SET identification_verification_status = 'VERIFIED', " +
                    "identification_verified_at = ?, identification_verified_by = ?, " +
                    "identification_verified_by_name = NULL, identification_verification_method = ? " +
                    "WHERE id = ?")) {
                ps.setTimestamp(1, new Timestamp(System.currentTimeMillis()));
                ps.setObject(2, USER_ADMIN_ID);
                ps.setString(3, "DOCUMENT_SIGHTED");
                ps.setObject(4, PERSON_ID_TEST2);
                assertThatThrownBy(ps::executeUpdate)
                        .isInstanceOf(SQLException.class)
                        .hasMessageContaining("chk_persons_id_verification_attestation");
            }

            // Missing verified_at
            try (PreparedStatement ps = conn.prepareStatement(
                    "UPDATE persons SET identification_verification_status = 'VERIFIED', " +
                    "identification_verified_at = NULL, identification_verified_by = ?, " +
                    "identification_verified_by_name = ?, identification_verification_method = ? " +
                    "WHERE id = ?")) {
                ps.setObject(1, USER_ADMIN_ID);
                ps.setString(2, "Admin User");
                ps.setString(3, "DOCUMENT_SIGHTED");
                ps.setObject(4, PERSON_ID_TEST2);
                assertThatThrownBy(ps::executeUpdate)
                        .isInstanceOf(SQLException.class)
                        .hasMessageContaining("chk_persons_id_verification_attestation");
            }

            // Missing verified_by
            try (PreparedStatement ps = conn.prepareStatement(
                    "UPDATE persons SET identification_verification_status = 'VERIFIED', " +
                    "identification_verified_at = ?, identification_verified_by = NULL, " +
                    "identification_verified_by_name = ?, identification_verification_method = ? " +
                    "WHERE id = ?")) {
                ps.setTimestamp(1, new Timestamp(System.currentTimeMillis()));
                ps.setString(2, "Admin User");
                ps.setString(3, "DOCUMENT_SIGHTED");
                ps.setObject(4, PERSON_ID_TEST2);
                assertThatThrownBy(ps::executeUpdate)
                        .isInstanceOf(SQLException.class)
                        .hasMessageContaining("chk_persons_id_verification_attestation");
            }

            // Missing method
            try (PreparedStatement ps = conn.prepareStatement(
                    "UPDATE persons SET identification_verification_status = 'VERIFIED', " +
                    "identification_verified_at = ?, identification_verified_by = ?, " +
                    "identification_verified_by_name = ?, identification_verification_method = NULL " +
                    "WHERE id = ?")) {
                ps.setTimestamp(1, new Timestamp(System.currentTimeMillis()));
                ps.setObject(2, USER_ADMIN_ID);
                ps.setString(3, "Admin User");
                ps.setObject(4, PERSON_ID_TEST2);
                assertThatThrownBy(ps::executeUpdate)
                        .isInstanceOf(SQLException.class)
                        .hasMessageContaining("chk_persons_id_verification_attestation");
            }
        }
    }

    @Test
    @DisplayName("UNVERIFIED with identification_verified_at set is rejected by constraint")
    void unverifiedWithVerifiedAtSet_rejected() throws Exception {
        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "UPDATE persons SET identification_verification_status = 'UNVERIFIED', " +
                     "identification_verified_at = ? WHERE id = ?")) {
            ps.setTimestamp(1, new Timestamp(System.currentTimeMillis()));
            ps.setObject(2, PERSON_ID_TEST2);
            assertThatThrownBy(ps::executeUpdate)
                    .isInstanceOf(SQLException.class)
                    .hasMessageContaining("chk_persons_id_verification_attestation");
        }
    }

    @Test
    @DisplayName("Unknown verification method is rejected by constraint")
    void unknownVerificationMethod_rejected() throws Exception {
        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "UPDATE persons SET identification_verification_status = 'VERIFIED', " +
                     "identification_verified_at = ?, identification_verified_by = ?, " +
                     "identification_verified_by_name = ?, identification_verification_method = 'UNKNOWN_METHOD' " +
                     "WHERE id = ?")) {
            ps.setTimestamp(1, new Timestamp(System.currentTimeMillis()));
            ps.setObject(2, USER_ADMIN_ID);
            ps.setString(3, "Admin User");
            ps.setObject(4, PERSON_ID_TEST2);
            assertThatThrownBy(ps::executeUpdate)
                    .isInstanceOf(SQLException.class)
                    .hasMessageContaining("chk_persons_id_verification_method");
        }
    }

    @AfterAll
    static void tearDown() {
        if (postgres != null && postgres.isRunning()) {
            postgres.stop();
        }
    }
}
