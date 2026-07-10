package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.tournament.TournamentResponse;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.enums.TournamentStatus;
import com.athleticaos.backend.repositories.MatchRepository;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.SeasonRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import com.athleticaos.backend.repositories.TournamentTeamRepository;
import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.services.impl.TournamentServiceImpl;
import com.athleticaos.backend.repositories.TeamRepository;
import com.athleticaos.backend.repositories.TournamentPlayerRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TournamentServiceTest {

    @Mock
    private TournamentRepository tournamentRepository;
    @Mock
    private OrganisationRepository organisationRepository;
    @Mock
    private SeasonRepository seasonRepository;
    @Mock
    private UserService userService;
    @Mock
    private MatchRepository matchRepository;
    @Mock
    private TournamentTeamRepository tournamentTeamRepository;
    @Mock
    private AuditLogger auditLogger;
    @Mock
    private FormatService formatService;
    @Mock
    private TeamRepository teamRepository;
    @Mock
    private TournamentPlayerRepository tournamentPlayerRepository;

    @InjectMocks
    private TournamentServiceImpl tournamentService;

    @Test
    void getAllTournaments_ShouldReturnTournaments_WhenUserHasAccess() {
        // Arrange
        UUID orgId = UUID.randomUUID();
        Organisation org = Organisation.builder().id(orgId).name("Test Org").build();

        Tournament tournament = Tournament.builder()
                .id(UUID.randomUUID())
                .name("Test Tournament")
                .organiserOrg(org)
                .level("National")
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(2))
                .status(TournamentStatus.DRAFT)
                .categories(Collections.emptyList())
                .deleted(false)
                .build();

        Set<UUID> accessibleIds = Set.of(orgId);

        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(accessibleIds);
        when(tournamentRepository.findByOrganiserOrg_IdIn(accessibleIds)).thenReturn(List.of(tournament));

        // Act
        List<TournamentResponse> result = tournamentService.getAllTournaments(null);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Test Tournament", result.get(0).getName());
        verify(tournamentRepository).findByOrganiserOrg_IdIn(accessibleIds);
    }

    @Test
    void getAllTournaments_ShouldReturnEmpty_WhenUserHasNoAccess() {
        // Arrange
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(Collections.emptySet());

        // Act
        List<TournamentResponse> result = tournamentService.getAllTournaments(null);

        // Assert
        assertNotNull(result);
        assertTrue(result.isEmpty());
        // Verify repository was NOT called
        verify(tournamentRepository, never()).findByOrganiserOrg_IdIn(any());
        verify(tournamentRepository, never()).findAll();
    }
}
