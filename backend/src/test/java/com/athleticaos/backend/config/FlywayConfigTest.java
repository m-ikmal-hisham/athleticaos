package com.athleticaos.backend.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class FlywayConfigTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(FlywayConfig.class);

    @Test
    @DisplayName("FlywayMigrationStrategy bean is present only with dev profile")
    void flywayMigrationStrategyBeanPresentOnlyInDevProfile() {
        contextRunner.withPropertyValues("spring.profiles.active=dev")
                .run(context -> {
                    assertThat(context).hasSingleBean(FlywayMigrationStrategy.class);
                });

        contextRunner.withPropertyValues("spring.profiles.active=staging")
                .run(context -> {
                    assertThat(context).doesNotHaveBean(FlywayMigrationStrategy.class);
                });

        contextRunner.withPropertyValues("spring.profiles.active=prod")
                .run(context -> {
                    assertThat(context).doesNotHaveBean(FlywayMigrationStrategy.class);
                });

        contextRunner.run(context -> {
            assertThat(context).doesNotHaveBean(FlywayMigrationStrategy.class);
        });
    }
}
