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
    @Mock
    private com.athleticaos.backend.services.AccessScopeService accessScopeService;

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

        Set<UUID> accessibleTournamentIds = Set.of(tournament.getId());

        when(accessScopeService.getAccessibleTournamentIds()).thenReturn(accessibleTournamentIds);
        when(tournamentRepository.findByIdIn(accessibleTournamentIds)).thenReturn(List.of(tournament));

        // Act
        List<TournamentResponse> result = tournamentService.getAllTournaments(null);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Test Tournament", result.get(0).getName());
        verify(tournamentRepository).findByIdIn(accessibleTournamentIds);
    }

    @Test
    void getAllTournaments_ShouldReturnEmpty_WhenUserHasNoAccess() {
        // Arrange
        when(accessScopeService.getAccessibleTournamentIds()).thenReturn(Collections.emptySet());

        // Act
        List<TournamentResponse> result = tournamentService.getAllTournaments(null);

        // Assert
        assertNotNull(result);
        assertTrue(result.isEmpty());
        // Verify repository was NOT called
        verify(tournamentRepository, never()).findByIdIn(any());
        verify(tournamentRepository, never()).findAll();
    }

    @Test
    void updateTournament_moveOrganiser_outOfScope_throwsEntityNotFoundException_andOrganiserUnchanged() {
        UUID orgAId = UUID.randomUUID();
        UUID orgBId = UUID.randomUUID();
        Organisation orgA = Organisation.builder().id(orgAId).name("Org A").build();
        Tournament tournament = Tournament.builder()
                .id(UUID.randomUUID())
                .name("Tournament A")
                .organiserOrg(orgA)
                .deleted(false)
                .build();

        when(tournamentRepository.findById(tournament.getId())).thenReturn(java.util.Optional.of(tournament));
        when(accessScopeService.isOrganisationInScope(orgBId)).thenReturn(false);
        when(accessScopeService.getCurrentUserId()).thenReturn(UUID.randomUUID());

        com.athleticaos.backend.dtos.tournament.TournamentUpdateRequest request = new com.athleticaos.backend.dtos.tournament.TournamentUpdateRequest();
        request.setOrganiserOrgId(orgBId);

        assertThrows(jakarta.persistence.EntityNotFoundException.class, () ->
                tournamentService.updateTournament(tournament.getId(), request, null)
        );

        assertEquals(orgA, tournament.getOrganiserOrg());
        verify(organisationRepository, never()).findById(orgBId);
    }

    @Test
    void updateTournament_moveOrganiser_childOrgInScope_allowed() {
        UUID orgAId = UUID.randomUUID();
        UUID childOrgId = UUID.randomUUID();
        Organisation orgA = Organisation.builder().id(orgAId).name("Org A").build();
        Organisation childOrg = Organisation.builder().id(childOrgId).name("Child Org").build();
        Tournament tournament = Tournament.builder()
                .id(UUID.randomUUID())
                .name("Tournament A")
                .organiserOrg(orgA)
                .deleted(false)
                .categories(Collections.emptyList())
                .build();

        when(tournamentRepository.findById(tournament.getId())).thenReturn(java.util.Optional.of(tournament));
        when(accessScopeService.isOrganisationInScope(childOrgId)).thenReturn(true);
        when(organisationRepository.findById(childOrgId)).thenReturn(java.util.Optional.of(childOrg));
        when(tournamentRepository.save(any(Tournament.class))).thenAnswer(inv -> inv.getArgument(0));

        com.athleticaos.backend.dtos.tournament.TournamentUpdateRequest request = new com.athleticaos.backend.dtos.tournament.TournamentUpdateRequest();
        request.setOrganiserOrgId(childOrgId);

        TournamentResponse response = tournamentService.updateTournament(tournament.getId(), request, null);
        assertNotNull(response);
        assertEquals(childOrgId, tournament.getOrganiserOrg().getId());
    }

    @Test
    void updateTournament_moveOrganiser_superAdmin_allowed() {
        UUID orgAId = UUID.randomUUID();
        UUID anyOrgId = UUID.randomUUID();
        Organisation orgA = Organisation.builder().id(orgAId).name("Org A").build();
        Organisation anyOrg = Organisation.builder().id(anyOrgId).name("Any Org").build();
        Tournament tournament = Tournament.builder()
                .id(UUID.randomUUID())
                .name("Tournament A")
                .organiserOrg(orgA)
                .deleted(false)
                .categories(Collections.emptyList())
                .build();

        when(tournamentRepository.findById(tournament.getId())).thenReturn(java.util.Optional.of(tournament));
        when(accessScopeService.isOrganisationInScope(anyOrgId)).thenReturn(true);
        when(organisationRepository.findById(anyOrgId)).thenReturn(java.util.Optional.of(anyOrg));
        when(tournamentRepository.save(any(Tournament.class))).thenAnswer(inv -> inv.getArgument(0));

        com.athleticaos.backend.dtos.tournament.TournamentUpdateRequest request = new com.athleticaos.backend.dtos.tournament.TournamentUpdateRequest();
        request.setOrganiserOrgId(anyOrgId);

        TournamentResponse response = tournamentService.updateTournament(tournament.getId(), request, null);
        assertNotNull(response);
        assertEquals(anyOrgId, tournament.getOrganiserOrg().getId());
    }

    @Test
    void updateTournament_sameOrganiserReSent_allowedWithoutScopeCheck() {
        UUID orgAId = UUID.randomUUID();
        Organisation orgA = Organisation.builder().id(orgAId).name("Org A").build();
        Tournament tournament = Tournament.builder()
                .id(UUID.randomUUID())
                .name("Tournament A")
                .organiserOrg(orgA)
                .deleted(false)
                .categories(Collections.emptyList())
                .build();

        when(tournamentRepository.findById(tournament.getId())).thenReturn(java.util.Optional.of(tournament));
        when(tournamentRepository.save(any(Tournament.class))).thenAnswer(inv -> inv.getArgument(0));

        com.athleticaos.backend.dtos.tournament.TournamentUpdateRequest request = new com.athleticaos.backend.dtos.tournament.TournamentUpdateRequest();
        request.setOrganiserOrgId(orgAId);

        TournamentResponse response = tournamentService.updateTournament(tournament.getId(), request, null);
        assertNotNull(response);
        assertEquals(orgAId, tournament.getOrganiserOrg().getId());
        verify(accessScopeService, never()).isOrganisationInScope(any());
        verify(organisationRepository, never()).findById(any());
    }
}
