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
class V163MigrationTest {

    @Container
    @SuppressWarnings("resource")
    private static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("athleticaos_test")
            .withUsername("test")
            .withPassword("test");

    private static String jdbcUrl;
    private static String username;
    private static String password;

    private static final UUID ORG_ID = UUID.fromString("00000000-0000-4000-c000-000000000101");
    private static final UUID TOURNAMENT_1_ID = UUID.fromString("00000000-0000-4000-c000-000000000102");
    private static final UUID TOURNAMENT_2_ID = UUID.fromString("00000000-0000-4000-c000-000000000103");
    private static final UUID TOURNAMENT_3_ID = UUID.fromString("00000000-0000-4000-c000-000000000104");

    private static final UUID MATCH_1_ID = UUID.fromString("00000000-0000-4000-c000-000000000201");
    private static final UUID MATCH_2_ID = UUID.fromString("00000000-0000-4000-c000-000000000202");
    private static final UUID MATCH_3_ID = UUID.fromString("00000000-0000-4000-c000-000000000203");
    private static final UUID MATCH_4_ID = UUID.fromString("00000000-0000-4000-c000-000000000204");
    private static final UUID MATCH_5_ID = UUID.fromString("00000000-0000-4000-c000-000000000205");
    private static final UUID MATCH_6_ID = UUID.fromString("00000000-0000-4000-c000-000000000206");

