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
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration test for Flyway migration V155 person gender canonicalisation.
 * Uses Testcontainers PostgreSQL. To run locally: {@code ./mvnw test -Pintegration}
 */
@Tag("integration")
@Testcontainers
class V155MigrationTest {

    @Container
    @SuppressWarnings("resource")
    private static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("athleticaos_test")
            .withUsername("test")
            .withPassword("test");

    private static String jdbcUrl;
    private static String username;
    private static String password;

    private static final UUID PERSON_ID_MALE_MIXED = UUID.fromString("00000000-0000-4000-a000-000000000001");
    private static final UUID PERSON_ID_FEMALE_SPACED = UUID.fromString("00000000-0000-4000-a000-000000000002");
    private static final UUID PERSON_ID_MALE_CANONICAL = UUID.fromString("00000000-0000-4000-a000-000000000003");
    private static final UUID PERSON_ID_OTHER = UUID.fromString("00000000-0000-4000-a000-000000000004");
    private static final UUID PERSON_ID_EMPTY = UUID.fromString("00000000-0000-4000-a000-000000000005");

    @BeforeAll
    static void setUp() throws Exception {
        postgres.start();
        jdbcUrl = postgres.getJdbcUrl();
        username = postgres.getUsername();
        password = postgres.getPassword();

        // Migrate up to V154 first
        Flyway flyway154 = Flyway.configure()
                .dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration")
                .target("154")
                .load();
        flyway154.migrate();

        // Insert persons with various genders before V155 is applied
        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password);
             PreparedStatement ps = conn.prepareStatement(
                     "INSERT INTO persons (id, first_name, last_name, gender, dob, ic_or_passport, nationality, identification_verification_status) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?)")) {

            insertPerson(ps, PERSON_ID_MALE_MIXED, "Male");
            insertPerson(ps, PERSON_ID_FEMALE_SPACED, " female ");
            insertPerson(ps, PERSON_ID_MALE_CANONICAL, "MALE");
            insertPerson(ps, PERSON_ID_OTHER, "OTHER");
            insertPerson(ps, PERSON_ID_EMPTY, "");
        }

        // Apply V155
        Flyway flyway155 = Flyway.configure()
                .dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration")
                .target("155")
                .load();
        flyway155.migrate();
    }

    private static void insertPerson(PreparedStatement ps, UUID id, String gender) throws SQLException {
        ps.setObject(1, id);
        ps.setString(2, "SyntheticFirst");
        ps.setString(3, "SyntheticLast");
        ps.setString(4, gender);
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
    @DisplayName("V155 canonicalises Male, female, and preserves MALE")
    void canonicalisePersonGender_maleAndFemale_rewritten() throws Exception {
        try (Connection conn = getConnection()) {
            assertThat(queryGender(conn, PERSON_ID_MALE_MIXED)).isEqualTo("MALE");
            assertThat(queryGender(conn, PERSON_ID_FEMALE_SPACED)).isEqualTo("FEMALE");
            assertThat(queryGender(conn, PERSON_ID_MALE_CANONICAL)).isEqualTo("MALE");
        }
    }

    @Test
    @DisplayName("V155 leaves OTHER and empty string untouched for administrator review")
    void canonicalisePersonGender_otherAndEmpty_untouched() throws Exception {
        try (Connection conn = getConnection()) {
            assertThat(queryGender(conn, PERSON_ID_OTHER)).isEqualTo("OTHER");
            assertThat(queryGender(conn, PERSON_ID_EMPTY)).isEqualTo("");
        }
    }

    @Test
    @DisplayName("V155 migration UPDATE statement is idempotent (0 rows updated on rerun)")
    void canonicalisePersonGender_idempotent() throws Exception {
        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "UPDATE persons " +
                     "SET gender = upper(trim(gender)) " +
                     "WHERE upper(trim(gender)) IN ('MALE', 'FEMALE') " +
                     "  AND gender <> upper(trim(gender))")) {
            int rowsUpdated = ps.executeUpdate();
            assertThat(rowsUpdated).isEqualTo(0);
        }
    }

    private String queryGender(Connection conn, UUID id) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement("SELECT gender FROM persons WHERE id = ?")) {
            ps.setObject(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                assertThat(rs.next()).isTrue();
                return rs.getString("gender");
            }
        }
    }

    @AfterAll
    static void tearDown() {
        if (postgres != null && postgres.isRunning()) {
            postgres.stop();
        }
    }
}
