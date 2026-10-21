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

    @Test
    void updateFeatured_superAdmin_featuresAndReorders_shiftsAndClosesGaps() {
        Tournament t1 = Tournament.builder().id(UUID.randomUUID()).name("T1").isPublished(true).featured(true).featuredOrder(1).categories(Collections.emptyList()).build();
        Tournament t2 = Tournament.builder().id(UUID.randomUUID()).name("T2").isPublished(true).featured(true).featuredOrder(2).categories(Collections.emptyList()).build();
        Tournament newT = Tournament.builder().id(UUID.randomUUID()).name("New T").isPublished(true).featured(false).categories(Collections.emptyList()).build();

        when(tournamentRepository.findById(newT.getId())).thenReturn(java.util.Optional.of(newT));
        when(accessScopeService.isSuperAdmin()).thenReturn(true);
        when(tournamentRepository.findFeaturedForUpdate()).thenReturn(new java.util.ArrayList<>(List.of(t1, t2)));
        when(tournamentRepository.save(any(Tournament.class))).thenAnswer(inv -> inv.getArgument(0));

        com.athleticaos.backend.dtos.tournament.TournamentFeaturedRequest req =
                new com.athleticaos.backend.dtos.tournament.TournamentFeaturedRequest(true, 1);

        TournamentResponse response = tournamentService.updateFeatured(newT.getId(), req, null);

        assertTrue(response.isFeatured());
        assertEquals(1, response.getFeaturedOrder());
        assertEquals(2, t1.getFeaturedOrder());
        assertEquals(3, t2.getFeaturedOrder());
        verify(auditLogger).logTournamentFeatured(eq(newT.getId()), eq(1), isNull());
    }

    @Test
    void updateFeatured_orgAdmin_ignoresFeaturedOrder_appendsLast() {
        Tournament t1 = Tournament.builder().id(UUID.randomUUID()).name("T1").isPublished(true).featured(true).featuredOrder(1).categories(Collections.emptyList()).build();
        Tournament newT = Tournament.builder().id(UUID.randomUUID()).name("New T").isPublished(true).featured(false).categories(Collections.emptyList()).build();

        when(tournamentRepository.findById(newT.getId())).thenReturn(java.util.Optional.of(newT));
        when(accessScopeService.isSuperAdmin()).thenReturn(false);
        when(tournamentRepository.findFeaturedForUpdate()).thenReturn(new java.util.ArrayList<>(List.of(t1)));
        when(tournamentRepository.save(any(Tournament.class))).thenAnswer(inv -> inv.getArgument(0));

        com.athleticaos.backend.dtos.tournament.TournamentFeaturedRequest req =
                new com.athleticaos.backend.dtos.tournament.TournamentFeaturedRequest(true, 1);

        TournamentResponse response = tournamentService.updateFeatured(newT.getId(), req, null);

        assertTrue(response.isFeatured());
        assertEquals(2, response.getFeaturedOrder());
        assertEquals(1, t1.getFeaturedOrder());
    }

    @Test
    void updateFeatured_orgAdmin_whenFull_throws400() {
        Tournament newT = Tournament.builder().id(UUID.randomUUID()).name("New T").isPublished(true).featured(false).build();
        when(tournamentRepository.findById(newT.getId())).thenReturn(java.util.Optional.of(newT));
        when(accessScopeService.isSuperAdmin()).thenReturn(false);
        List<Tournament> fullList = new java.util.ArrayList<>();
        for (int i = 0; i < 6; i++) {
            fullList.add(Tournament.builder().id(UUID.randomUUID()).name("T" + i).isPublished(true).featured(true).featuredOrder(i + 1).build());
        }
        when(tournamentRepository.findFeaturedForUpdate()).thenReturn(fullList);

        com.athleticaos.backend.dtos.tournament.TournamentFeaturedRequest req =
                new com.athleticaos.backend.dtos.tournament.TournamentFeaturedRequest(true, null);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> tournamentService.updateFeatured(newT.getId(), req, null));
        assertEquals("The home page already shows six tournaments — ask a platform administrator to make room.", ex.getMessage());
    }

    @Test
    void updateFeatured_superAdmin_whenFull_throws400() {
        Tournament newT = Tournament.builder().id(UUID.randomUUID()).name("New T").isPublished(true).featured(false).build();
        when(tournamentRepository.findById(newT.getId())).thenReturn(java.util.Optional.of(newT));
        when(accessScopeService.isSuperAdmin()).thenReturn(true);
        List<Tournament> fullList = new java.util.ArrayList<>();
        for (int i = 0; i < 6; i++) {
            fullList.add(Tournament.builder().id(UUID.randomUUID()).name("T" + i).isPublished(true).featured(true).featuredOrder(i + 1).build());
        }
        when(tournamentRepository.findFeaturedForUpdate()).thenReturn(fullList);

        com.athleticaos.backend.dtos.tournament.TournamentFeaturedRequest req =
                new com.athleticaos.backend.dtos.tournament.TournamentFeaturedRequest(true, 1);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> tournamentService.updateFeatured(newT.getId(), req, null));
        assertEquals("Six tournaments are already featured — remove one first.", ex.getMessage());
    }

    @Test
    void updateFeatured_invalidOrder_throws400() {
        Tournament t = Tournament.builder().id(UUID.randomUUID()).name("T").isPublished(true).build();
        when(tournamentRepository.findById(t.getId())).thenReturn(java.util.Optional.of(t));

        com.athleticaos.backend.dtos.tournament.TournamentFeaturedRequest req =
                new com.athleticaos.backend.dtos.tournament.TournamentFeaturedRequest(true, 7);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> tournamentService.updateFeatured(t.getId(), req, null));
        assertEquals("Order must be between 1 and 6.", ex.getMessage());
    }

    @Test
    void updateFeatured_unpublishedOrDeleted_throws400() {
        Tournament unpublished = Tournament.builder().id(UUID.randomUUID()).name("Unpublished").isPublished(false).build();
        when(tournamentRepository.findById(unpublished.getId())).thenReturn(java.util.Optional.of(unpublished));

        com.athleticaos.backend.dtos.tournament.TournamentFeaturedRequest req =
                new com.athleticaos.backend.dtos.tournament.TournamentFeaturedRequest(true, null);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> tournamentService.updateFeatured(unpublished.getId(), req, null));
        assertEquals("Only published tournaments can be featured.", ex.getMessage());
    }

    @Test
    void updateFeatured_unfeaturesAndClosesGaps() {
        Tournament t1 = Tournament.builder().id(UUID.randomUUID()).name("T1").isPublished(true).featured(true).featuredOrder(1).categories(Collections.emptyList()).build();
        Tournament t2 = Tournament.builder().id(UUID.randomUUID()).name("T2").isPublished(true).featured(true).featuredOrder(2).categories(Collections.emptyList()).build();
        Tournament t3 = Tournament.builder().id(UUID.randomUUID()).name("T3").isPublished(true).featured(true).featuredOrder(3).categories(Collections.emptyList()).build();

        when(tournamentRepository.findById(t2.getId())).thenReturn(java.util.Optional.of(t2));
        when(tournamentRepository.findFeaturedForUpdate()).thenReturn(new java.util.ArrayList<>(List.of(t1, t2, t3)));
        when(tournamentRepository.save(any(Tournament.class))).thenAnswer(inv -> inv.getArgument(0));

        com.athleticaos.backend.dtos.tournament.TournamentFeaturedRequest req =
                new com.athleticaos.backend.dtos.tournament.TournamentFeaturedRequest(false, null);

        TournamentResponse response = tournamentService.updateFeatured(t2.getId(), req, null);

        assertFalse(response.isFeatured());
        assertNull(response.getFeaturedOrder());
        assertEquals(1, t1.getFeaturedOrder());
        assertEquals(2, t3.getFeaturedOrder());
        verify(auditLogger).logTournamentUnfeatured(eq(t2.getId()), isNull());
    }

    @Test
    void updatePublishStatus_whenFalse_unfeatures() {
        Tournament t = Tournament.builder().id(UUID.randomUUID()).name("T").isPublished(true).featured(true).featuredOrder(1).categories(Collections.emptyList()).build();
        when(tournamentRepository.findById(t.getId())).thenReturn(java.util.Optional.of(t));
        when(tournamentRepository.findFeaturedForUpdate()).thenReturn(new java.util.ArrayList<>(List.of(t)));
        when(tournamentRepository.save(any(Tournament.class))).thenAnswer(inv -> inv.getArgument(0));

        TournamentResponse response = tournamentService.updatePublishStatus(t.getId(), false, null);

        assertFalse(response.isPublished());
        assertFalse(t.isFeatured());
        assertNull(t.getFeaturedOrder());
        verify(auditLogger).logTournamentUnfeatured(eq(t.getId()), isNull());
    }

    @Test
    void updateStatus_whenDraft_unfeatures() {
        Tournament t = Tournament.builder().id(UUID.randomUUID()).name("T").isPublished(true).status(TournamentStatus.PUBLISHED).featured(true).featuredOrder(1).categories(Collections.emptyList()).build();
        when(tournamentRepository.findById(t.getId())).thenReturn(java.util.Optional.of(t));
        when(tournamentRepository.findFeaturedForUpdate()).thenReturn(new java.util.ArrayList<>(List.of(t)));
        when(tournamentRepository.save(any(Tournament.class))).thenAnswer(inv -> inv.getArgument(0));

        TournamentResponse response = tournamentService.updateStatus(t.getId(), TournamentStatus.DRAFT, null);

        assertEquals("Draft", response.getStatus());
        assertFalse(t.isFeatured());
        assertNull(t.getFeaturedOrder());
        verify(auditLogger).logTournamentUnfeatured(eq(t.getId()), isNull());
    }

    @Test
    void updateTournament_whenUnpublished_unfeatures() {
        Tournament t = Tournament.builder().id(UUID.randomUUID()).name("T").isPublished(true).featured(true).featuredOrder(1).categories(Collections.emptyList()).build();
        when(tournamentRepository.findById(t.getId())).thenReturn(java.util.Optional.of(t));
        when(tournamentRepository.findFeaturedForUpdate()).thenReturn(new java.util.ArrayList<>(List.of(t)));
        when(tournamentRepository.save(any(Tournament.class))).thenAnswer(inv -> inv.getArgument(0));

        com.athleticaos.backend.dtos.tournament.TournamentUpdateRequest req = new com.athleticaos.backend.dtos.tournament.TournamentUpdateRequest();
        req.setIsPublished(false);

        TournamentResponse response = tournamentService.updateTournament(t.getId(), req, null);

        assertFalse(response.isPublished());
        assertFalse(t.isFeatured());
        assertNull(t.getFeaturedOrder());
        verify(auditLogger).logTournamentUnfeatured(eq(t.getId()), isNull());
    }

    @Test
    void deleteTournament_unfeatures() {
        Tournament t = Tournament.builder().id(UUID.randomUUID()).name("T").isPublished(true).featured(true).featuredOrder(1).categories(Collections.emptyList()).build();
        when(tournamentRepository.findById(t.getId())).thenReturn(java.util.Optional.of(t));
        when(tournamentRepository.findFeaturedForUpdate()).thenReturn(new java.util.ArrayList<>(List.of(t)));
        when(tournamentRepository.save(any(Tournament.class))).thenAnswer(inv -> inv.getArgument(0));

        tournamentService.deleteTournament(t.getId());

        assertTrue(t.getDeleted());
        assertFalse(t.isFeatured());
        assertNull(t.getFeaturedOrder());
        verify(auditLogger).logTournamentUnfeatured(eq(t.getId()), isNull());
    }

    @Test
    void getFeaturedTournaments_returnsMax6Ordered() {
        Tournament t1 = Tournament.builder().id(UUID.randomUUID()).name("T1").isPublished(true).featured(true).featuredOrder(1).categories(Collections.emptyList()).build();
        Tournament t2 = Tournament.builder().id(UUID.randomUUID()).name("T2").isPublished(true).featured(true).featuredOrder(2).categories(Collections.emptyList()).build();

        when(tournamentRepository.findFeaturedPublished()).thenReturn(List.of(t1, t2));

        List<TournamentResponse> results = tournamentService.getFeaturedTournaments();

        assertEquals(2, results.size());
        assertEquals("T1", results.get(0).getName());
        assertEquals("T2", results.get(1).getName());
    }
}
