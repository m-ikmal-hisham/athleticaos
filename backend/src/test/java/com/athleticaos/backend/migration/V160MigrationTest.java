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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration test for Flyway migration V160: remove IC/passport data and rename attestation columns.
 * Uses Testcontainers PostgreSQL:16-alpine.
 */
@Tag("integration")
@Testcontainers
class V160MigrationTest {

    @Container
    @SuppressWarnings("resource")
    private static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("athleticaos_test")
            .withUsername("test")
            .withPassword("test");

    private static String jdbcUrl;
    private static String username;
    private static String password;

    private static final UUID ADMIN_USER_ID = UUID.fromString("00000000-0000-4000-a000-000000000001");
    private static final UUID PERSON_LEGACY_ID = UUID.fromString("00000000-0000-4000-e000-000000000001");
    private static final UUID PERSON_FLAGGED_ID = UUID.fromString("00000000-0000-4000-e000-000000000002");
    private static final UUID PERSON_UNVERIFIED_ID = UUID.fromString("00000000-0000-4000-e000-000000000003");
    private static final UUID PERSON_VERIFIED_ID = UUID.fromString("00000000-0000-4000-e000-000000000004");
    private static final Timestamp ATTESTATION_TIME = Timestamp.valueOf("2024-06-01 12:00:00");

