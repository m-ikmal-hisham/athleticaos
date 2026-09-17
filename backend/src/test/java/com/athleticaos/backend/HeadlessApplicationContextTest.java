package com.athleticaos.backend;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regression test for headless Spring Boot application context startup.
 * Ensures that the application context can initialize cleanly outside of a web request context
 * (e.g. database migrations, backfill runners, CLI executions).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("test")
class HeadlessApplicationContextTest {

    @Autowired
    private ApplicationContext applicationContext;

    @Test
    @DisplayName("Application context starts successfully with WebEnvironment.NONE")
    void contextLoadsInHeadlessMode() {
        assertThat(applicationContext).isNotNull();
        assertThat(applicationContext.containsBean("officialServiceImpl")).isTrue();
    }
}
