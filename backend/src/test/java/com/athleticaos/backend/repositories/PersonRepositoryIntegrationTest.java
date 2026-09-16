package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.Person;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
@Tag("integration")
class PersonRepositoryIntegrationTest {

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
    }

    @Autowired
    private PersonRepository personRepository;

    @Test
    @DisplayName("Saving and flushing a Person against migrated Postgres populates generated registrationNo matching ^AOS-\\d{6,}$")
    void saveAndFlush_populatesGeneratedRegistrationNo() {
        Person person = Person.builder()
                .firstName("Integration")
                .lastName("Tester")
                .dob(LocalDate.of(2000, 1, 1))
                .gender("MALE")
                .icOrPassport("TEST-IC-" + UUID.randomUUID())
                .nationality("MALAYSIAN")
                .identificationVerificationStatus("UNVERIFIED")
                .email("test.integration@example.invalid")
                .build();

        Person saved = personRepository.saveAndFlush(java.util.Objects.requireNonNull(person));

        assertThat(saved.getRegistrationNo()).isNotNull();
        assertThat(saved.getRegistrationNo()).matches("^AOS-\\d{6,}$");
    }
}
