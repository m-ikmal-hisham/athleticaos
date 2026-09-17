package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.*;
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
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
@Tag("integration")
@SuppressWarnings("null")
class PlayerScopeRepositoryIntegrationTest {

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
    private PlayerTeamRepository playerTeamRepository;

    @Autowired
    private OrganisationPersonRepository organisationPersonRepository;

    @Autowired
    private OrganisationRepository organisationRepository;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private PersonRepository personRepository;

    @Autowired
    private PlayerRepository playerRepository;

    @Test
    @DisplayName("Scope repository queries cover active team, inactive team, org-person link, and different org")
    void scopeQueries_coverAllConditions() {
        // Create two organisations
        Organisation orgA = organisationRepository.saveAndFlush(Organisation.builder()
                .name("Integration Org A")
                .slug("integration-org-a")
                .orgType("CLUB")
                .status("Active")
                .build());

        Organisation orgB = organisationRepository.saveAndFlush(Organisation.builder()
                .name("Integration Org B")
                .slug("integration-org-b")
                .orgType("CLUB")
                .status("Active")
                .build());

        // Create person and player
        Person person = personRepository.saveAndFlush(Person.builder()
                .firstName("Integration")
                .lastName("Player")
                .dob(LocalDate.of(2000, 1, 1))
                .gender("MALE")
                .nationality("MALAYSIAN")
                .recordVerificationStatus("UNVERIFIED")
                .email("player.a@example.test")
                .build());

        Player player = playerRepository.saveAndFlush(Player.builder()
                .person(person)
                .slug("integration-player-a")
                .status("ACTIVE")
                .deleted(false)
                .build());

        // Create team in orgA
        Team teamInOrgA = teamRepository.saveAndFlush(Team.builder()
                .organisation(orgA)
                .name("Integration Team A")
                .slug("integration-team-a")
                .category("MENS")
                .ageGroup("OPEN")
                .status("Active")
                .build());

        // 1. Initially, no PlayerTeam and no OrganisationPerson exist
        assertThat(playerTeamRepository.existsActiveByPlayerIdAndOrganisationIdIn(player.getId(), Set.of(orgA.getId())))
                .isFalse();
        assertThat(organisationPersonRepository.existsByPersonIdAndOrganisationIdIn(person.getId(), Set.of(orgA.getId())))
                .isFalse();

        // 2. Active team in an org -> true
        PlayerTeam playerTeam = playerTeamRepository.saveAndFlush(PlayerTeam.builder()
                .player(player)
                .team(teamInOrgA)
                .isActive(true)
                .build());

        assertThat(playerTeamRepository.existsActiveByPlayerIdAndOrganisationIdIn(player.getId(), Set.of(orgA.getId())))
                .isTrue();

        // Different org for active team -> false
        assertThat(playerTeamRepository.existsActiveByPlayerIdAndOrganisationIdIn(player.getId(), Set.of(orgB.getId())))
                .isFalse();

        // 3. Inactive team -> false
        playerTeam.setIsActive(false);
        playerTeamRepository.saveAndFlush(playerTeam);

        assertThat(playerTeamRepository.existsActiveByPlayerIdAndOrganisationIdIn(player.getId(), Set.of(orgA.getId())))
                .isFalse();

        // 4. Organisation-person link in orgA -> true
        organisationPersonRepository.saveAndFlush(OrganisationPerson.builder()
                .organisation(orgA)
                .person(person)
                .build());

        assertThat(organisationPersonRepository.existsByPersonIdAndOrganisationIdIn(person.getId(), Set.of(orgA.getId())))
                .isTrue();

        // Different org -> false
        assertThat(organisationPersonRepository.existsByPersonIdAndOrganisationIdIn(person.getId(), Set.of(orgB.getId())))
                .isFalse();
    }
}
