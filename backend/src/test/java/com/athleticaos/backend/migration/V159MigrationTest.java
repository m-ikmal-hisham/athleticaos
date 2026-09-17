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
 * Integration test for Flyway migration V159: human-facing person registration number.
 * Uses Testcontainers PostgreSQL:16-alpine.
 */
@Tag("integration")
@Testcontainers
class V159MigrationTest {

    @Container
    @SuppressWarnings("resource")
    private static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("athleticaos_test")
            .withUsername("test")
            .withPassword("test");

    private static String jdbcUrl;
    private static String username;
    private static String password;

    private static final UUID PERSON_ID_1 = UUID.fromString("00000000-0000-4000-e000-000000000001");
    private static final UUID PERSON_ID_2_HIGH_ID = UUID.fromString("00000000-0000-4000-e000-00000000000b");
    private static final UUID PERSON_ID_3_LOW_ID = UUID.fromString("00000000-0000-4000-e000-00000000000a");
    private static final UUID PERSON_ID_4 = UUID.fromString("00000000-0000-4000-e000-000000000004");

    @BeforeAll
    static void setUp() throws Exception {
        postgres.start();
        jdbcUrl = postgres.getJdbcUrl();
        username = postgres.getUsername();
        password = postgres.getPassword();

        // 1. Migrate up to V158
        Flyway flyway158 = Flyway.configure()
                .dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration")
                .target("158")
                .load();
        flyway158.migrate();

        // 2. Insert four persons before V159: two with same created_at, IDs out of order
        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password)) {
            insertPersonWithCreatedAt(conn, PERSON_ID_1, Timestamp.valueOf("2024-01-01 10:00:00"));
            // Insert high ID first at same timestamp
            insertPersonWithCreatedAt(conn, PERSON_ID_2_HIGH_ID, Timestamp.valueOf("2024-01-02 10:00:00"));
            // Insert low ID second at same timestamp
            insertPersonWithCreatedAt(conn, PERSON_ID_3_LOW_ID, Timestamp.valueOf("2024-01-02 10:00:00"));
            insertPersonWithCreatedAt(conn, PERSON_ID_4, Timestamp.valueOf("2024-01-03 10:00:00"));
        }

        // 3. Migrate up to V159
        Flyway flyway159 = Flyway.configure()
                .dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration")
                .target("159")
                .load();
        flyway159.migrate();
    }

    private static void insertPersonWithCreatedAt(Connection conn, UUID id, Timestamp createdAt) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
                "INSERT INTO persons (id, first_name, last_name, gender, dob, ic_or_passport, nationality, identification_verification_status, created_at) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")) {
            ps.setObject(1, id);
            ps.setString(2, "TestFirst");
            ps.setString(3, "TestLast");
            ps.setString(4, "MALE");
            ps.setDate(5, Date.valueOf("2000-01-01"));
            ps.setString(6, "SYNTHETIC-" + UUID.randomUUID());
            ps.setString(7, "MALAYSIAN");
            ps.setString(8, "UNVERIFIED");
            ps.setTimestamp(9, createdAt);
            ps.executeUpdate();
        }
    }

    private static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(jdbcUrl, username, password);
    }

    private String getRegistrationNo(Connection conn, UUID personId) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement("SELECT registration_no FROM persons WHERE id = ?")) {
            ps.setObject(1, personId);
            try (ResultSet rs = ps.executeQuery()) {
                assertThat(rs.next()).isTrue();
                return rs.getString("registration_no");
            }
        }
    }

    @Test
    @DisplayName("Pre-V159 persons are numbered AOS-000001 to AOS-000004 by created_at, then id")
    void existingPersons_numberedInCreationOrderThenId() throws Exception {
        try (Connection conn = getConnection()) {
            assertThat(getRegistrationNo(conn, PERSON_ID_1)).isEqualTo("AOS-000001");
            assertThat(getRegistrationNo(conn, PERSON_ID_3_LOW_ID)).isEqualTo("AOS-000002");
            assertThat(getRegistrationNo(conn, PERSON_ID_2_HIGH_ID)).isEqualTo("AOS-000003");
            assertThat(getRegistrationNo(conn, PERSON_ID_4)).isEqualTo("AOS-000004");
        }
    }

    @Test
    @DisplayName("New JDBC insert without registration_no gets default AOS-000005")
    void newInsertWithoutRegistrationNo_getsNextNumber() throws Exception {
        UUID newPersonId = UUID.randomUUID();
        try (Connection conn = getConnection()) {
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO persons (id, first_name, last_name, gender, dob, ic_or_passport, nationality, identification_verification_status) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?)")) {
                ps.setObject(1, newPersonId);
                ps.setString(2, "New");
                ps.setString(3, "Person");
                ps.setString(4, "FEMALE");
                ps.setDate(5, Date.valueOf("1995-05-15"));
                ps.setString(6, "SYNTHETIC-" + UUID.randomUUID());
                ps.setString(7, "MALAYSIAN");
                ps.setString(8, "UNVERIFIED");
                ps.executeUpdate();
            }

            assertThat(getRegistrationNo(conn, newPersonId)).isEqualTo("AOS-000005");
        }
    }

    @Test
    @DisplayName("NOT NULL, uc_persons_registration_no, and chk_persons_registration_no_format enforce constraints")
    void constraints_rejectNullDuplicateAndInvalidFormat() throws Exception {
        try (Connection conn = getConnection()) {
            // NOT NULL violation -> 23502
            assertThatThrownBy(() -> {
                try (PreparedStatement ps = conn.prepareStatement(
                        "INSERT INTO persons (id, first_name, last_name, gender, dob, ic_or_passport, nationality, identification_verification_status, registration_no) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)")) {
                    ps.setObject(1, UUID.randomUUID());
                    ps.setString(2, "Null");
                    ps.setString(3, "Reg");
                    ps.setString(4, "MALE");
                    ps.setDate(5, Date.valueOf("2000-01-01"));
                    ps.setString(6, "SYNTHETIC-" + UUID.randomUUID());
                    ps.setString(7, "MALAYSIAN");
                    ps.setString(8, "UNVERIFIED");
                    ps.executeUpdate();
                }
            }).isInstanceOf(SQLException.class)
              .satisfies(e -> assertThat(((SQLException) e).getSQLState()).isEqualTo("23502"));

            // Duplicate registration_no -> 23505 (uc_persons_registration_no)
            assertThatThrownBy(() -> {
                try (PreparedStatement ps = conn.prepareStatement(
                        "INSERT INTO persons (id, first_name, last_name, gender, dob, ic_or_passport, nationality, identification_verification_status, registration_no) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")) {
                    ps.setObject(1, UUID.randomUUID());
                    ps.setString(2, "Duplicate");
                    ps.setString(3, "Reg");
                    ps.setString(4, "MALE");
                    ps.setDate(5, Date.valueOf("2000-01-01"));
                    ps.setString(6, "SYNTHETIC-" + UUID.randomUUID());
                    ps.setString(7, "MALAYSIAN");
                    ps.setString(8, "UNVERIFIED");
                    ps.setString(9, "AOS-000001");
                    ps.executeUpdate();
                }
            }).isInstanceOf(SQLException.class)
              .satisfies(e -> {
                  SQLException sqlEx = (SQLException) e;
                  assertThat(sqlEx.getSQLState()).isEqualTo("23505");
                  assertThat(sqlEx.getMessage()).contains("uc_persons_registration_no");
              });

            // Invalid format (AOS-12) -> 23514 (chk_persons_registration_no_format)
            assertThatThrownBy(() -> {
                try (PreparedStatement ps = conn.prepareStatement(
                        "INSERT INTO persons (id, first_name, last_name, gender, dob, ic_or_passport, nationality, identification_verification_status, registration_no) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")) {
                    ps.setObject(1, UUID.randomUUID());
                    ps.setString(2, "Invalid");
                    ps.setString(3, "Format");
                    ps.setString(4, "MALE");
                    ps.setDate(5, Date.valueOf("2000-01-01"));
                    ps.setString(6, "SYNTHETIC-" + UUID.randomUUID());
                    ps.setString(7, "MALAYSIAN");
                    ps.setString(8, "UNVERIFIED");
                    ps.setString(9, "AOS-12");
                    ps.executeUpdate();
                }
            }).isInstanceOf(SQLException.class)
              .satisfies(e -> {
                  SQLException sqlEx = (SQLException) e;
                  assertThat(sqlEx.getSQLState()).isEqualTo("23514");
                  assertThat(sqlEx.getMessage()).contains("chk_persons_registration_no_format");
              });
        }
    }

    @Test
    @DisplayName("After setval to 999999, next insert gets AOS-1000000 without truncation")
    void sequenceGrowth_past999999() throws Exception {
        UUID highPersonId = UUID.randomUUID();
        try (Connection conn = getConnection()) {
            try (PreparedStatement ps = conn.prepareStatement("SELECT setval('person_registration_no_seq', 999999)")) {
                ps.executeQuery();
            }

            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO persons (id, first_name, last_name, gender, dob, ic_or_passport, nationality, identification_verification_status) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?)")) {
                ps.setObject(1, highPersonId);
                ps.setString(2, "Seven");
                ps.setString(3, "Digits");
                ps.setString(4, "MALE");
                ps.setDate(5, Date.valueOf("1999-09-09"));
                ps.setString(6, "SYNTHETIC-" + UUID.randomUUID());
                ps.setString(7, "MALAYSIAN");
                ps.setString(8, "UNVERIFIED");
                ps.executeUpdate();
            }

            assertThat(getRegistrationNo(conn, highPersonId)).isEqualTo("AOS-1000000");
        }
    }

    @AfterAll
    static void tearDown() {
        if (postgres != null && postgres.isRunning()) {
            postgres.stop();
        }
    }
}
