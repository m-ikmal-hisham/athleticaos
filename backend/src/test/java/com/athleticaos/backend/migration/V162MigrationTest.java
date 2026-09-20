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
import java.sql.SQLException;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Tag("integration")
@Testcontainers
class V162MigrationTest {

    @Container
    @SuppressWarnings("resource")
    private static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("athleticaos_test")
            .withUsername("test")
            .withPassword("test");

    private static String jdbcUrl;
    private static String username;
    private static String password;

    private static final UUID ORG_ID = UUID.fromString("00000000-0000-4000-b000-000000000101");
    private static final UUID TOURNAMENT_ID = UUID.fromString("00000000-0000-4000-b000-000000000102");

    @BeforeAll
    static void setUp() throws Exception {
        postgres.start();
        jdbcUrl = postgres.getJdbcUrl();
        username = postgres.getUsername();
        password = postgres.getPassword();

        // 1. Migrate up to V161
        Flyway flyway161 = Flyway.configure()
                .dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration")
                .target("161")
                .load();
        flyway161.migrate();

        // 2. Seed an organisation and a tournament
        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password)) {
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO organisations (id, name, slug, org_type, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())")) {
                ps.setObject(1, ORG_ID);
                ps.setString(2, "Test Tier Migration Org");
                ps.setString(3, "test-tier-migration-org");
                ps.setString(4, "CLUB");
                ps.executeUpdate();
            }

            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO tournaments (id, organiser_org_id, name, slug, level, venue, is_published, status, start_date, end_date, created_at) " +
                    "VALUES (?, ?, ?, ?, ?, ?, true, 'PUBLISHED', CURRENT_DATE, CURRENT_DATE + 2, NOW())")) {
                ps.setObject(1, TOURNAMENT_ID);
                ps.setObject(2, ORG_ID);
                ps.setString(3, "Tier Test Tournament");
                ps.setString(4, "tier-test-tournament");
                ps.setString(5, "REGIONAL");
                ps.setString(6, "Sports Park");
                ps.executeUpdate();
            }

            // In V161, inserting SAUCER fails against chk_stage_type
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO tournament_stages (id, tournament_id, name, stage_type, display_order, is_group_stage, is_knockout_stage, created_at) " +
                    "VALUES (?, ?, ?, ?, 1, false, true, NOW())")) {
                ps.setObject(1, UUID.randomUUID());
                ps.setObject(2, TOURNAMENT_ID);
                ps.setString(3, "Saucer Semi Final");
                ps.setString(4, "SAUCER");
                assertThatThrownBy(ps::executeUpdate)
                        .isInstanceOf(SQLException.class)
                        .hasMessageContaining("chk_stage_type");
            }
        }

        // 3. Migrate to V162
        Flyway flyway162 = Flyway.configure()
                .dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration")
                .target("162")
                .load();
        flyway162.migrate();
    }

    @Test
    @DisplayName("V162 allows inserting all four new placement stage types into tournament_stages")
    void allowsInsertingNewPlacementStageTypes() throws Exception {
        String[] newStageTypes = { "SAUCER", "CHOPSTICK", "WOODEN_SPOON", "WOODEN_FORK" };

        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password)) {
            for (int i = 0; i < newStageTypes.length; i++) {
                String stageType = newStageTypes[i];
                UUID stageId = UUID.randomUUID();
                try (PreparedStatement ps = conn.prepareStatement(
                        "INSERT INTO tournament_stages (id, tournament_id, name, stage_type, display_order, is_group_stage, is_knockout_stage, created_at) " +
                        "VALUES (?, ?, ?, ?, ?, false, true, NOW())")) {
                    ps.setObject(1, stageId);
                    ps.setObject(2, TOURNAMENT_ID);
                    ps.setString(3, stageType + " Round");
                    ps.setString(4, stageType);
                    ps.setInt(5, 10 + i);
                    int inserted = ps.executeUpdate();
                    assertThat(inserted).isEqualTo(1);
                }
            }
        }
    }

    @Test
    @DisplayName("V162 still rejects invalid stage types via chk_stage_type")
    void rejectsInvalidStageTypes() throws Exception {
        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password)) {
            try (PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO tournament_stages (id, tournament_id, name, stage_type, display_order, is_group_stage, is_knockout_stage, created_at) " +
                    "VALUES (?, ?, ?, ?, 99, false, true, NOW())")) {
                ps.setObject(1, UUID.randomUUID());
                ps.setObject(2, TOURNAMENT_ID);
                ps.setString(3, "Invalid Stage");
                ps.setString(4, "NON_EXISTENT_STAGE_TYPE");
                assertThatThrownBy(ps::executeUpdate)
                        .isInstanceOf(SQLException.class)
                        .hasMessageContaining("chk_stage_type");
            }
        }
    }
}
