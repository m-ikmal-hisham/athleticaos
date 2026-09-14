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
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration test for Flyway migration V158: enforce person gender MALE or FEMALE.
 * Uses Testcontainers PostgreSQL.
 */
@Tag("integration")
@Testcontainers
class V158MigrationTest {

    @Container
    @SuppressWarnings("resource")
    private static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("athleticaos_test")
            .withUsername("test")
            .withPassword("test");

    private static String jdbcUrl;
    private static String username;
    private static String password;

    private static final UUID PERSON_ID_MALE = UUID.fromString("00000000-0000-4000-e000-000000000001");
    private static final UUID PERSON_ID_FEMALE = UUID.fromString("00000000-0000-4000-e000-000000000002");

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

        // 2. Insert persons with MALE and FEMALE before V158
        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password)) {
            insertPerson(conn, PERSON_ID_MALE, "MALE");
            insertPerson(conn, PERSON_ID_FEMALE, "FEMALE");
        }

        // 3. Migrate to latest (applies V158)
        Flyway flywayLatest = Flyway.configure()
                .dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration")
                .load();
        flywayLatest.migrate();
    }

    private static void insertPerson(Connection conn, UUID id, String gender) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
                "INSERT INTO persons (id, first_name, last_name, gender, dob, ic_or_passport, nationality, identification_verification_status) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)")) {
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
    }

    private static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(jdbcUrl, username, password);
    }

    @Test
    @DisplayName("chk_persons_gender_values constraint exists and is validated")
    void constraintExistsAndIsValidated() throws Exception {
        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT conname, convalidated FROM pg_constraint WHERE conname = 'chk_persons_gender_values'")) {
            try (ResultSet rs = ps.executeQuery()) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getString("conname")).isEqualTo("chk_persons_gender_values");
                assertThat(rs.getBoolean("convalidated")).isTrue();
            }
        }
    }

    @Test
    @DisplayName("Inserting a person with gender OTHER is rejected by check constraint with SQLState 23514")
    void insertPerson_genderOther_rejectedWithSqlState23514() throws Exception {
        try (Connection conn = getConnection()) {
            assertThatThrownBy(() -> insertPerson(conn, UUID.randomUUID(), "OTHER"))
                    .isInstanceOf(SQLException.class)
                    .satisfies(e -> {
                        SQLException sqlEx = (SQLException) e;
                        assertThat(sqlEx.getSQLState()).isEqualTo("23514");
                    });
        }
    }

    @Test
    @DisplayName("Inserting a person with gender MALE succeeds")
    void insertPerson_genderMale_succeeds() throws Exception {
        UUID newMaleId = UUID.randomUUID();
        try (Connection conn = getConnection()) {
            insertPerson(conn, newMaleId, "MALE");
            try (PreparedStatement ps = conn.prepareStatement("SELECT gender FROM persons WHERE id = ?")) {
                ps.setObject(1, newMaleId);
                try (ResultSet rs = ps.executeQuery()) {
                    assertThat(rs.next()).isTrue();
                    assertThat(rs.getString("gender")).isEqualTo("MALE");
                }
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
