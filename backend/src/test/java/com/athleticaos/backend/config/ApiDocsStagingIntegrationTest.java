package com.athleticaos.backend.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@Tag("integration")
@ActiveProfiles("staging")
class ApiDocsStagingIntegrationTest {

    @Container
    @SuppressWarnings("resource")
    private static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("athleticaos_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.flyway.enabled", () -> "true");

        // Overrides required for application-staging.yml environment placeholders:
        // 1. DB connection placeholders used in application-staging.yml jdbc url template
        registry.add("DB_HOST", postgres::getHost);
        registry.add("DB_PORT", postgres::getFirstMappedPort);
        registry.add("DB_NAME", postgres::getDatabaseName);
        registry.add("DB_USER", postgres::getUsername);
        registry.add("DB_PASSWORD", postgres::getPassword);

        // 2. Server port: application-staging.yml specifies server.port: ${SERVER_PORT} with no fallback
        registry.add("SERVER_PORT", () -> "8080");

        // 3. JWT secret: application-staging.yml specifies jwt.secret-key: ${JWT_SECRET} with no fallback
        // Using an obviously fake test secret (256-bit hex key)
        registry.add("JWT_SECRET", () -> "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970");
    }

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("In staging profile, GET /v3/api-docs does not return 200 and does not return OpenAPI document")
    void apiDocs_inStaging_notPubliclyAccessible() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().is(not(200)))
                .andExpect(content().string(not(containsString("\"openapi\""))));
    }

    @Test
    @DisplayName("In staging profile, GET /swagger-ui/index.html does not return 200 and does not return Swagger UI")
    void swaggerUi_inStaging_notPubliclyAccessible() throws Exception {
        mockMvc.perform(get("/swagger-ui/index.html"))
                .andExpect(status().is(not(200)))
                .andExpect(content().string(not(containsString("<title>Swagger UI</title>"))))
                .andExpect(content().string(not(containsString("SwaggerUIBundle"))))
                .andExpect(content().string(not(containsString("\"openapi\""))));
    }
}
