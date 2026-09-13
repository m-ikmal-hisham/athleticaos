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
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration test for Flyway migration V154 password lifecycle columns.
 * Uses Testcontainers PostgreSQL. To run locally: {@code ./mvnw test -Pintegration}
 */
@Tag("integration")
@Testcontainers
class V154MigrationTest {

    @Container
    @SuppressWarnings("resource")
    private static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("athleticaos_test")
            .withUsername("test")
            .withPassword("test");

    private static String jdbcUrl;
    private static String username;
    private static String password;

    @BeforeAll
    static void setUp() throws Exception {
        postgres.start();
        jdbcUrl = postgres.getJdbcUrl();
        username = postgres.getUsername();
        password = postgres.getPassword();

        // Migrate up to V153 first
        Flyway flyway153 = Flyway.configure()
                .dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration")
                .target("153")
                .load();
        flyway153.migrate();

        // Insert a synthetic user before V154 is applied
        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password);
             PreparedStatement ps = conn.prepareStatement(
                     "INSERT INTO users (id, email, password_hash, first_name, last_name, is_active) " +
                     "VALUES (?, ?, ?, ?, ?, ?)")) {
            ps.setObject(1, UUID.fromString("00000000-0000-4000-a000-000000000001"));
            ps.setString(2, "synthetic@example.com");
            ps.setString(3, "x"); // fake non-bcrypt hash
            ps.setString(4, "Synthetic");
            ps.setString(5, "User");
            ps.setBoolean(6, true);
            ps.executeUpdate();
        }

        // Now apply V154
        Flyway flyway154 = Flyway.configure()
                .dataSource(jdbcUrl, username, password)
                .locations("classpath:db/migration")
                .load();
        flyway154.migrate();
    }

    private static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(jdbcUrl, username, password);
    }

    @Test
    @DisplayName("Existing user gets must_change_password=false and password_changed_at IS NULL after V154")
    void existingUserHasDefaultValues() throws Exception {
        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT must_change_password, password_changed_at FROM users WHERE id = ?")) {
            ps.setObject(1, UUID.fromString("00000000-0000-4000-a000-000000000001"));
            try (ResultSet rs = ps.executeQuery()) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getBoolean("must_change_password")).isFalse();
                assertThat(rs.getTimestamp("password_changed_at")).isNull();
            }
        }
    }

    @Test
    @DisplayName("must_change_password column is NOT NULL DEFAULT false")
    void mustChangePasswordIsNotNullDefaultFalse() throws Exception {
        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT column_default, is_nullable FROM information_schema.columns " +
                     "WHERE table_name = 'users' AND column_name = 'must_change_password'")) {
            try (ResultSet rs = ps.executeQuery()) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getString("column_default")).isEqualTo("false");
                assertThat(rs.getString("is_nullable")).isEqualTo("NO");
            }
        }
    }

    @Test
    @DisplayName("password_changed_at column is nullable")
    void passwordChangedAtIsNullable() throws Exception {
        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT is_nullable FROM information_schema.columns " +
                     "WHERE table_name = 'users' AND column_name = 'password_changed_at'")) {
            try (ResultSet rs = ps.executeQuery()) {
                assertThat(rs.next()).isTrue();
                assertThat(rs.getString("is_nullable")).isEqualTo("YES");
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
