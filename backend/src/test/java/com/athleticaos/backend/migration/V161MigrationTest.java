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
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Tag("integration")
@Testcontainers
class V161MigrationTest {

    @Container
    @SuppressWarnings("resource")
    private static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("athleticaos_test")
            .withUsername("test")
            .withPassword("test");

    private static String jdbcUrl;
    private static String username;
    private static String password;

    private static final UUID ORG_ID = UUID.fromString("00000000-0000-4000-a000-000000000101");
    private static final UUID TOURNAMENT_ID = UUID.fromString("00000000-0000-4000-a000-000000000102");
    private static final UUID MATCH_1_ID = UUID.fromString("00000000-0000-4000-a000-000000000103");
    private static final UUID MATCH_2_ID = UUID.fromString("00000000-0000-4000-a000-000000000104");
    private static final UUID MATCH_3_ID = UUID.fromString("00000000-0000-4000-a000-000000000105");

    @BeforeAll
    static void setUp() throws Exception {
        postgres.start();
        jdbcUrl = postgres.getJdbcUrl();
        username = postgres.getUsername();
        password = postgres.getPassword();

        // 1. Migrate up to V160
        Flyway flyway160 = Flyway.configure()
                .dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration")
                .target("160")
                .load();
        flyway160.migrate();

        // 2. Seed an organisation, a tournament, and matches
        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password)) {
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO organisations (id, name, org_type, slug, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)")) {
                ps.setObject(1, ORG_ID);
                ps.setString(2, "Test Org V161");
                ps.setString(3, "CLUB");
                ps.setString(4, "test-org-v161");
                ps.executeUpdate();
            }

            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO tournaments (id, organiser_org_id, name, slug, level, venue, is_published, status, start_date, end_date, created_at) " +
                            "VALUES (?, ?, ?, ?, 'REGIONAL', 'Test Complex', true, 'DRAFT', CURRENT_DATE, CURRENT_DATE, CURRENT_TIMESTAMP)")) {
                ps.setObject(1, TOURNAMENT_ID);
                ps.setObject(2, ORG_ID);
                ps.setString(3, "Test Tournament V161");
                ps.setString(4, "test-tournament-v161");
                ps.executeUpdate();
            }

            // Seed matches with distinct match numbers under V160
            insertMatch(conn, MATCH_1_ID, TOURNAMENT_ID, 1, "Pitch A");
            insertMatch(conn, MATCH_2_ID, TOURNAMENT_ID, 2, "Pitch B");
            insertMatch(conn, MATCH_3_ID, TOURNAMENT_ID, 3, null);
        }

        // 3. Migrate to V161
        Flyway flyway161 = Flyway.configure()
                .dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration")
                .target("161")
                .load();
        flyway161.migrate();
    }

    private static void insertMatch(Connection conn, UUID id, UUID tournamentId, int matchNumber, String venue) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
                "INSERT INTO matches (id, tournament_id, match_number, venue, status, match_date, kick_off_time, created_at, updated_at) VALUES (?, ?, ?, ?, 'SCHEDULED', CURRENT_DATE, CURRENT_TIME, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)")) {
            ps.setObject(1, id);
            ps.setObject(2, tournamentId);
            ps.setInt(3, matchNumber);
            ps.setString(4, venue);
            ps.executeUpdate();
        }
    }

    @Test
    @DisplayName("V161 drops old global constraint and creates per-venue unique index")
    void indexReplacedCorrectly() throws SQLException {
        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password)) {
            // Check old unique constraint/index does not exist
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT count(*) FROM pg_indexes WHERE tablename = 'matches' AND indexname = 'uq_matches_tournament_match_number'")) {
                try (ResultSet rs = ps.executeQuery()) {
                    assertThat(rs.next()).isTrue();
                    assertThat(rs.getInt(1)).isZero();
                }
            }

            // Check new unique index exists
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT count(*) FROM pg_indexes WHERE tablename = 'matches' AND indexname = 'uq_matches_tournament_venue_match_number'")) {
                try (ResultSet rs = ps.executeQuery()) {
                    assertThat(rs.next()).isTrue();
                    assertThat(rs.getInt(1)).isEqualTo(1);
                }
            }
        }
    }

    @Test
    @DisplayName("Existing match numbers were preserved untouched by V161 migration")
    void existingMatchNumbersPreserved() throws SQLException {
        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password)) {
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT match_number FROM matches WHERE id = ?")) {
                ps.setObject(1, MATCH_1_ID);
                try (ResultSet rs = ps.executeQuery()) {
                    assertThat(rs.next()).isTrue();
                    assertThat(rs.getInt(1)).isEqualTo(1);
                }

                ps.setObject(1, MATCH_2_ID);
                try (ResultSet rs = ps.executeQuery()) {
                    assertThat(rs.next()).isTrue();
                    assertThat(rs.getInt(1)).isEqualTo(2);
                }

                ps.setObject(1, MATCH_3_ID);
                try (ResultSet rs = ps.executeQuery()) {
                    assertThat(rs.next()).isTrue();
                    assertThat(rs.getInt(1)).isEqualTo(3);
                }
            }
        }
    }

    @Test
    @DisplayName("Two matches can share the same match number across different venues, but collide within same venue")
    void perVenueUniquenessEnforced() throws SQLException {
        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password)) {
            // MATCH_1 has match_number=1 on "Pitch A".
            // Adding match_number=1 on "Pitch B" should succeed under V161!
            UUID pitchBMatch1 = UUID.randomUUID();
            insertMatch(conn, pitchBMatch1, TOURNAMENT_ID, 1, "Pitch B");

            // Adding duplicate match_number=1 on "Pitch A" should fail!
            UUID duplicatePitchA = UUID.randomUUID();
            assertThatThrownBy(() -> insertMatch(conn, duplicatePitchA, TOURNAMENT_ID, 1, "Pitch A"))
                    .isInstanceOf(SQLException.class);

            // Adding duplicate match_number=1 with trailing spaces "Pitch A  " should also fail due to TRIM
            UUID duplicatePitchATrim = UUID.randomUUID();
            assertThatThrownBy(() -> insertMatch(conn, duplicatePitchATrim, TOURNAMENT_ID, 1, "Pitch A  "))
                    .isInstanceOf(SQLException.class);

            // MATCH_3 has match_number=3 on null venue (unassigned).
            // Adding duplicate match_number=3 on blank venue "" should fail because COALESCE(NULLIF(TRIM(venue), ''), '') maps both to ''
            UUID duplicateUnassigned = UUID.randomUUID();
            assertThatThrownBy(() -> insertMatch(conn, duplicateUnassigned, TOURNAMENT_ID, 3, "   "))
                    .isInstanceOf(SQLException.class);
        }
    }
}
