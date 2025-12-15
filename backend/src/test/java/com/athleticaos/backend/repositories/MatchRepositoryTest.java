package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.*;
import com.athleticaos.backend.enums.MatchStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@ActiveProfiles("test")
public class MatchRepositoryTest {

        @Autowired
        private TestEntityManager entityManager;

        @Autowired
        private MatchRepository matchRepository;

        @Test
        public void findAllWithDetails_ShouldEagerlyFetchStage() {
                // Setup details
                Organisation org = Organisation.builder().name("Test Org").slug("test-org").orgType("CLUB").build();
                entityManager.persist(org);

                Tournament tournament = Tournament.builder().name("Test Tournament").slug("test-tournament")
                                .organiserOrg(org)
                                .startDate(java.time.LocalDate.now())
                                .endDate(java.time.LocalDate.now().plusDays(7))
                                .venue("Test Venue")
                                .level("NATIONAL")
                                .build();
                entityManager.persist(tournament);

                TournamentStage stage = TournamentStage.builder().tournament(tournament).name("Pool Stage")
                                .displayOrder(1)
                                .stageType(com.athleticaos.backend.enums.TournamentStageType.POOL).build();
                entityManager.persist(stage);

                Match match = Match.builder()
                                .tournament(tournament)
                                .stage(stage)
                                .matchDate(java.time.LocalDate.now())
                                .kickOffTime(java.time.LocalTime.of(14, 0))
                                .status(MatchStatus.SCHEDULED)
                                .build();
                entityManager.persist(match);
                entityManager.flush();
                entityManager.clear(); // Clear cache to force DB fetch

                // Act
                List<Match> matches = matchRepository.findAllWithDetails();

                // Assert
                assertThat(matches).hasSize(1);
                Match fetchedMatch = matches.get(0);
                // Accessing stage should not throw lazy exception and should be populated
                assertThat(fetchedMatch.getStage()).isNotNull();
                assertThat(fetchedMatch.getStage().getName()).isEqualTo("Pool Stage");
                assertThat(fetchedMatch.getTournament()).isNotNull();
                assertThat(fetchedMatch.getTournament().getOrganiserOrg()).isNotNull();
        }

        @Test
        public void findMatchesByOrganisationIds_ShouldEagerlyFetchStage() {
                // Setup details
                Organisation org = Organisation.builder().name("Test Org 2").slug("test-org-2").orgType("CLUB").build();
                entityManager.persist(org);

                Tournament tournament = Tournament.builder().name("Test Tournament 2").slug("test-tournament-2")
                                .organiserOrg(org)
                                .startDate(java.time.LocalDate.now())
                                .endDate(java.time.LocalDate.now().plusDays(7))
                                .venue("Test Venue 2")
                                .level("NATIONAL")
                                .build();
                entityManager.persist(tournament);

                TournamentStage stage = TournamentStage.builder().tournament(tournament).name("Finals").displayOrder(2)
                                .stageType(com.athleticaos.backend.enums.TournamentStageType.FINAL).build();
                entityManager.persist(stage);

                Match match = Match.builder()
                                .tournament(tournament)
                                .stage(stage)
                                .matchDate(java.time.LocalDate.now())
                                .kickOffTime(java.time.LocalTime.of(15, 0))
                                .status(MatchStatus.SCHEDULED)
                                .build();
                entityManager.persist(match);
                entityManager.flush();
                entityManager.clear();

                // Act
                List<Match> matches = matchRepository.findMatchesByOrganisationIds(Set.of(org.getId()));

                // Assert
                assertThat(matches).hasSize(1);
                Match fetchedMatch = matches.get(0);
                assertThat(fetchedMatch.getStage()).isNotNull();
                assertThat(fetchedMatch.getStage().getName()).isEqualTo("Finals");
        }
}
