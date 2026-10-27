package com.athleticaos.backend.migration;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("integration")
@Testcontainers
class V174MigrationTest {

    @Container
    @SuppressWarnings("resource")
    private static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("athleticaos_test")
            .withUsername("test")
            .withPassword("test");

    private static String jdbcUrl;
    private static String username;
    private static String password;

    // Case A: 7s normal sub restored and kept
    static final UUID MATCH_A = UUID.randomUUID();
    static final UUID TEAM_A = UUID.randomUUID();
    static final List<UUID> PLAYERS_A_STARTERS = generateIds(7);
    static final List<UUID> PLAYERS_A_BENCH = generateIds(3);

    // Case B: 15s repaired to 15, and 10s repaired to 10
    static final UUID MATCH_B_15 = UUID.randomUUID();
    static final UUID TEAM_B_15 = UUID.randomUUID();
    static final List<UUID> PLAYERS_B15_STARTERS = generateIds(15);
    static final List<UUID> PLAYERS_B15_BENCH = generateIds(7);

    static final UUID MATCH_B_10 = UUID.randomUUID();
    static final UUID TEAM_B_10 = UUID.randomUUID();
    static final List<UUID> PLAYERS_B10_STARTERS = generateIds(10);
    static final List<UUID> PLAYERS_B10_BENCH = generateIds(5);

    // Case C & E: Same match, Team C1 has duplicate OFF (reverted), Team C2 has no subs (untouched)
    static final UUID MATCH_C = UUID.randomUUID();
    static final UUID TEAM_C1 = UUID.randomUUID();
    static final UUID TEAM_C2 = UUID.randomUUID();
    static final List<UUID> PLAYERS_C1_STARTERS = generateIds(15);
    static final List<UUID> PLAYERS_C1_BENCH = generateIds(7);
    static final List<UUID> PLAYERS_C2_STARTERS = generateIds(15);
    static final List<UUID> PLAYERS_C2_BENCH = generateIds(7);

    // Case D: 7s with duplicate ON leaving 6 starters (reverted)
    static final UUID MATCH_D = UUID.randomUUID();
    static final UUID TEAM_D = UUID.randomUUID();
    static final List<UUID> PLAYERS_D_STARTERS = generateIds(7);
    static final List<UUID> PLAYERS_D_BENCH = generateIds(3);

    // Case F: 6 starters non-standard swap (delta 0, kept)
    static final UUID MATCH_F = UUID.randomUUID();
    static final UUID TEAM_F = UUID.randomUUID();
    static final List<UUID> PLAYERS_F_STARTERS = generateIds(6);
    static final List<UUID> PLAYERS_F_BENCH = generateIds(4);

