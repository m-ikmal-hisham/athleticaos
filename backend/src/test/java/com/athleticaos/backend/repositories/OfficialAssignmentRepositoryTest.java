package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@ActiveProfiles("test")
public class OfficialAssignmentRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private TournamentOfficialRepository tournamentOfficialRepository;

    @Autowired
    private MatchOfficialRepository matchOfficialRepository;

    private Organisation org;
    private Tournament tournament;
    private Match match;

    private User user1;
    private User user2;

    private Person personWithUser;
    private Person personWithoutUser;

    private UUID externalUserIdForPersonOnly;

    @BeforeEach
    void setUp() {
        org = Organisation.builder()
                .name("Rugby Union")
                .slug("rugby-union-" + UUID.randomUUID())
                .orgType("UNION")
                .build();
        entityManager.persist(org);

        tournament = Tournament.builder()
                .name("National Sevens")
                .level("NATIONAL")
                .slug("nat-sevens-" + UUID.randomUUID())
                .organiserOrg(org)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(2))
                .venue("Stadium")
                .build();
        entityManager.persist(tournament);

        match = Match.builder()
                .tournament(tournament)
                .build();
        entityManager.persist(match);

        // User 1
        user1 = User.builder()
                .email("user1-" + UUID.randomUUID() + "@example.com")
                .passwordHash("hash")
                .build();
        entityManager.persist(user1);

        // User 2
        user2 = User.builder()
                .email("user2-" + UUID.randomUUID() + "@example.com")
                .passwordHash("hash")
                .build();
        entityManager.persist(user2);

        // Person with external userId
        externalUserIdForPersonOnly = UUID.randomUUID();
        personWithoutUser = Person.builder()
                .firstName("John")
                .lastName("Doe")
                .gender("MALE")
                .dob(LocalDate.of(1990, 1, 1))
                .nationality("MALAYSIAN")
                .userId(externalUserIdForPersonOnly)
                .build();
        entityManager.persist(personWithoutUser);

        // Person linked to user2
        personWithUser = Person.builder()
                .firstName("Jane")
                .lastName("Smith")
                .gender("FEMALE")
                .dob(LocalDate.of(1992, 2, 2))
                .nationality("MALAYSIAN")
                .userId(user2.getId())
                .build();
        entityManager.persist(personWithUser);

        entityManager.flush();
    }

    @Test
    @DisplayName("Tournament official with USER ONLY is matched via explicit join")
    void tournamentOfficial_userOnly() {
        OfficialRegistry official = OfficialRegistry.builder()
                .user(user1)
                .person(null)
                .organisation(org)
                .accreditationLevel("LEVEL_1")
                .primaryRole("REFEREE")
                .badgeNumber("REF-001")
                .build();
        entityManager.persist(official);

        TournamentOfficial to = TournamentOfficial.builder()
                .tournament(tournament)
                .official(official)
                .isActive(true)
                .build();
        entityManager.persist(to);
        entityManager.flush();

        boolean assigned = tournamentOfficialRepository.isUserAssignedToTournament(tournament.getId(), user1.getId());
        assertThat(assigned).isTrue();

        List<UUID> tournamentIds = tournamentOfficialRepository.findTournamentIdsByAssignedUser(user1.getId());
        assertThat(tournamentIds).contains(tournament.getId());

        // Other user should not be assigned
        assertThat(tournamentOfficialRepository.isUserAssignedToTournament(tournament.getId(), UUID.randomUUID())).isFalse();
    }

    @Test
    @DisplayName("Tournament official with PERSON ONLY (person.userId set) is matched via explicit join")
    void tournamentOfficial_personOnly() {
        OfficialRegistry official = OfficialRegistry.builder()
                .user(null)
                .person(personWithoutUser)
                .organisation(org)
                .accreditationLevel("LEVEL_2")
                .primaryRole("AR")
                .badgeNumber("REF-002")
                .build();
        entityManager.persist(official);

        TournamentOfficial to = TournamentOfficial.builder()
                .tournament(tournament)
                .official(official)
                .isActive(true)
                .build();
        entityManager.persist(to);
        entityManager.flush();

        boolean assigned = tournamentOfficialRepository.isUserAssignedToTournament(tournament.getId(), externalUserIdForPersonOnly);
        assertThat(assigned).isTrue();

        List<UUID> tournamentIds = tournamentOfficialRepository.findTournamentIdsByAssignedUser(externalUserIdForPersonOnly);
        assertThat(tournamentIds).contains(tournament.getId());
    }

    @Test
    @DisplayName("Tournament official with BOTH user and person is matched correctly")
    void tournamentOfficial_bothUserAndPerson() {
        OfficialRegistry official = OfficialRegistry.builder()
                .user(user2)
                .person(personWithUser)
                .organisation(org)
                .accreditationLevel("LEVEL_3")
                .primaryRole("REFEREE")
                .badgeNumber("REF-003")
                .build();
        entityManager.persist(official);

        TournamentOfficial to = TournamentOfficial.builder()
                .tournament(tournament)
                .official(official)
                .isActive(true)
                .build();
        entityManager.persist(to);
        entityManager.flush();

        assertThat(tournamentOfficialRepository.isUserAssignedToTournament(tournament.getId(), user2.getId())).isTrue();
        assertThat(tournamentOfficialRepository.findTournamentIdsByAssignedUser(user2.getId())).contains(tournament.getId());
    }

    @Test
    @DisplayName("Inactive TournamentOfficial is NOT counted")
    void tournamentOfficial_inactiveNotCounted() {
        OfficialRegistry official = OfficialRegistry.builder()
                .user(user1)
                .person(null)
                .organisation(org)
                .accreditationLevel("LEVEL_1")
                .primaryRole("REFEREE")
                .badgeNumber("REF-004")
                .build();
        entityManager.persist(official);

        TournamentOfficial to = TournamentOfficial.builder()
                .tournament(tournament)
                .official(official)
                .isActive(false) // Inactive
                .build();
        entityManager.persist(to);
        entityManager.flush();

        assertThat(tournamentOfficialRepository.isUserAssignedToTournament(tournament.getId(), user1.getId())).isFalse();
        assertThat(tournamentOfficialRepository.findTournamentIdsByAssignedUser(user1.getId())).doesNotContain(tournament.getId());
    }

    @Test
    @DisplayName("Match-level assignment matches official with user only and official with person only")
    void matchOfficial_assignment() {
        // Official A: user only
        OfficialRegistry officialA = OfficialRegistry.builder()
                .user(user1)
                .person(null)
                .organisation(org)
                .accreditationLevel("LEVEL_1")
                .primaryRole("REFEREE")
                .badgeNumber("REF-M1")
                .build();
        entityManager.persist(officialA);

        MatchOfficial moA = MatchOfficial.builder()
                .match(match)
                .official(officialA)
                .assignedRole("REFEREE")
                .isConfirmed(true)
                .build();
        entityManager.persist(moA);

        // Official B: person only
        OfficialRegistry officialB = OfficialRegistry.builder()
                .user(null)
                .person(personWithoutUser)
                .organisation(org)
                .accreditationLevel("LEVEL_2")
                .primaryRole("AR1")
                .badgeNumber("REF-M2")
                .build();
        entityManager.persist(officialB);

        MatchOfficial moB = MatchOfficial.builder()
                .match(match)
                .official(officialB)
                .assignedRole("AR1")
                .isConfirmed(true)
                .build();
        entityManager.persist(moB);
        entityManager.flush();

        // Check Official A (user only)
        assertThat(matchOfficialRepository.isUserAssignedToMatch(match.getId(), user1.getId())).isTrue();
        assertThat(matchOfficialRepository.isUserAssignedToTournamentMatches(tournament.getId(), user1.getId())).isTrue();
        assertThat(matchOfficialRepository.findTournamentIdsByAssignedMatchOfficialUser(user1.getId())).contains(tournament.getId());

        // Check Official B (person only)
        assertThat(matchOfficialRepository.isUserAssignedToMatch(match.getId(), externalUserIdForPersonOnly)).isTrue();
        assertThat(matchOfficialRepository.isUserAssignedToTournamentMatches(tournament.getId(), externalUserIdForPersonOnly)).isTrue();
        assertThat(matchOfficialRepository.findTournamentIdsByAssignedMatchOfficialUser(externalUserIdForPersonOnly)).contains(tournament.getId());

        // Unassigned user
        UUID randomUserId = UUID.randomUUID();
        assertThat(matchOfficialRepository.isUserAssignedToMatch(match.getId(), randomUserId)).isFalse();
        assertThat(matchOfficialRepository.isUserAssignedToTournamentMatches(tournament.getId(), randomUserId)).isFalse();
        assertThat(matchOfficialRepository.findTournamentIdsByAssignedMatchOfficialUser(randomUserId)).doesNotContain(tournament.getId());
    }
}
