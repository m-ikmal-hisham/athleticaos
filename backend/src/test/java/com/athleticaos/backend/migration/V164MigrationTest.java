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
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("integration")
@Testcontainers
class V164MigrationTest {

    @Container
    @SuppressWarnings("resource")
    private static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("athleticaos_test")
            .withUsername("test")
            .withPassword("test");

    private static String jdbcUrl;
    private static String username;
    private static String password;

    private static final UUID ORG_ID = UUID.fromString("00000000-0000-4000-b000-000000000164");
    private static final UUID WITH_LINK = UUID.fromString("00000000-0000-4000-b000-000000001641");
    private static final UUID BLANK_LINK = UUID.fromString("00000000-0000-4000-b000-000000001642");
    private static final UUID NO_LINK = UUID.fromString("00000000-0000-4000-b000-000000001643");

    @BeforeAll
    static void setUp() throws Exception {
        postgres.start();
        jdbcUrl = postgres.getJdbcUrl();
        username = postgres.getUsername();
        password = postgres.getPassword();

        Flyway.configure().dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration").target("163").load().migrate();

        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password)) {
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO organisations (id, name, slug, org_type, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())")) {
                ps.setObject(1, ORG_ID);
                ps.setString(2, "Livestream Migration Org");
                ps.setString(3, "livestream-migration-org");
                ps.setString(4, "CLUB");
                ps.executeUpdate();
            }
            insertTournament(conn, WITH_LINK, "with-link", "  https://youtube.com/live/abc  ");
            insertTournament(conn, BLANK_LINK, "blank-link", "   ");
            insertTournament(conn, NO_LINK, "no-link", null);
        }

        Flyway.configure().dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration").target("164").load().migrate();
    }

    private static void insertTournament(Connection conn, UUID id, String slug, String livestreamUrl) throws Exception {
        try (PreparedStatement ps = conn.prepareStatement(
                "INSERT INTO tournaments (id, organiser_org_id, name, slug, level, venue, is_published, status, start_date, end_date, created_at, livestream_url) " +
                "VALUES (?, ?, ?, ?, 'REGIONAL', 'Park', true, 'PUBLISHED', CURRENT_DATE, CURRENT_DATE + 2, NOW(), ?)")) {
            ps.setObject(1, id);
            ps.setObject(2, ORG_ID);
            ps.setString(3, "Tournament " + slug);
            ps.setString(4, slug);
            ps.setString(5, livestreamUrl);
            ps.executeUpdate();
        }
    }

    private static String linksOf(UUID id) throws Exception {
        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password);
             PreparedStatement ps = conn.prepareStatement("SELECT livestream_links::text FROM tournaments WHERE id = ?")) {
            ps.setObject(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                return rs.getString(1);
            }
        }
    }

    @Test
    @DisplayName("V164 carries an existing single link over as the first entry, trimmed")
    void backfillsExistingLink() throws Exception {
        assertThat(linksOf(WITH_LINK)).isEqualTo("[{\"url\": \"https://youtube.com/live/abc\", \"label\": null}]");
    }

    @Test
    @DisplayName("V164 leaves tournaments without a link (null or blank) with no links")
    void skipsMissingLinks() throws Exception {
        assertThat(linksOf(BLANK_LINK)).isNull();
        assertThat(linksOf(NO_LINK)).isNull();
    }

    @Test
    @DisplayName("V164 adds a nullable livestream_url to matches")
    void addsMatchColumn() throws Exception {
        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password);
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT is_nullable, character_maximum_length FROM information_schema.columns " +
                     "WHERE table_name = 'matches' AND column_name = 'livestream_url'");
             ResultSet rs = ps.executeQuery()) {
            assertThat(rs.next()).isTrue();
            assertThat(rs.getString(1)).isEqualTo("YES");
            assertThat(rs.getInt(2)).isEqualTo(500);
        }
    }
}