    @BeforeAll
    static void setUp() throws Exception {
        postgres.start();
        jdbcUrl = postgres.getJdbcUrl();
        username = postgres.getUsername();
        password = postgres.getPassword();

        // 1. Migrate up to V159
        Flyway flyway159 = Flyway.configure()
                .dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration")
                .target("159")
                .load();
        flyway159.migrate();

        // 2. Seed a user and four persons (LEGACY, FLAGGED, UNVERIFIED, and VERIFIED with full attestation)
        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password)) {
            // Seed user
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO users (id, email, password_hash, first_name, last_name, is_active) " +
                    "VALUES (?, ?, ?, ?, ?, ?)")) {
                ps.setObject(1, ADMIN_USER_ID);
                ps.setString(2, "v160-admin@athleticaos.com");
                ps.setString(3, "synthetic_hash");
                ps.setString(4, "Admin");
                ps.setString(5, "User");
                ps.setBoolean(6, true);
                ps.executeUpdate();
            }

            // Seed LEGACY person (with old hash and identification fields)
            insertV159Person(conn, PERSON_LEGACY_ID, "Legacy", "Person", "MALE", "LEGACY",
                    null, null, null, null,
                    "QAP000001", "MALAYSIAN_IC", "QAP000001",
                    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", 1);

            // Seed FLAGGED person
            insertV159Person(conn, PERSON_FLAGGED_ID, "Flagged", "Person", "FEMALE", "FLAGGED",
                    null, null, null, null,
                    "QAP000002", "PASSPORT", "QAP000002",
                    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b856", 1);

            // Seed UNVERIFIED person
            insertV159Person(conn, PERSON_UNVERIFIED_ID, "Unverified", "Person", "MALE", "UNVERIFIED",
                    null, null, null, null,
                    "QAP000003", "MALAYSIAN_IC", "QAP000003",
                    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b857", 1);

            // Seed VERIFIED person with full attestation
            insertV159Person(conn, PERSON_VERIFIED_ID, "Verified", "Person", "FEMALE", "VERIFIED",
                    ATTESTATION_TIME, ADMIN_USER_ID, "Admin User", "PRE_REGISTRATION_RECORD",
                    "QAP000004", "DOCUMENT_SIGHTED", "QAP000004",
                    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b858", 1);
        }

        // 3. Migrate to latest (applies V160)
        Flyway flywayLatest = Flyway.configure()
                .dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration")
                .load();
        flywayLatest.migrate();
    }

    private static void insertV159Person(Connection conn, UUID id, String firstName, String lastName,
                                         String gender, String status,
                                         Timestamp verifiedAt, UUID verifiedBy, String verifiedByName, String method,
                                         String icOrPassport, String idType, String idValue,
                                         String idHash, Integer hashVersion) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
                "INSERT INTO persons (id, first_name, last_name, gender, dob, nationality, email, " +
                "ic_or_passport, identification_type, identification_value, identification_hash, identification_hash_version, " +
                "identification_verification_status, identification_verified_at, identification_verified_by, " +
                "identification_verified_by_name, identification_verification_method) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")) {
            ps.setObject(1, id);
            ps.setString(2, firstName);
            ps.setString(3, lastName);
            ps.setString(4, gender);
            ps.setDate(5, Date.valueOf("1995-05-15"));
            ps.setString(6, "MALAYSIAN");
            ps.setString(7, firstName.toLowerCase() + "@example.invalid");
            ps.setString(8, icOrPassport);
            ps.setString(9, idType);
            ps.setString(10, idValue);
            ps.setString(11, idHash);
            ps.setObject(12, hashVersion);
            ps.setString(13, status);
            ps.setTimestamp(14, verifiedAt);
            ps.setObject(15, verifiedBy);
            ps.setString(16, verifiedByName);
            ps.setString(17, method);
            ps.executeUpdate();
        }
    }

    private static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(jdbcUrl, username, password);
    }

    @Test
    @DisplayName("information_schema.columns has none of the dropped IC/passport columns")
    void droppedIdentificationColumns_doNotExist() throws Exception {
        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT column_name FROM information_schema.columns WHERE table_name = 'persons'")) {
            List<String> columns = new ArrayList<>();
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    columns.add(rs.getString("column_name"));
                }
            }
            assertThat(columns).doesNotContain(
                    "ic_or_passport",
                    "identification_type",
                    "identification_value",
                    "identification_hash",
                    "identification_hash_version"
            );
        }
    }

    @Test
    @DisplayName("The five record_* columns exist and constraints/indexes are created")
    void recordColumnsAndConstraints_exist() throws Exception {
        try (Connection conn = getConnection()) {
            // Columns check
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT column_name FROM information_schema.columns WHERE table_name = 'persons'")) {
                List<String> columns = new ArrayList<>();
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        columns.add(rs.getString("column_name"));
                    }
                }
                assertThat(columns).contains(
                        "record_verification_status",
                        "record_verified_at",
                        "record_verified_by",
                        "record_verified_by_name",
                        "record_verification_method"
                );
            }

            // Constraints check
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT conname FROM pg_constraint WHERE conrelid = 'persons'::regclass")) {
                List<String> constraints = new ArrayList<>();
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        constraints.add(rs.getString("conname"));
                    }
                }
                assertThat(constraints).contains(
                        "chk_persons_record_verification_status",
                        "chk_persons_record_verification_method",
                        "chk_persons_record_verification_attestation",
                        "fk_persons_record_verified_by"
                );
            }

            // Index check
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT indexname FROM pg_indexes WHERE tablename = 'persons'")) {
                List<String> indexes = new ArrayList<>();
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        indexes.add(rs.getString("indexname"));
                    }
                }
                assertThat(indexes).contains("idx_persons_record_verification_status");
            }
        }
    }

    @Test
    @DisplayName("LEGACY and FLAGGED became UNVERIFIED with NULL attestation; VERIFIED kept attestation")
    void statusConversion_andAttestationPreservation() throws Exception {
        try (Connection conn = getConnection()) {
            // Check LEGACY row
            assertPersonRecordVerification(conn, PERSON_LEGACY_ID, "UNVERIFIED", null, null, null, null);

            // Check FLAGGED row
            assertPersonRecordVerification(conn, PERSON_FLAGGED_ID, "UNVERIFIED", null, null, null, null);

            // Check UNVERIFIED row
            assertPersonRecordVerification(conn, PERSON_UNVERIFIED_ID, "UNVERIFIED", null, null, null, null);

            // Check VERIFIED row
            assertPersonRecordVerification(conn, PERSON_VERIFIED_ID, "VERIFIED", ATTESTATION_TIME, ADMIN_USER_ID, "Admin User", "PRE_REGISTRATION_RECORD");
        }
    }

    private void assertPersonRecordVerification(Connection conn, UUID id, String expectedStatus,
                                                Timestamp expectedAt, UUID expectedBy,
                                                String expectedByName, String expectedMethod) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT record_verification_status, record_verified_at, record_verified_by, " +
                "record_verified_by_name, record_verification_method FROM persons WHERE id = ?")) {
            ps.setObject(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getString("record_verification_status")).isEqualTo(expectedStatus);
                if (expectedAt == null) {
                    assertThat(rs.getTimestamp("record_verified_at")).isNull();
                    assertThat(rs.getObject("record_verified_by")).isNull();
                    assertThat(rs.getString("record_verified_by_name")).isNull();
                    assertThat(rs.getString("record_verification_method")).isNull();
                } else {
                    assertThat(rs.getTimestamp("record_verified_at")).isEqualTo(expectedAt);
                    assertThat((UUID) rs.getObject("record_verified_by")).isEqualTo(expectedBy);
                    assertThat(rs.getString("record_verified_by_name")).isEqualTo(expectedByName);
                    assertThat(rs.getString("record_verification_method")).isEqualTo(expectedMethod);
                }
            }
        }
    }

    @Test
    @DisplayName("Setting a non-VERIFIED row to VERIFIED without attestation is rejected by constraint")
    void settingVerifiedWithoutAttestation_rejected() throws Exception {
        try (Connection conn = getConnection()) {
            assertThatThrownBy(() -> {
                try (PreparedStatement ps = conn.prepareStatement(
                        "UPDATE persons SET record_verification_status = 'VERIFIED' WHERE id = ?")) {
                    ps.setObject(1, PERSON_UNVERIFIED_ID);
                    ps.executeUpdate();
                }
            }).isInstanceOf(SQLException.class)
              .satisfies(e -> {
                  SQLException sqlEx = (SQLException) e;
                  assertThat(sqlEx.getSQLState()).isEqualTo("23514");
                  assertThat(sqlEx.getMessage()).contains("chk_persons_record_verification_attestation");
              });
        }
    }

    @Test
    @DisplayName("registration_no values are unchanged by V160 migration")
    void registrationNumbers_unchanged() throws Exception {
        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT id, registration_no FROM persons ORDER BY id ASC")) {
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    String regNo = rs.getString("registration_no");
                    assertThat(regNo).isNotNull();
                    assertThat(regNo).matches("^AOS-\\d{6,}$");
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
