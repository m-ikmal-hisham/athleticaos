package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.match.MatchResponse;
import com.athleticaos.backend.dtos.standing.StandingsResponse;
import com.athleticaos.backend.dtos.tournament.TournamentResponse;
import com.athleticaos.backend.repositories.MatchOfficialRepository;
import com.athleticaos.backend.repositories.TournamentStageRepository;
import com.athleticaos.backend.services.*;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class PublicTournamentCategoryTest {
    @Test
    void matchesAndStandingsRequireExactCategoryWhileGlobalIncludesAll() {
        var tournaments = mock(TournamentService.class);
        var matches = mock(MatchService.class);
        var standings = mock(StandingsService.class);
        var officials = mock(MatchOfficialRepository.class);
        var stages = mock(TournamentStageRepository.class);
        var controller = new PublicTournamentController(tournaments, matches, standings,
                null, null, null, null, null, officials, stages, null);
        UUID tournamentId = UUID.randomUUID();
        UUID men = UUID.randomUUID();
        UUID women = UUID.randomUUID();
        when(tournaments.getTournamentById(tournamentId)).thenReturn(TournamentResponse.builder()
                .id(tournamentId).status("PUBLISHED").build());
        var menMatch = match(men);
        var womenMatch = match(women);
        var noCategory = match(null);
        var noStage = MatchResponse.builder().id(UUID.randomUUID()).build();
        when(matches.getMatchesByTournament(tournamentId)).thenReturn(List.of(menMatch, womenMatch, noCategory, noStage));
        when(standings.getStandings(tournamentId)).thenReturn(List.of(
                StandingsResponse.builder().categoryId(men).build(),
                StandingsResponse.builder().categoryId(women).build(),
                StandingsResponse.builder().build()));
        for (UUID category : List.of(men, women)) {
            var response = controller.getTournamentMatches(tournamentId.toString(), null, category);
            assertThat(response.getStatusCode().value()).isEqualTo(200);
            assertThat(response.getBody()).extracting("id")
                    .containsExactly(category.equals(men) ? menMatch.getId() : womenMatch.getId());
            assertThat(controller.getTournamentStandings(tournamentId.toString(), category).getBody())
                    .extracting("categoryId").containsExactly(category);
        }
        assertThat(controller.getTournamentMatches(tournamentId.toString(), null, null).getBody()).hasSize(4);
        assertThat(controller.getTournamentStandings(tournamentId.toString(), null).getBody()).hasSize(3);
    }

    @Test
    void unknownTournamentReturns404ForMatchesAndStandings() {
        var tournaments = mock(TournamentService.class);
        var matches = mock(MatchService.class);
        var standings = mock(StandingsService.class);
        var officials = mock(MatchOfficialRepository.class);
        var stages = mock(TournamentStageRepository.class);
        var controller = new PublicTournamentController(tournaments, matches, standings,
                null, null, null, null, null, officials, stages, null);

        UUID unknownId = UUID.randomUUID();
        when(tournaments.getTournamentById(unknownId)).thenThrow(new jakarta.persistence.EntityNotFoundException("Tournament not found"));
        when(tournaments.getTournamentBySlug("non-existent")).thenThrow(new jakarta.persistence.EntityNotFoundException("Tournament not found"));

        var matchesByIdResponse = controller.getTournamentMatches(unknownId.toString(), null, null);
        assertThat(matchesByIdResponse.getStatusCode().value()).isEqualTo(404);

        var matchesBySlugResponse = controller.getTournamentMatches("non-existent", null, null);
        assertThat(matchesBySlugResponse.getStatusCode().value()).isEqualTo(404);

        var standingsByIdResponse = controller.getTournamentStandings(unknownId.toString(), null);
        assertThat(standingsByIdResponse.getStatusCode().value()).isEqualTo(404);

        var standingsBySlugResponse = controller.getTournamentStandings("non-existent", null);
        assertThat(standingsBySlugResponse.getStatusCode().value()).isEqualTo(404);
    }

    private MatchResponse match(UUID category) {
        return MatchResponse.builder().id(UUID.randomUUID()).stage(MatchResponse.StageInfo.builder()
                .id(UUID.randomUUID().toString()).name("Final").categoryId(category).build()).build();
    }
}