    @BeforeAll
    static void setUp() throws Exception {
        postgres.start();
        jdbcUrl = postgres.getJdbcUrl();
        username = postgres.getUsername();
        password = postgres.getPassword();

        // 1. Migrate up to V162
        Flyway flyway162 = Flyway.configure()
                .dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration")
                .target("162")
                .load();
        flyway162.migrate();

        // 2. Seed data under V162 schema
        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password)) {
            // Seed organisation
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO organisations (id, name, org_type, slug, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)")) {
                ps.setObject(1, ORG_ID);
                ps.setString(2, "Test Org V163");
                ps.setString(3, "CLUB");
                ps.setString(4, "test-org-v163");
                ps.executeUpdate();
            }

            // Tournament 1: has matches with distinct venues (including casing and whitespace variants)
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO tournaments (id, organiser_org_id, name, slug, level, venue, is_published, status, start_date, end_date, created_at) " +
                            "VALUES (?, ?, ?, ?, 'REGIONAL', 'Headline Sports Complex', true, 'DRAFT', CURRENT_DATE, CURRENT_DATE, CURRENT_TIMESTAMP)")) {
                ps.setObject(1, TOURNAMENT_1_ID);
                ps.setObject(2, ORG_ID);
                ps.setString(3, "Tournament 1 with Matches");
                ps.setString(4, "t1-matches");
                ps.executeUpdate();
            }

            // Tournament 2: no matches, but has headline venue
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO tournaments (id, organiser_org_id, name, slug, level, venue, is_published, status, start_date, end_date, created_at) " +
                            "VALUES (?, ?, ?, ?, 'REGIONAL', 'Fallback Stadium', true, 'DRAFT', CURRENT_DATE, CURRENT_DATE, CURRENT_TIMESTAMP)")) {
                ps.setObject(1, TOURNAMENT_2_ID);
                ps.setObject(2, ORG_ID);
                ps.setString(3, "Tournament 2 Headline Only");
                ps.setString(4, "t2-headline");
                ps.executeUpdate();
            }

            // Tournament 3: no matches and headline venue is blank
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO tournaments (id, organiser_org_id, name, slug, level, venue, is_published, status, start_date, end_date, created_at) " +
                            "VALUES (?, ?, ?, ?, 'REGIONAL', '   ', true, 'DRAFT', CURRENT_DATE, CURRENT_DATE, CURRENT_TIMESTAMP)")) {
                ps.setObject(1, TOURNAMENT_3_ID);
                ps.setObject(2, ORG_ID);
                ps.setString(3, "Tournament 3 Blank Venue");
                ps.setString(4, "t3-blank");
                ps.executeUpdate();
            }

            // Seed matches for Tournament 1
            // "Stadium Alpha" variations
            insertMatch(conn, MATCH_1_ID, TOURNAMENT_1_ID, 1, "Stadium Alpha");
            insertMatch(conn, MATCH_2_ID, TOURNAMENT_1_ID, 2, "Stadium Alpha  ");
            insertMatch(conn, MATCH_3_ID, TOURNAMENT_1_ID, 3, "stadium alpha");
            // "Stadium Beta"
            insertMatch(conn, MATCH_4_ID, TOURNAMENT_1_ID, 1, "Stadium Beta");
            // Unassigned matches
            insertMatch(conn, MATCH_5_ID, TOURNAMENT_1_ID, 1, null);
            insertMatch(conn, MATCH_6_ID, TOURNAMENT_1_ID, 2, "   ");
        }

        // 3. Migrate to V163
        Flyway flyway163 = Flyway.configure()
                .dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration")
                .target("163")
                .load();
        flyway163.migrate();
    }

    private static void insertMatch(Connection conn, UUID id, UUID tournamentId, int matchNumber, String venue) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
                "INSERT INTO matches (id, tournament_id, match_number, venue, status, match_date, kick_off_time, created_at, updated_at) " +
                        "VALUES (?, ?, ?, ?, 'SCHEDULED', CURRENT_DATE, CURRENT_TIME, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)")) {
            ps.setObject(1, id);
            ps.setObject(2, tournamentId);
            ps.setInt(3, matchNumber);
            ps.setString(4, venue);
            ps.executeUpdate();
        }
    }

    @Test
    @DisplayName("V163 creates tournament_venues table and backfills distinct venues per tournament")
    void backfillPopulatesVenues() throws SQLException {
        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password)) {
            // Tournament 1 should have exactly 2 venues: "Stadium Alpha" and "Stadium Beta" (case/whitespace deduplicated)
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT count(*) FROM tournament_venues WHERE tournament_id = ? AND deleted = false")) {
                ps.setObject(1, TOURNAMENT_1_ID);
                try (ResultSet rs = ps.executeQuery()) {
                    assertThat(rs.next()).isTrue();
                    assertThat(rs.getInt(1)).isEqualTo(2);
                }
            }

            // Tournament 2 should have 1 venue backfilled from tournaments.venue ("Fallback Stadium")
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT name FROM tournament_venues WHERE tournament_id = ? AND deleted = false")) {
                ps.setObject(1, TOURNAMENT_2_ID);
                try (ResultSet rs = ps.executeQuery()) {
                    assertThat(rs.next()).isTrue();
                    assertThat(rs.getString("name")).isEqualTo("Fallback Stadium");
                }
            }

            // Tournament 3 should have 0 venues
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT count(*) FROM tournament_venues WHERE tournament_id = ? AND deleted = false")) {
                ps.setObject(1, TOURNAMENT_3_ID);
                try (ResultSet rs = ps.executeQuery()) {
                    assertThat(rs.next()).isTrue();
                    assertThat(rs.getInt(1)).isZero();
                }
            }
        }
    }

    @Test
    @DisplayName("V163 updates matches.venue_id and retains matches.venue denormalized string")
    void matchesVenueIdUpdatedAndVenueStringPreserved() throws SQLException {
        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password)) {
            // Matches 1, 2, and 3 should all point to the SAME venue_id for "Stadium Alpha"
            UUID venueAlphaId = null;
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT id FROM tournament_venues WHERE tournament_id = ? AND LOWER(TRIM(name)) = 'stadium alpha'")) {
                ps.setObject(1, TOURNAMENT_1_ID);
                try (ResultSet rs = ps.executeQuery()) {
                    assertThat(rs.next()).isTrue();
                    venueAlphaId = (UUID) rs.getObject("id");
                }
            }
            assertThat(venueAlphaId).isNotNull();

            for (UUID matchId : new UUID[]{ MATCH_1_ID, MATCH_2_ID, MATCH_3_ID }) {
                try (PreparedStatement ps = conn.prepareStatement(
                        "SELECT venue_id, venue FROM matches WHERE id = ?")) {
                    ps.setObject(1, matchId);
                    try (ResultSet rs = ps.executeQuery()) {
                        assertThat(rs.next()).isTrue();
                        assertThat((UUID) rs.getObject("venue_id")).isEqualTo(venueAlphaId);
                        assertThat(rs.getString("venue")).isNotNull(); // denormalized string kept
                    }
                }
            }

            // Match 4 should point to "Stadium Beta"
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT m.venue_id, tv.name FROM matches m JOIN tournament_venues tv ON m.venue_id = tv.id WHERE m.id = ?")) {
                ps.setObject(1, MATCH_4_ID);
                try (ResultSet rs = ps.executeQuery()) {
                    assertThat(rs.next()).isTrue();
                    assertThat(rs.getString("name")).isEqualTo("Stadium Beta");
                }
            }

            // Matches 5 and 6 had null/blank venue, so venue_id must be NULL
            for (UUID matchId : new UUID[]{ MATCH_5_ID, MATCH_6_ID }) {
                try (PreparedStatement ps = conn.prepareStatement(
                        "SELECT venue_id FROM matches WHERE id = ?")) {
                    ps.setObject(1, matchId);
                    try (ResultSet rs = ps.executeQuery()) {
                        assertThat(rs.next()).isTrue();
                        assertThat((UUID) rs.getObject("venue_id")).isNull();
                    }
                }
            }
        }
    }

    @Test
    @DisplayName("V163 enforces uq_matches_tournament_venue_id_match_number on venue_id")
    void uniqueIndexEnforcedOnVenueId() throws SQLException {
        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password)) {
            // Find "Stadium Beta" venue ID
            UUID venueBetaId;
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT id FROM tournament_venues WHERE tournament_id = ? AND name = 'Stadium Beta'")) {
                ps.setObject(1, TOURNAMENT_1_ID);
                try (ResultSet rs = ps.executeQuery()) {
                    assertThat(rs.next()).isTrue();
                    venueBetaId = (UUID) rs.getObject("id");
                }
            }

            // Inserting duplicate match_number=1 with same venue_id must fail
            UUID duplicateBeta = UUID.randomUUID();
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO matches (id, tournament_id, venue_id, match_number, status, match_date, kick_off_time, created_at, updated_at) " +
                            "VALUES (?, ?, ?, 1, 'SCHEDULED', CURRENT_DATE, CURRENT_TIME, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)")) {
                ps.setObject(1, duplicateBeta);
                ps.setObject(2, TOURNAMENT_1_ID);
                ps.setObject(3, venueBetaId);
                assertThatThrownBy(ps::executeUpdate)
                        .isInstanceOf(SQLException.class);
            }

            // Inserting duplicate match_number=1 with venue_id=null (unassigned) must also fail (sentinel UUID collision)
            UUID duplicateUnassigned = UUID.randomUUID();
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO matches (id, tournament_id, venue_id, match_number, status, match_date, kick_off_time, created_at, updated_at) " +
                            "VALUES (?, ?, NULL, 1, 'SCHEDULED', CURRENT_DATE, CURRENT_TIME, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)")) {
                ps.setObject(1, duplicateUnassigned);
                ps.setObject(2, TOURNAMENT_1_ID);
                assertThatThrownBy(ps::executeUpdate)
                        .isInstanceOf(SQLException.class);
            }

            // Inserting match_number=3 with venue_id=null must succeed (matches 5 and 6 took 1 and 2)
            UUID newUnassigned = UUID.randomUUID();
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO matches (id, tournament_id, venue_id, match_number, status, match_date, kick_off_time, created_at, updated_at) " +
                            "VALUES (?, ?, NULL, 3, 'SCHEDULED', CURRENT_DATE, CURRENT_TIME, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)")) {
                ps.setObject(1, newUnassigned);
                ps.setObject(2, TOURNAMENT_1_ID);
                int inserted = ps.executeUpdate();
                assertThat(inserted).isEqualTo(1);
            }
        }
    }

    @Test
    @DisplayName("V163 enforces uq_tournament_venue_name uniqueness per tournament")
    void venueNameUniquePerTournament() throws SQLException {
        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password)) {
            // Inserting "stadium beta" under Tournament 1 must fail (case-insensitive duplicate)
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO tournament_venues (id, tournament_id, name, display_order, created_at, updated_at) " +
                            "VALUES (?, ?, 'stadium beta', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)")) {
                ps.setObject(1, UUID.randomUUID());
                ps.setObject(2, TOURNAMENT_1_ID);
                assertThatThrownBy(ps::executeUpdate)
                        .isInstanceOf(SQLException.class);
            }

            // Inserting "Stadium Beta" under Tournament 2 must SUCCEED (different tournament)
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO tournament_venues (id, tournament_id, name, display_order, created_at, updated_at) " +
                            "VALUES (?, ?, 'Stadium Beta', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)")) {
                ps.setObject(1, UUID.randomUUID());
                ps.setObject(2, TOURNAMENT_2_ID);
                int inserted = ps.executeUpdate();
                assertThat(inserted).isEqualTo(1);
            }
        }
    }
}
