package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.utils.EmailUtil;
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

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
@Tag("integration")
@SuppressWarnings("null")
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
                .nationality("MALAYSIAN")
                .recordVerificationStatus("UNVERIFIED")
                .email("test.integration@example.invalid")
                .build();

        Person saved = personRepository.saveAndFlush(java.util.Objects.requireNonNull(person));

        assertThat(saved.getRegistrationNo()).isNotNull();
        assertThat(saved.getRegistrationNo()).matches("^AOS-\\d{6,}$");
    }

    @Test
    @DisplayName("Missing-email queries treat a placeholder address as missing, a real address as present")
    void missingEmailQueries_treatPlaceholderAsMissing() {
        Person withPlaceholder = personRepository.saveAndFlush(java.util.Objects.requireNonNull(
                Person.builder().firstName("Placeholder").lastName("Case")
                        .dob(LocalDate.of(1999, 5, 5)).gender("FEMALE").nationality("MALAYSIAN")
                        .recordVerificationStatus("UNVERIFIED").build()));
        withPlaceholder.setEmail(EmailUtil.placeholderFor(withPlaceholder.getRegistrationNo()));
        personRepository.saveAndFlush(withPlaceholder);

        Person withRealEmail = personRepository.saveAndFlush(java.util.Objects.requireNonNull(
                Person.builder().firstName("Real").lastName("Case")
                        .dob(LocalDate.of(1999, 6, 6)).gender("MALE").nationality("MALAYSIAN")
                        .recordVerificationStatus("UNVERIFIED")
                        .email("real.case@example.invalid").build()));

        Person withNoEmail = personRepository.saveAndFlush(java.util.Objects.requireNonNull(
                Person.builder().firstName("Absent").lastName("Case")
                        .dob(LocalDate.of(1999, 7, 7)).gender("MALE").nationality("MALAYSIAN")
                        .recordVerificationStatus("UNVERIFIED").build()));

        java.util.List<java.util.UUID> missing = personRepository
                .findPersonsWithMissingEmail(org.springframework.data.domain.PageRequest.of(0, 100))
                .getContent().stream().map(Person::getId).toList();

        assertThat(missing).contains(withPlaceholder.getId(), withNoEmail.getId());
        assertThat(missing).doesNotContain(withRealEmail.getId());

        // The backfill only targets rows with no address at all — never overwrites a placeholder
        java.util.List<java.util.UUID> needingPlaceholder = personRepository
                .findPersonsNeedingPlaceholderEmail(org.springframework.data.domain.PageRequest.of(0, 100))
                .getContent().stream().map(Person::getId).toList();

        assertThat(needingPlaceholder).contains(withNoEmail.getId());
        assertThat(needingPlaceholder).doesNotContain(withPlaceholder.getId(), withRealEmail.getId());
    }
}
