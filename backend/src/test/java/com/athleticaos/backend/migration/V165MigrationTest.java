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
class V165MigrationTest {

    @Container
    @SuppressWarnings("resource")
    private static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("athleticaos_test")
            .withUsername("test")
            .withPassword("test");

    private static String jdbcUrl;
    private static String username;
    private static String password;

    private static final UUID ORG_ID = UUID.fromString("00000000-0000-4000-b000-000000000165");
    private static final UUID IN_SYNC = UUID.fromString("00000000-0000-4000-b000-000000001651");
    private static final UUID ONLY_OLD_COLUMN = UUID.fromString("00000000-0000-4000-b000-000000001652");
    private static final UUID TWO_LINKS = UUID.fromString("00000000-0000-4000-b000-000000001653");
    private static final UUID NO_LINK = UUID.fromString("00000000-0000-4000-b000-000000001654");

    @BeforeAll
    static void setUp() throws Exception {
        postgres.start();
        jdbcUrl = postgres.getJdbcUrl();
        username = postgres.getUsername();
        password = postgres.getPassword();

        Flyway.configure().dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration").target("164").load().migrate();

        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password)) {
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO organisations (id, name, slug, org_type, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())")) {
                ps.setObject(1, ORG_ID);
                ps.setString(2, "Livestream Retire Org");
                ps.setString(3, "livestream-retire-org");
                ps.setString(4, "CLUB");
                ps.executeUpdate();
            }
            // What the application writes since V164: the column mirrors the first link.
            insert(conn, IN_SYNC, "in-sync", "https://youtu.be/a",
                    "[{\"label\": \"Pitch A\", \"url\": \"https://youtu.be/a\"}]");
            // Written outside the application: old column only.
            insert(conn, ONLY_OLD_COLUMN, "only-old", " https://youtu.be/old ", null);
            insert(conn, TWO_LINKS, "two-links", "https://youtu.be/1",
                    "[{\"label\": \"Pitch A\", \"url\": \"https://youtu.be/1\"}, {\"label\": \"Pitch B\", \"url\": \"https://youtu.be/2\"}]");
            insert(conn, NO_LINK, "no-link", null, null);
        }

        Flyway.configure().dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration").target("165").load().migrate();
    }

    private static void insert(Connection conn, UUID id, String slug, String url, String linksJson) throws Exception {
        try (PreparedStatement ps = conn.prepareStatement(
                "INSERT INTO tournaments (id, organiser_org_id, name, slug, level, venue, is_published, status, start_date, end_date, created_at, livestream_url, livestream_links) "
                        + "VALUES (?, ?, ?, ?, 'REGIONAL', 'Park', true, 'PUBLISHED', CURRENT_DATE, CURRENT_DATE + 2, NOW(), ?, ?::jsonb)")) {
            ps.setObject(1, id);
            ps.setObject(2, ORG_ID);
            ps.setString(3, "Tournament " + slug);
            ps.setString(4, slug);
            ps.setString(5, url);
            ps.setString(6, linksJson);
            ps.executeUpdate();
        }
    }

    private static String links(UUID id) throws Exception {
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
    @DisplayName("V165 drops tournaments.livestream_url")
    void dropsTheColumn() throws Exception {
        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password);
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT count(*) FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'livestream_url'");
             ResultSet rs = ps.executeQuery()) {
            rs.next();
            assertThat(rs.getInt(1)).isZero();
        }
    }

    @Test
    @DisplayName("V165 keeps a link that only existed in the old column")
    void keepsAnOldOnlyLink() throws Exception {
        assertThat(links(ONLY_OLD_COLUMN)).isEqualTo("[{\"url\": \"https://youtu.be/old\", \"label\": null}]");
    }

    @Test
    @DisplayName("V165 leaves existing link lists untouched")
    void leavesListsAlone() throws Exception {
        assertThat(links(IN_SYNC)).isEqualTo("[{\"url\": \"https://youtu.be/a\", \"label\": \"Pitch A\"}]");
        assertThat(links(TWO_LINKS)).contains("https://youtu.be/1").contains("https://youtu.be/2");
        assertThat(links(NO_LINK)).isNull();
    }
}
