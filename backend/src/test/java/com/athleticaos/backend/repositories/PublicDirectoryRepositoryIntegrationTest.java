package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.*;
import com.athleticaos.backend.repositories.spec.PublicDirectorySpecifications;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
@Tag("integration")
@SuppressWarnings("null")
public class PublicDirectoryRepositoryIntegrationTest {

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
    private PlayerRepository playerRepository;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private PersonRepository personRepository;

    @Autowired
    private OrganisationRepository organisationRepository;

    @Autowired
    private PlayerTeamRepository playerTeamRepository;

    @Autowired
    private TournamentRepository tournamentRepository;

    @Autowired
    private TournamentTeamRepository tournamentTeamRepository;

    @Autowired
    private TournamentPlayerRepository tournamentPlayerRepository;

    private Organisation orgA;
    private Team team1;
    private Team team2;
    private Team inactiveTeam;
    private Tournament tournament1;

    private Player player1;
    private Player player2;
    private Player player3;
    private Player deletedPlayer;

    @BeforeEach
    void setUp() {
        orgA = organisationRepository.saveAndFlush(Organisation.builder()
                .name("Cobra Rugby Club")
                .slug("cobra-rugby-club")
                .orgType("CLUB")
                .status("Active")
                .build());

        Organisation orgB = organisationRepository.saveAndFlush(Organisation.builder()
                .name("Harimau Sports Club")
                .slug("harimau-sports-club")
                .orgType("CLUB")
                .status("Active")
                .build());

        team1 = teamRepository.saveAndFlush(Team.builder()
                .organisation(orgA)
                .name("Cobra Premier")
                .shortName("COB1")
                .slug("cobra-premier")
                .category("MENS")
                .ageGroup("OPEN")
                .state("Selangor")
                .status("Active")
                .build());

        team2 = teamRepository.saveAndFlush(Team.builder()
                .organisation(orgB)
                .name("Harimau RFC")
                .shortName("HRI")
                .slug("harimau-rfc")
                .category("WOMENS")
                .ageGroup("OPEN")
                .state("Kuala Lumpur")
                .status("Active")
                .build());

        inactiveTeam = teamRepository.saveAndFlush(Team.builder()
                .organisation(orgA)
                .name("Defunct RFC")
                .shortName("DEF")
                .slug("defunct-rfc")
                .category("MENS")
                .ageGroup("OPEN")
                .state("Penang")
                .status("Inactive")
                .build());

        tournament1 = tournamentRepository.saveAndFlush(Tournament.builder()
                .organiserOrg(orgA)
                .name("Malaysia Super 7s")
                .slug("malaysia-super-7s")
                .level("NATIONAL")
                .status(com.athleticaos.backend.enums.TournamentStatus.PUBLISHED)
                .startDate(LocalDate.of(2026, 11, 1))
                .endDate(LocalDate.of(2026, 11, 3))
                .venue("National Stadium Bukit Jalil")
                .build());

        tournamentTeamRepository.saveAndFlush(TournamentTeam.builder()
                .tournament(tournament1)
                .team(team1)
                .isActive(true)
                .deleted(false)
                .build());

        // Player 1: John Smith, Selangor, in Cobra Premier as Prop
        Person person1 = personRepository.saveAndFlush(Person.builder()
                .firstName("John")
                .lastName("Smith")
                .dob(LocalDate.of(1995, 5, 20))
                .gender("MALE")
                .nationality("MALAYSIAN")
                .state("Selangor")
                .email("john.smith@example.test")
                .build());

        player1 = playerRepository.saveAndFlush(Player.builder()
                .person(person1)
                .slug("john-smith")
                .status("ACTIVE")
                .deleted(false)
                .createdAt(LocalDateTime.of(2026, 1, 1, 10, 0))
                .build());

        playerTeamRepository.saveAndFlush(PlayerTeam.builder()
                .player(player1)
                .team(team1)
                .position("Tighthead Prop")
                .isActive(true)
                .build());

        tournamentPlayerRepository.saveAndFlush(TournamentPlayer.builder()
                .tournament(tournament1)
                .team(team1)
                .player(player1)
                .isActive(true)
                .build());

        // Player 2: Ahmad Razak, Kuala Lumpur, in Harimau RFC as Fly Half
        Person person2 = personRepository.saveAndFlush(Person.builder()
                .firstName("Ahmad")
                .lastName("Razak")
                .dob(LocalDate.of(1998, 8, 15))
                .gender("MALE")
                .nationality("MALAYSIAN")
                .state("Kuala Lumpur")
                .email("ahmad.razak@example.test")
                .build());

        player2 = playerRepository.saveAndFlush(Player.builder()
                .person(person2)
                .slug("ahmad-razak")
                .status("ACTIVE")
                .deleted(false)
                .createdAt(LocalDateTime.of(2026, 2, 1, 10, 0))
                .build());

        playerTeamRepository.saveAndFlush(PlayerTeam.builder()
                .player(player2)
                .team(team2)
                .position("Fly Half")
                .isActive(true)
                .build());

        // Player 3: Siti Aminah, Selangor, no team
        Person person3 = personRepository.saveAndFlush(Person.builder()
                .firstName("Siti")
                .lastName("Aminah")
                .dob(LocalDate.of(2000, 3, 10))
                .gender("FEMALE")
                .nationality("MALAYSIAN")
                .state("Selangor")
                .email("siti.aminah@example.test")
                .build());

        player3 = playerRepository.saveAndFlush(Player.builder()
                .person(person3)
                .slug("siti-aminah")
                .status("ACTIVE")
                .deleted(false)
                .createdAt(LocalDateTime.of(2026, 3, 1, 10, 0))
                .build());

        // Deleted player: should never be returned
        Person personDel = personRepository.saveAndFlush(Person.builder()
                .firstName("Ghost")
                .lastName("Player")
                .dob(LocalDate.of(1990, 1, 1))
                .gender("MALE")
                .nationality("MALAYSIAN")
                .email("ghost@example.test")
                .build());

        deletedPlayer = playerRepository.saveAndFlush(Player.builder()
                .person(personDel)
                .slug("ghost-player")
                .status("INACTIVE")
                .deleted(true)
                .deletedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.of(2025, 1, 1, 10, 0))
                .build());
    }

    @Test
    @DisplayName("Paged players: search by first name, last name, full name, slug, and team name")
    void pagedPlayers_searchVariants() {
        // Search first name
        Page<Player> byFirst = playerRepository.findAll(
                PublicDirectorySpecifications.publicPlayers("John", null, null, null, null, PublicDirectorySpecifications.PlayerSort.NAME),
                PageRequest.of(0, 10));
        assertThat(byFirst.getContent()).extracting(Player::getId).containsExactly(player1.getId());

        // Search last name
        Page<Player> byLast = playerRepository.findAll(
                PublicDirectorySpecifications.publicPlayers("Razak", null, null, null, null, PublicDirectorySpecifications.PlayerSort.NAME),
                PageRequest.of(0, 10));
        assertThat(byLast.getContent()).extracting(Player::getId).containsExactly(player2.getId());

        // Search "first last"
        Page<Player> byFull = playerRepository.findAll(
                PublicDirectorySpecifications.publicPlayers("ahmad razak", null, null, null, null, PublicDirectorySpecifications.PlayerSort.NAME),
                PageRequest.of(0, 10));
        assertThat(byFull.getContent()).extracting(Player::getId).containsExactly(player2.getId());

        // Search slug
        Page<Player> bySlug = playerRepository.findAll(
                PublicDirectorySpecifications.publicPlayers("siti-aminah", null, null, null, null, PublicDirectorySpecifications.PlayerSort.NAME),
                PageRequest.of(0, 10));
        assertThat(bySlug.getContent()).extracting(Player::getId).containsExactly(player3.getId());

        // Search by team name: player in team with "Cobra"
        Page<Player> byTeam = playerRepository.findAll(
                PublicDirectorySpecifications.publicPlayers("cobra", null, null, null, null, PublicDirectorySpecifications.PlayerSort.NAME),
                PageRequest.of(0, 10));
        assertThat(byTeam.getContent()).extracting(Player::getId).containsExactly(player1.getId());

        // Deleted player is never matched even when searching directly
        Page<Player> delSearch = playerRepository.findAll(
                PublicDirectorySpecifications.publicPlayers("ghost", null, null, null, null, PublicDirectorySpecifications.PlayerSort.NAME),
                PageRequest.of(0, 10));
        assertThat(delSearch.getContent()).isEmpty();
    }

    @Test
    @DisplayName("Paged players: state, position (contains), teamId, tournamentId filters")
    void pagedPlayers_filterVariants() {
        // State filter: Selangor
        Page<Player> byState = playerRepository.findAll(
                PublicDirectorySpecifications.publicPlayers(null, "Selangor", null, null, null, PublicDirectorySpecifications.PlayerSort.NAME),
                PageRequest.of(0, 10));
        assertThat(byState.getContent()).extracting(Player::getId).containsExactlyInAnyOrder(player1.getId(), player3.getId());

        // Position filter (case-insensitive substring "prop")
        Page<Player> byPos = playerRepository.findAll(
                PublicDirectorySpecifications.publicPlayers(null, null, "prop", null, null, PublicDirectorySpecifications.PlayerSort.NAME),
                PageRequest.of(0, 10));
        assertThat(byPos.getContent()).extracting(Player::getId).containsExactly(player1.getId());

        // teamId filter
        Page<Player> byTeamId = playerRepository.findAll(
                PublicDirectorySpecifications.publicPlayers(null, null, null, team2.getId(), null, PublicDirectorySpecifications.PlayerSort.NAME),
                PageRequest.of(0, 10));
        assertThat(byTeamId.getContent()).extracting(Player::getId).containsExactly(player2.getId());

        // tournamentId filter
        Page<Player> byTournId = playerRepository.findAll(
                PublicDirectorySpecifications.publicPlayers(null, null, null, null, tournament1.getId(), PublicDirectorySpecifications.PlayerSort.NAME),
                PageRequest.of(0, 10));
        assertThat(byTournId.getContent()).extracting(Player::getId).containsExactly(player1.getId());
    }

    @Test
    @DisplayName("Paged players: sort name (last, first) vs recent (createdAt desc)")
    void pagedPlayers_sorting() {
        // Name sort: Aminah, Siti -> Razak, Ahmad -> Smith, John
        Page<Player> byName = playerRepository.findAll(
                PublicDirectorySpecifications.publicPlayers(null, null, null, null, null, PublicDirectorySpecifications.PlayerSort.NAME),
                PageRequest.of(0, 10));
        assertThat(byName.getContent()).extracting(Player::getId)
                .containsExactly(player3.getId(), player2.getId(), player1.getId());

        // Recent sort: player3 (Mar), player2 (Feb), player1 (Jan)
        Page<Player> byRecent = playerRepository.findAll(
                PublicDirectorySpecifications.publicPlayers(null, null, null, null, null, PublicDirectorySpecifications.PlayerSort.RECENT),
                PageRequest.of(0, 10));
        assertThat(byRecent.getContent()).extracting(Player::getId)
                .containsExactly(player3.getId(), player2.getId(), player1.getId());
    }

    @Test
    @DisplayName("Paged players: page boundaries, hasNext, and page beyond end")
    void pagedPlayers_boundaries() {
        // Page size 2 out of 3 items
        Page<Player> page0 = playerRepository.findAll(
                PublicDirectorySpecifications.publicPlayers(null, null, null, null, null, PublicDirectorySpecifications.PlayerSort.NAME),
                PageRequest.of(0, 2));
        assertThat(page0.getContent()).hasSize(2);
        assertThat(page0.hasNext()).isTrue();
        assertThat(page0.getTotalElements()).isEqualTo(3);
        assertThat(page0.getTotalPages()).isEqualTo(2);

        Page<Player> page1 = playerRepository.findAll(
                PublicDirectorySpecifications.publicPlayers(null, null, null, null, null, PublicDirectorySpecifications.PlayerSort.NAME),
                PageRequest.of(1, 2));
        assertThat(page1.getContent()).hasSize(1);
        assertThat(page1.hasNext()).isFalse();

        // Page beyond end
        Page<Player> pageBeyond = playerRepository.findAll(
                PublicDirectorySpecifications.publicPlayers(null, null, null, null, null, PublicDirectorySpecifications.PlayerSort.NAME),
                PageRequest.of(5, 2));
        assertThat(pageBeyond.getContent()).isEmpty();
        assertThat(pageBeyond.hasNext()).isFalse();
        assertThat(pageBeyond.getTotalElements()).isEqualTo(3);
    }

    @Test
    @DisplayName("Paged teams: search, category, state, tournamentId, inactive excluded")
    void pagedTeams_filtersAndExclusions() {
        // Search name
        Page<Team> byName = teamRepository.findAll(
                PublicDirectorySpecifications.publicTeams("cobra", null, null, null),
                PageRequest.of(0, 10));
        assertThat(byName.getContent()).extracting(Team::getId).containsExactly(team1.getId());

        // Search short name
        Page<Team> byShort = teamRepository.findAll(
                PublicDirectorySpecifications.publicTeams("HRI", null, null, null),
                PageRequest.of(0, 10));
        assertThat(byShort.getContent()).extracting(Team::getId).containsExactly(team2.getId());

        // Category filter: WOMENS
        Page<Team> byCat = teamRepository.findAll(
                PublicDirectorySpecifications.publicTeams(null, "WOMENS", null, null),
                PageRequest.of(0, 10));
        assertThat(byCat.getContent()).extracting(Team::getId).containsExactly(team2.getId());

        // State filter: Selangor
        Page<Team> byState = teamRepository.findAll(
                PublicDirectorySpecifications.publicTeams(null, null, "Selangor", null),
                PageRequest.of(0, 10));
        assertThat(byState.getContent()).extracting(Team::getId).containsExactly(team1.getId());

        // Tournament filter
        Page<Team> byTourn = teamRepository.findAll(
                PublicDirectorySpecifications.publicTeams(null, null, null, tournament1.getId()),
                PageRequest.of(0, 10));
        assertThat(byTourn.getContent()).extracting(Team::getId).containsExactly(team1.getId());

        // Inactive team is never included in active queries
        Page<Team> allActive = teamRepository.findAll(
                PublicDirectorySpecifications.publicTeams(null, null, null, null),
                PageRequest.of(0, 10));
        assertThat(allActive.getContent()).extracting(Team::getId)
                .containsExactlyInAnyOrder(team1.getId(), team2.getId())
                .doesNotContain(inactiveTeam.getId());
    }

    @Test
    @DisplayName("Filter dropdown queries return distinct options")
    void filterQueries() {
        List<String> playerStates = playerRepository.findDistinctStatesOfActivePlayers();
        assertThat(playerStates).contains("Selangor", "Kuala Lumpur");

        List<String> positions = playerTeamRepository.findDistinctActivePositions();
        assertThat(positions).contains("Tighthead Prop", "Fly Half");

        List<String> teamStates = teamRepository.findDistinctStatesOfActiveTeams();
        assertThat(teamStates).contains("Selangor", "Kuala Lumpur").doesNotContain("Penang"); // inactive team excluded

        List<String> categories = teamRepository.findDistinctCategoriesOfActiveTeams();
        assertThat(categories).contains("MENS", "WOMENS");

        // Batch queries by team IDs
        List<Object[]> playerCounts = playerTeamRepository.countActivePlayersGroupedByTeamIds(List.of(team1.getId(), team2.getId()));
        assertThat(playerCounts).hasSize(2);

        List<Object[]> tournaments = tournamentTeamRepository.findActiveTournamentsGroupedByTeamIds(List.of(team1.getId()));
        assertThat(tournaments).hasSize(1);
    }
}
