package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.enums.TournamentStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@ActiveProfiles("test")
public class PublicStatsRepositoryCountsTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private TournamentRepository tournamentRepository;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private MatchRepository matchRepository;

    @Test
    @DisplayName("Public stats count queries match visibility rules; unpublished tournaments and their matches are excluded")
    public void testPublicStatsCounts() {
        // 1. Organisation
        Organisation org = Organisation.builder()
                .name("Rugby Club Org")
                .slug("rugby-club-org")
                .orgType("CLUB")
                .build();
        entityManager.persist(org);

        // 2. Tournaments: 1 published, 1 draft, 1 soft-deleted published
        Tournament pubTournament = Tournament.builder()
                .name("Published Open 2026")
                .slug("published-open-2026")
                .organiserOrg(org)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(3))
                .venue("Stadium A")
                .level("NATIONAL")
                .isPublished(true)
                .status(TournamentStatus.PUBLISHED)
                .deleted(false)
                .build();
        entityManager.persist(pubTournament);

        Tournament draftTournament = Tournament.builder()
                .name("Draft Tournament 2026")
                .slug("draft-tournament-2026")
                .organiserOrg(org)
                .startDate(LocalDate.now().plusDays(10))
                .endDate(LocalDate.now().plusDays(12))
                .venue("Stadium B")
                .level("NATIONAL")
                .isPublished(false)
                .status(TournamentStatus.DRAFT)
                .deleted(false)
                .build();
        entityManager.persist(draftTournament);

        Tournament deletedTournament = Tournament.builder()
                .name("Deleted Tournament")
                .slug("deleted-tournament")
                .organiserOrg(org)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(1))
                .venue("Stadium C")
                .level("NATIONAL")
                .isPublished(true)
                .status(TournamentStatus.PUBLISHED)
                .deleted(true)
                .build();
        entityManager.persist(deletedTournament);

        // 3. Teams: 1 active, 1 null status (active by default), 1 inactive
        Team activeTeam1 = Team.builder()
                .name("Harimau RFC")
                .shortName("HRFC")
                .slug("harimau-rfc")
                .organisation(org)
                .category("SENIOR")
                .ageGroup("OPEN")
                .status("Active")
                .build();
        entityManager.persist(activeTeam1);

        Team activeTeam2 = Team.builder()
                .name("Selangor Eagles")
                .shortName("SE")
                .slug("selangor-eagles")
                .organisation(org)
                .category("SENIOR")
                .ageGroup("OPEN")
                .status(null)
                .build();
        entityManager.persist(activeTeam2);

        Team inactiveTeam = Team.builder()
                .name("Old Boys RFC")
                .shortName("OB")
                .slug("old-boys-rfc")
                .organisation(org)
                .category("SENIOR")
                .ageGroup("OPEN")
                .status("inactive")
                .build();
        entityManager.persist(inactiveTeam);

        // 4. Players: 2 non-deleted, 1 deleted
        Person p1 = Person.builder().firstName("Amir").lastName("Zulkifli").gender("MALE").dob(LocalDate.of(2000, 1, 1)).nationality("MALAYSIAN").email("amir@example.test").build();
        entityManager.persist(p1);
        Player player1 = Player.builder().person(p1).slug("amir-z").status("ACTIVE").deleted(false).build();
        entityManager.persist(player1);

        Person p2 = Person.builder().firstName("Danial").lastName("Hakim").gender("MALE").dob(LocalDate.of(2001, 2, 2)).nationality("MALAYSIAN").email("danial@example.test").build();
        entityManager.persist(p2);
        Player player2 = Player.builder().person(p2).slug("danial-h").status("ACTIVE").deleted(false).build();
        entityManager.persist(player2);

        Person p3 = Person.builder().firstName("Faiz").lastName("Rosli").gender("MALE").dob(LocalDate.of(1999, 3, 3)).nationality("MALAYSIAN").email("faiz@example.test").build();
        entityManager.persist(p3);
        Player deletedPlayer = Player.builder().person(p3).slug("faiz-r").status("ACTIVE").deleted(true).build();
        entityManager.persist(deletedPlayer);

        // 5. Matches:
        // Match 1: COMPLETED in published tournament -> COUNTED
        Match match1 = Match.builder()
                .tournament(pubTournament)
                .homeTeam(activeTeam1)
                .awayTeam(activeTeam2)
                .matchCode("M-001")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(15, 0))
                .status(MatchStatus.COMPLETED)
                .deleted(false)
                .build();
        entityManager.persist(match1);

        // Match 2: SCHEDULED in published tournament -> NOT COUNTED (not completed)
        Match match2 = Match.builder()
                .tournament(pubTournament)
                .homeTeam(activeTeam1)
                .awayTeam(activeTeam2)
                .matchCode("M-002")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(17, 0))
                .status(MatchStatus.SCHEDULED)
                .deleted(false)
                .build();
        entityManager.persist(match2);

        // Match 3: COMPLETED in draft (unpublished) tournament -> NOT COUNTED (unpublished tournament)
        Match match3 = Match.builder()
                .tournament(draftTournament)
                .homeTeam(activeTeam1)
                .awayTeam(activeTeam2)
                .matchCode("M-003")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(10, 0))
                .status(MatchStatus.COMPLETED)
                .deleted(false)
                .build();
        entityManager.persist(match3);

        // Match 4: COMPLETED in published tournament but deleted=true -> NOT COUNTED
        Match match4 = Match.builder()
                .tournament(pubTournament)
                .homeTeam(activeTeam1)
                .awayTeam(activeTeam2)
                .matchCode("M-004")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(12, 0))
                .status(MatchStatus.COMPLETED)
                .deleted(true)
                .build();
        entityManager.persist(match4);

        entityManager.flush();
        entityManager.clear();

        // Assert count queries
        long publishedTournaments = tournamentRepository.countPublished();
        long activeTeams = teamRepository.countActiveTeams();
        long activePlayers = playerRepository.countByDeletedFalse();
        long completedMatches = matchRepository.countByStatusInPublishedTournaments(MatchStatus.COMPLETED);

        assertThat(publishedTournaments).isEqualTo(1L);
        assertThat(activeTeams).isEqualTo(2L);
        assertThat(activePlayers).isEqualTo(2L);
        assertThat(completedMatches).isEqualTo(1L);
    }
}