    private static List<UUID> generateIds(int count) {
        List<UUID> list = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            list.add(UUID.randomUUID());
        }
        return list;
    }

    record PlayerLineupState(UUID playerId, String role, boolean isStarter) {}
    record BackupEntry(UUID playerId, String role, boolean isStarter, boolean revertedByV174) {}

    @BeforeAll
    static void setUp() throws Exception {
        postgres.start();
        jdbcUrl = postgres.getJdbcUrl();
        username = postgres.getUsername();
        password = postgres.getPassword();

        try (Connection conn = getConnection()) {
            // 1. Build schema state directly
            try (Statement stmt = conn.createStatement()) {
                stmt.execute("""
                    CREATE TABLE match_lineups (
                        id UUID PRIMARY KEY,
                        match_id UUID NOT NULL,
                        team_id UUID NOT NULL,
                        player_id UUID NOT NULL,
                        jersey_number INTEGER,
                        is_captain BOOLEAN DEFAULT FALSE,
                        role VARCHAR(50) NOT NULL,
                        order_index INTEGER,
                        is_starter BOOLEAN DEFAULT FALSE,
                        position_display VARCHAR(255),
                        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
                    );

                    CREATE TABLE match_events (
                        id UUID PRIMARY KEY,
                        match_id UUID NOT NULL,
                        team_id UUID NOT NULL,
                        player_id UUID,
                        related_player_id UUID,
                        event_type VARCHAR(50) NOT NULL,
                        event_minute INTEGER,
                        notes TEXT,
                        created_at TIMESTAMP NOT NULL DEFAULT NOW()
                    );
                """);
            }

            // 2. Seed data before V171
            seedCaseA(conn);
            seedCaseB15(conn);
            seedCaseB10(conn);
            seedCaseCAndE(conn);
            seedCaseD(conn);
            seedCaseF(conn);

            // 3. Run V171 to produce migration state
            String v171Sql = loadMigrationSql("V171__restore_original_lineup_roles.sql");
            try (Statement stmt = conn.createStatement()) {
                stmt.execute(v171Sql);
            }

            // 4. Run V174 to guard counts
            String v174Sql = loadMigrationSql("V174__guard_v171_starter_counts.sql");
            try (Statement stmt = conn.createStatement()) {
                stmt.execute(v174Sql);
            }
        }
    }

    private static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(jdbcUrl, username, password);
    }

    private static String loadMigrationSql(String filename) throws IOException {
        try (InputStream is = V174MigrationTest.class.getResourceAsStream("/db/migration/" + filename)) {
            if (is == null) {
                throw new IllegalArgumentException("Resource not found: /db/migration/" + filename);
            }
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static void insertLineup(Connection conn, UUID matchId, UUID teamId, UUID playerId,
                                     int jersey, String role, boolean isStarter) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
                "INSERT INTO match_lineups (id, match_id, team_id, player_id, jersey_number, role, is_starter, order_index) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)")) {
            ps.setObject(1, UUID.randomUUID());
            ps.setObject(2, matchId);
            ps.setObject(3, teamId);
            ps.setObject(4, playerId);
            ps.setInt(5, jersey);
            ps.setString(6, role);
            ps.setBoolean(7, isStarter);
            ps.setInt(8, jersey);
            ps.executeUpdate();
        }
    }

    private static void insertSubEvent(Connection conn, UUID matchId, UUID teamId,
                                       UUID offPlayerId, UUID onPlayerId, int minute) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
                "INSERT INTO match_events (id, match_id, team_id, player_id, related_player_id, event_type, event_minute) " +
                "VALUES (?, ?, ?, ?, ?, 'SUBSTITUTION', ?)")) {
            ps.setObject(1, UUID.randomUUID());
            ps.setObject(2, matchId);
            ps.setObject(3, teamId);
            ps.setObject(4, offPlayerId);
            ps.setObject(5, onPlayerId);
            ps.setInt(6, minute);
            ps.executeUpdate();
        }
    }

    private static void seedCaseA(Connection conn) throws SQLException {
        // Normal 7s: S1 went off (old console rewrote to BENCH), B1 came on (rewritten to STARTER)
        // S2..S7 are STARTER. B2..B3 are BENCH. Current starter count = 7.
        UUID s1 = PLAYERS_A_STARTERS.get(0);
        UUID b1 = PLAYERS_A_BENCH.get(0);

        insertLineup(conn, MATCH_A, TEAM_A, s1, 1, "BENCH", false);
        insertLineup(conn, MATCH_A, TEAM_A, b1, 8, "STARTER", true);
        for (int i = 1; i < 7; i++) {
            insertLineup(conn, MATCH_A, TEAM_A, PLAYERS_A_STARTERS.get(i), i + 1, "STARTER", true);
        }
        for (int i = 1; i < 3; i++) {
            insertLineup(conn, MATCH_A, TEAM_A, PLAYERS_A_BENCH.get(i), i + 8, "BENCH", false);
        }
        insertSubEvent(conn, MATCH_A, TEAM_A, s1, b1, 5);
    }

    private static void seedCaseB15(Connection conn) throws SQLException {
        // 15s team with 14 starters today (S1 was rewritten to BENCH, replacement was not written)
        UUID s1 = PLAYERS_B15_STARTERS.get(0);
        insertLineup(conn, MATCH_B_15, TEAM_B_15, s1, 1, "BENCH", false);
        for (int i = 1; i < 15; i++) {
            insertLineup(conn, MATCH_B_15, TEAM_B_15, PLAYERS_B15_STARTERS.get(i), i + 1, "STARTER", true);
        }
        for (int i = 0; i < 7; i++) {
            insertLineup(conn, MATCH_B_15, TEAM_B_15, PLAYERS_B15_BENCH.get(i), i + 16, "BENCH", false);
        }
        insertSubEvent(conn, MATCH_B_15, TEAM_B_15, s1, null, 25);
    }

    private static void seedCaseB10(Connection conn) throws SQLException {
        // 10s team with 9 starters today (S1 was rewritten to BENCH)
        UUID s1 = PLAYERS_B10_STARTERS.get(0);
        insertLineup(conn, MATCH_B_10, TEAM_B_10, s1, 1, "BENCH", false);
        for (int i = 1; i < 10; i++) {
            insertLineup(conn, MATCH_B_10, TEAM_B_10, PLAYERS_B10_STARTERS.get(i), i + 1, "STARTER", true);
        }
        for (int i = 0; i < 5; i++) {
            insertLineup(conn, MATCH_B_10, TEAM_B_10, PLAYERS_B10_BENCH.get(i), i + 11, "BENCH", false);
        }
        insertSubEvent(conn, MATCH_B_10, TEAM_B_10, s1, null, 15);
    }

    private static void seedCaseCAndE(Connection conn) throws SQLException {
        // Team C1: 15s with 15 starters + 7 bench.
        // Duplicate OFF: Bench player B1 is subbed OFF twice at minute 40 -> V171 makes B1 a STARTER (leaves 16 starters).
        for (int i = 0; i < 15; i++) {
            insertLineup(conn, MATCH_C, TEAM_C1, PLAYERS_C1_STARTERS.get(i), i + 1, "STARTER", true);
        }
        for (int i = 0; i < 7; i++) {
            insertLineup(conn, MATCH_C, TEAM_C1, PLAYERS_C1_BENCH.get(i), i + 16, "BENCH", false);
        }
        UUID b1 = PLAYERS_C1_BENCH.get(0);
        insertSubEvent(conn, MATCH_C, TEAM_C1, b1, PLAYERS_C1_BENCH.get(1), 40);
        insertSubEvent(conn, MATCH_C, TEAM_C1, b1, PLAYERS_C1_BENCH.get(2), 40);

        // Team C2: same match, no substitutions at all
        for (int i = 0; i < 15; i++) {
            insertLineup(conn, MATCH_C, TEAM_C2, PLAYERS_C2_STARTERS.get(i), i + 1, "STARTER", true);
        }
        for (int i = 0; i < 7; i++) {
            insertLineup(conn, MATCH_C, TEAM_C2, PLAYERS_C2_BENCH.get(i), i + 16, "BENCH", false);
        }
    }

    private static void seedCaseD(Connection conn) throws SQLException {
        // Team D: 7s with 7 starters + 3 bench.
        // Duplicate ON: Starter player S1 is subbed ON twice at minute 10 -> V171 makes S1 a BENCH (leaves 6 starters).
        for (int i = 0; i < 7; i++) {
            insertLineup(conn, MATCH_D, TEAM_D, PLAYERS_D_STARTERS.get(i), i + 1, "STARTER", true);
        }
        for (int i = 0; i < 3; i++) {
            insertLineup(conn, MATCH_D, TEAM_D, PLAYERS_D_BENCH.get(i), i + 8, "BENCH", false);
        }
        UUID s1 = PLAYERS_D_STARTERS.get(0);
        insertSubEvent(conn, MATCH_D, TEAM_D, PLAYERS_D_STARTERS.get(1), s1, 10);
        insertSubEvent(conn, MATCH_D, TEAM_D, PLAYERS_D_STARTERS.get(2), s1, 10);
    }

    private static void seedCaseF(Connection conn) throws SQLException {
        // Team F: Non-standard 6 starters + 4 bench.
        // S1 currently BENCH (was starter), B1 currently STARTER (was bench).
        // S2..S6 STARTER. B2..B4 BENCH. Net delta 0.
        UUID s1 = PLAYERS_F_STARTERS.get(0);
        UUID b1 = PLAYERS_F_BENCH.get(0);

        insertLineup(conn, MATCH_F, TEAM_F, s1, 1, "BENCH", false);
        insertLineup(conn, MATCH_F, TEAM_F, b1, 7, "STARTER", true);
        for (int i = 1; i < 6; i++) {
            insertLineup(conn, MATCH_F, TEAM_F, PLAYERS_F_STARTERS.get(i), i + 1, "STARTER", true);
        }
        for (int i = 1; i < 4; i++) {
            insertLineup(conn, MATCH_F, TEAM_F, PLAYERS_F_BENCH.get(i), i + 7, "BENCH", false);
        }
        insertSubEvent(conn, MATCH_F, TEAM_F, s1, b1, 7);
    }

    private List<PlayerLineupState> getTeamLineup(UUID matchId, UUID teamId) throws SQLException {
        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT player_id, role, is_starter FROM match_lineups WHERE match_id = ? AND team_id = ? ORDER BY order_index ASC")) {
            ps.setObject(1, matchId);
            ps.setObject(2, teamId);
            List<PlayerLineupState> list = new ArrayList<>();
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(new PlayerLineupState(
                            (UUID) rs.getObject("player_id"),
                            rs.getString("role"),
                            rs.getBoolean("is_starter")
                    ));
                }
            }
            return list;
        }
    }

    private List<BackupEntry> getTeamBackup(UUID matchId, UUID teamId) throws SQLException {
        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT player_id, role, is_starter, reverted_by_v174 FROM match_lineups_backup_v171 WHERE match_id = ? AND team_id = ? ORDER BY player_id")) {
            ps.setObject(1, matchId);
            ps.setObject(2, teamId);
            List<BackupEntry> list = new ArrayList<>();
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(new BackupEntry(
                            (UUID) rs.getObject("player_id"),
                            rs.getString("role"),
                            rs.getBoolean("is_starter"),
                            rs.getBoolean("reverted_by_v174")
                    ));
                }
            }
            return list;
        }
    }

    @Test
    @DisplayName("Case A: Normal 7s sub restored by V171 stays at 7 starters (not reverted, not flagged)")
    void caseA_normal7sSubKept() throws Exception {
        List<PlayerLineupState> lineup = getTeamLineup(MATCH_A, TEAM_A);
        assertThat(lineup).hasSize(10);

        long starterCount = lineup.stream().filter(p -> "STARTER".equals(p.role())).count();
        assertThat(starterCount).isEqualTo(7);

        // S1 restored to STARTER, B1 restored to BENCH
        UUID s1 = PLAYERS_A_STARTERS.get(0);
        UUID b1 = PLAYERS_A_BENCH.get(0);
        PlayerLineupState s1State = lineup.stream().filter(p -> p.playerId().equals(s1)).findFirst().orElseThrow();
        PlayerLineupState b1State = lineup.stream().filter(p -> p.playerId().equals(b1)).findFirst().orElseThrow();

        assertThat(s1State.role()).isEqualTo("STARTER");
        assertThat(s1State.isStarter()).isTrue();
        assertThat(b1State.role()).isEqualTo("BENCH");
        assertThat(b1State.isStarter()).isFalse();

        // Other starters S2..S7 remain STARTER, is_starter=true
        for (int i = 1; i < 7; i++) {
            UUID id = PLAYERS_A_STARTERS.get(i);
            PlayerLineupState p = lineup.stream().filter(x -> x.playerId().equals(id)).findFirst().orElseThrow();
            assertThat(p.role()).isEqualTo("STARTER");
            assertThat(p.isStarter()).isTrue();
        }

        // Other bench B2..B3 remain BENCH, is_starter=false
        for (int i = 1; i < 3; i++) {
            UUID id = PLAYERS_A_BENCH.get(i);
            PlayerLineupState p = lineup.stream().filter(x -> x.playerId().equals(id)).findFirst().orElseThrow();
            assertThat(p.role()).isEqualTo("BENCH");
            assertThat(p.isStarter()).isFalse();
        }

        List<BackupEntry> backup = getTeamBackup(MATCH_A, TEAM_A);
        assertThat(backup).hasSize(2);
        assertThat(backup).allMatch(b -> !b.revertedByV174());
    }

    @Test
    @DisplayName("Case B: 15s repaired to 15, and 10s repaired to 10 by V171 stay repaired (not reverted, not flagged)")
    void caseB_standardRepairsKept() throws Exception {
        // 15s check
        List<PlayerLineupState> lineup15 = getTeamLineup(MATCH_B_15, TEAM_B_15);
        assertThat(lineup15).hasSize(22);
        long starters15 = lineup15.stream().filter(p -> "STARTER".equals(p.role())).count();
        assertThat(starters15).isEqualTo(15);

        for (UUID sId : PLAYERS_B15_STARTERS) {
            PlayerLineupState p = lineup15.stream().filter(x -> x.playerId().equals(sId)).findFirst().orElseThrow();
            assertThat(p.role()).isEqualTo("STARTER");
            assertThat(p.isStarter()).isTrue();
        }
        for (UUID bId : PLAYERS_B15_BENCH) {
            PlayerLineupState p = lineup15.stream().filter(x -> x.playerId().equals(bId)).findFirst().orElseThrow();
            assertThat(p.role()).isEqualTo("BENCH");
            assertThat(p.isStarter()).isFalse();
        }
        List<BackupEntry> backup15 = getTeamBackup(MATCH_B_15, TEAM_B_15);
        assertThat(backup15).hasSize(1);
        assertThat(backup15.get(0).revertedByV174()).isFalse();

        // 10s check
        List<PlayerLineupState> lineup10 = getTeamLineup(MATCH_B_10, TEAM_B_10);
        assertThat(lineup10).hasSize(15);
        long starters10 = lineup10.stream().filter(p -> "STARTER".equals(p.role())).count();
        assertThat(starters10).isEqualTo(10);

        for (UUID sId : PLAYERS_B10_STARTERS) {
            PlayerLineupState p = lineup10.stream().filter(x -> x.playerId().equals(sId)).findFirst().orElseThrow();
            assertThat(p.role()).isEqualTo("STARTER");
            assertThat(p.isStarter()).isTrue();
        }
        for (UUID bId : PLAYERS_B10_BENCH) {
            PlayerLineupState p = lineup10.stream().filter(x -> x.playerId().equals(bId)).findFirst().orElseThrow();
            assertThat(p.role()).isEqualTo("BENCH");
            assertThat(p.isStarter()).isFalse();
        }
        List<BackupEntry> backup10 = getTeamBackup(MATCH_B_10, TEAM_B_10);
        assertThat(backup10).hasSize(1);
        assertThat(backup10.get(0).revertedByV174()).isFalse();
    }

    @Test
    @DisplayName("Case C: Duplicate OFF creating 16 starters in 15s is reverted to 15 starters and flagged")
    void caseC_duplicateOffReverted() throws Exception {
        List<PlayerLineupState> lineup = getTeamLineup(MATCH_C, TEAM_C1);
        assertThat(lineup).hasSize(22);

        long starterCount = lineup.stream().filter(p -> "STARTER".equals(p.role())).count();
        assertThat(starterCount).isEqualTo(15);

        // All 15 original starters are STARTER, is_starter=true
        for (UUID sId : PLAYERS_C1_STARTERS) {
            PlayerLineupState p = lineup.stream().filter(x -> x.playerId().equals(sId)).findFirst().orElseThrow();
            assertThat(p.role()).isEqualTo("STARTER");
            assertThat(p.isStarter()).isTrue();
        }

        // B1 was reverted back to BENCH, is_starter=false
        UUID b1 = PLAYERS_C1_BENCH.get(0);
        PlayerLineupState b1State = lineup.stream().filter(x -> x.playerId().equals(b1)).findFirst().orElseThrow();
        assertThat(b1State.role()).isEqualTo("BENCH");
        assertThat(b1State.isStarter()).isFalse();

        // Remaining bench are all BENCH, is_starter=false
        for (UUID bId : PLAYERS_C1_BENCH) {
            PlayerLineupState p = lineup.stream().filter(x -> x.playerId().equals(bId)).findFirst().orElseThrow();
            assertThat(p.role()).isEqualTo("BENCH");
            assertThat(p.isStarter()).isFalse();
        }

        List<BackupEntry> backup = getTeamBackup(MATCH_C, TEAM_C1);
        assertThat(backup).hasSize(1);
        assertThat(backup.get(0).playerId()).isEqualTo(b1);
        assertThat(backup.get(0).revertedByV174()).isTrue();
    }

    @Test
    @DisplayName("Case E: Team in same match as Case C with no substitutions is untouched (no backup rows)")
    void caseE_teamWithNoSubsUntouched() throws Exception {
        List<PlayerLineupState> lineup = getTeamLineup(MATCH_C, TEAM_C2);
        assertThat(lineup).hasSize(22);

        long starterCount = lineup.stream().filter(p -> "STARTER".equals(p.role())).count();
        assertThat(starterCount).isEqualTo(15);

        for (UUID sId : PLAYERS_C2_STARTERS) {
            PlayerLineupState p = lineup.stream().filter(x -> x.playerId().equals(sId)).findFirst().orElseThrow();
            assertThat(p.role()).isEqualTo("STARTER");
            assertThat(p.isStarter()).isTrue();
        }
        for (UUID bId : PLAYERS_C2_BENCH) {
            PlayerLineupState p = lineup.stream().filter(x -> x.playerId().equals(bId)).findFirst().orElseThrow();
            assertThat(p.role()).isEqualTo("BENCH");
            assertThat(p.isStarter()).isFalse();
        }

        List<BackupEntry> backup = getTeamBackup(MATCH_C, TEAM_C2);
        assertThat(backup).isEmpty();
    }

    @Test
    @DisplayName("Case D: Duplicate ON creating 6 starters in 7s is reverted to 7 starters and flagged")
    void caseD_duplicateOnReverted() throws Exception {
        List<PlayerLineupState> lineup = getTeamLineup(MATCH_D, TEAM_D);
        assertThat(lineup).hasSize(10);

        long starterCount = lineup.stream().filter(p -> "STARTER".equals(p.role())).count();
        assertThat(starterCount).isEqualTo(7);

        // S1 reverted back to STARTER, is_starter=true
        UUID s1 = PLAYERS_D_STARTERS.get(0);
        PlayerLineupState s1State = lineup.stream().filter(x -> x.playerId().equals(s1)).findFirst().orElseThrow();
        assertThat(s1State.role()).isEqualTo("STARTER");
        assertThat(s1State.isStarter()).isTrue();

        for (UUID sId : PLAYERS_D_STARTERS) {
            PlayerLineupState p = lineup.stream().filter(x -> x.playerId().equals(sId)).findFirst().orElseThrow();
            assertThat(p.role()).isEqualTo("STARTER");
            assertThat(p.isStarter()).isTrue();
        }
        for (UUID bId : PLAYERS_D_BENCH) {
            PlayerLineupState p = lineup.stream().filter(x -> x.playerId().equals(bId)).findFirst().orElseThrow();
            assertThat(p.role()).isEqualTo("BENCH");
            assertThat(p.isStarter()).isFalse();
        }

        List<BackupEntry> backup = getTeamBackup(MATCH_D, TEAM_D);
        assertThat(backup).hasSize(1);
        assertThat(backup.get(0).playerId()).isEqualTo(s1);
        assertThat(backup.get(0).revertedByV174()).isTrue();
    }

    @Test
    @DisplayName("Case F: Non-standard 6-starter count with delta 0 is kept (not reverted, not flagged)")
    void caseF_nonStandardCountDeltaZeroKept() throws Exception {
        List<PlayerLineupState> lineup = getTeamLineup(MATCH_F, TEAM_F);
        assertThat(lineup).hasSize(10);

        long starterCount = lineup.stream().filter(p -> "STARTER".equals(p.role())).count();
        assertThat(starterCount).isEqualTo(6);

        // S1 restored to STARTER, B1 restored to BENCH by V171; kept by V174
        UUID s1 = PLAYERS_F_STARTERS.get(0);
        UUID b1 = PLAYERS_F_BENCH.get(0);
        PlayerLineupState s1State = lineup.stream().filter(x -> x.playerId().equals(s1)).findFirst().orElseThrow();
        PlayerLineupState b1State = lineup.stream().filter(x -> x.playerId().equals(b1)).findFirst().orElseThrow();

        assertThat(s1State.role()).isEqualTo("STARTER");
        assertThat(s1State.isStarter()).isTrue();
        assertThat(b1State.role()).isEqualTo("BENCH");
        assertThat(b1State.isStarter()).isFalse();

        for (int i = 1; i < 6; i++) {
            UUID id = PLAYERS_F_STARTERS.get(i);
            PlayerLineupState p = lineup.stream().filter(x -> x.playerId().equals(id)).findFirst().orElseThrow();
            assertThat(p.role()).isEqualTo("STARTER");
            assertThat(p.isStarter()).isTrue();
        }
        for (int i = 1; i < 4; i++) {
            UUID id = PLAYERS_F_BENCH.get(i);
            PlayerLineupState p = lineup.stream().filter(x -> x.playerId().equals(id)).findFirst().orElseThrow();
            assertThat(p.role()).isEqualTo("BENCH");
            assertThat(p.isStarter()).isFalse();
        }

        List<BackupEntry> backup = getTeamBackup(MATCH_F, TEAM_F);
        assertThat(backup).hasSize(2);
        assertThat(backup).allMatch(b -> !b.revertedByV174());
    }

    @Test
    @DisplayName("Case G: Running V174 a second time is idempotent (no changes to roles, is_starter, or flags)")
    void caseG_idempotencySecondRunChangesNothing() throws Exception {
        // Record state before second run
        List<PlayerLineupState> lineupA_before = getTeamLineup(MATCH_A, TEAM_A);
        List<PlayerLineupState> lineupB15_before = getTeamLineup(MATCH_B_15, TEAM_B_15);
        List<PlayerLineupState> lineupB10_before = getTeamLineup(MATCH_B_10, TEAM_B_10);
        List<PlayerLineupState> lineupC1_before = getTeamLineup(MATCH_C, TEAM_C1);
        List<PlayerLineupState> lineupC2_before = getTeamLineup(MATCH_C, TEAM_C2);
        List<PlayerLineupState> lineupD_before = getTeamLineup(MATCH_D, TEAM_D);
        List<PlayerLineupState> lineupF_before = getTeamLineup(MATCH_F, TEAM_F);

        List<BackupEntry> backupA_before = getTeamBackup(MATCH_A, TEAM_A);
        List<BackupEntry> backupB15_before = getTeamBackup(MATCH_B_15, TEAM_B_15);
        List<BackupEntry> backupB10_before = getTeamBackup(MATCH_B_10, TEAM_B_10);
        List<BackupEntry> backupC1_before = getTeamBackup(MATCH_C, TEAM_C1);
        List<BackupEntry> backupC2_before = getTeamBackup(MATCH_C, TEAM_C2);
        List<BackupEntry> backupD_before = getTeamBackup(MATCH_D, TEAM_D);
        List<BackupEntry> backupF_before = getTeamBackup(MATCH_F, TEAM_F);

        // Run V174 a second time
        String v174Sql = loadMigrationSql("V174__guard_v171_starter_counts.sql");
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.execute(v174Sql);
        }

        // Assert all lineups and backups remain identical
        assertThat(getTeamLineup(MATCH_A, TEAM_A)).isEqualTo(lineupA_before);
        assertThat(getTeamLineup(MATCH_B_15, TEAM_B_15)).isEqualTo(lineupB15_before);
        assertThat(getTeamLineup(MATCH_B_10, TEAM_B_10)).isEqualTo(lineupB10_before);
        assertThat(getTeamLineup(MATCH_C, TEAM_C1)).isEqualTo(lineupC1_before);
        assertThat(getTeamLineup(MATCH_C, TEAM_C2)).isEqualTo(lineupC2_before);
        assertThat(getTeamLineup(MATCH_D, TEAM_D)).isEqualTo(lineupD_before);
        assertThat(getTeamLineup(MATCH_F, TEAM_F)).isEqualTo(lineupF_before);

        assertThat(getTeamBackup(MATCH_A, TEAM_A)).isEqualTo(backupA_before);
        assertThat(getTeamBackup(MATCH_B_15, TEAM_B_15)).isEqualTo(backupB15_before);
        assertThat(getTeamBackup(MATCH_B_10, TEAM_B_10)).isEqualTo(backupB10_before);
        assertThat(getTeamBackup(MATCH_C, TEAM_C1)).isEqualTo(backupC1_before);
        assertThat(getTeamBackup(MATCH_C, TEAM_C2)).isEqualTo(backupC2_before);
        assertThat(getTeamBackup(MATCH_D, TEAM_D)).isEqualTo(backupD_before);
        assertThat(getTeamBackup(MATCH_F, TEAM_F)).isEqualTo(backupF_before);
    }

    @AfterAll
    static void tearDown() {
        if (postgres != null && postgres.isRunning()) {
            postgres.stop();
        }
    }
}
