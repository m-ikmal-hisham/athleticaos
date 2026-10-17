package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.repositories.MatchOfficialRepository;
import com.athleticaos.backend.repositories.MatchRepository;
import com.athleticaos.backend.repositories.OrganisationPersonRepository;
import com.athleticaos.backend.repositories.PlayerTeamRepository;
import com.athleticaos.backend.repositories.TournamentOfficialRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import com.athleticaos.backend.repositories.TournamentTeamRepository;
import com.athleticaos.backend.services.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccessScopeServiceImplTest {

    @Mock
    private UserService userService;

    @Mock
    private OrganisationPersonRepository organisationPersonRepository;

    @Mock
    private PlayerTeamRepository playerTeamRepository;

    @Mock
    private TournamentRepository tournamentRepository;

    @Mock
    private TournamentOfficialRepository tournamentOfficialRepository;

    @Mock
    private MatchOfficialRepository matchOfficialRepository;

    @Mock
    private TournamentTeamRepository tournamentTeamRepository;

    @Mock
    private MatchRepository matchRepository;

    @InjectMocks
    private AccessScopeServiceImpl accessScopeService;

    private UUID ownOrgId;
    private UUID childOrgId;
    private UUID otherOrgId;
    private Team ownTeam;
    private Team childTeam;
    private Team otherTeam;
    private UUID personId;

    @BeforeEach
    void setUp() {
        ownOrgId = UUID.randomUUID();
        childOrgId = UUID.randomUUID();
        otherOrgId = UUID.randomUUID();
        personId = UUID.randomUUID();

        Organisation ownOrg = Organisation.builder().id(ownOrgId).name("Own Org").build();
        Organisation childOrg = Organisation.builder().id(childOrgId).name("Child Org").build();
        Organisation otherOrg = Organisation.builder().id(otherOrgId).name("Other Org").build();

        ownTeam = Team.builder().id(UUID.randomUUID()).name("Own Team").organisation(ownOrg).build();
        childTeam = Team.builder().id(UUID.randomUUID()).name("Child Team").organisation(childOrg).build();
        otherTeam = Team.builder().id(UUID.randomUUID()).name("Other Team").organisation(otherOrg).build();
    }

    @Test
    void superAdmin_everythingIsInScope() {
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(null);

        assertThat(accessScopeService.isOrganisationInScope(ownOrgId)).isTrue();
        assertThat(accessScopeService.isOrganisationInScope(otherOrgId)).isTrue();
        assertThat(accessScopeService.isTeamInScope(ownTeam)).isTrue();
        assertThat(accessScopeService.isTeamInScope(otherTeam)).isTrue();
        assertThat(accessScopeService.isPersonInScope(personId)).isTrue();

        verify(organisationPersonRepository, never()).existsByPersonIdAndOrganisationIdIn(any(), any());
    }

    @Test
    void ownOrgAndDescendantOrg_inScopeChecks() {
        Set<UUID> accessibleIds = Set.of(ownOrgId, childOrgId);
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(accessibleIds);

        // Organisation checks
        assertThat(accessScopeService.isOrganisationInScope(ownOrgId)).isTrue();
        assertThat(accessScopeService.isOrganisationInScope(childOrgId)).isTrue();
        assertThat(accessScopeService.isOrganisationInScope(otherOrgId)).isFalse();

        // Team checks
        assertThat(accessScopeService.isTeamInScope(ownTeam)).isTrue();
        assertThat(accessScopeService.isTeamInScope(childTeam)).isTrue();
        assertThat(accessScopeService.isTeamInScope(otherTeam)).isFalse();

        // Person checks
        when(organisationPersonRepository.existsByPersonIdAndOrganisationIdIn(personId, accessibleIds))
                .thenReturn(true);
        assertThat(accessScopeService.isPersonInScope(personId)).isTrue();

        UUID unlinkedPersonId = UUID.randomUUID();
        when(organisationPersonRepository.existsByPersonIdAndOrganisationIdIn(unlinkedPersonId, accessibleIds))
                .thenReturn(false);
        assertThat(accessScopeService.isPersonInScope(unlinkedPersonId)).isFalse();
    }

    @Test
    void emptySet_nothingIsInScope_andNeverCallsRepository() {
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(Collections.emptySet());

        assertThat(accessScopeService.isOrganisationInScope(ownOrgId)).isFalse();
        assertThat(accessScopeService.isTeamInScope(ownTeam)).isFalse();
        assertThat(accessScopeService.isPersonInScope(personId)).isFalse();

        verify(organisationPersonRepository, never()).existsByPersonIdAndOrganisationIdIn(any(), any());
    }

    @Test
    void nullInputs_returnFalseGracefully() {
        assertThat(accessScopeService.isOrganisationInScope(null)).isFalse();
        assertThat(accessScopeService.isTeamInScope(null)).isFalse();
        assertThat(accessScopeService.isTeamInScope(Team.builder().id(UUID.randomUUID()).organisation(null).build())).isFalse();
        assertThat(accessScopeService.isTeamInScope(Team.builder().id(UUID.randomUUID()).organisation(Organisation.builder().id(null).build()).build())).isFalse();
        assertThat(accessScopeService.isPersonInScope(null)).isFalse();

        verify(organisationPersonRepository, never()).existsByPersonIdAndOrganisationIdIn(any(), any());
    }

    @Test
    void getCurrentUserId_returnsUserIdOrNull() {
        UUID userId = UUID.randomUUID();
        User mockUser = User.builder().id(userId).email("user.a@example.test").build();

        when(userService.getCurrentUser()).thenReturn(mockUser);
        assertThat(accessScopeService.getCurrentUserId()).isEqualTo(userId);

        when(userService.getCurrentUser()).thenReturn(null);
        assertThat(accessScopeService.getCurrentUserId()).isNull();
    }

    @Test
    void isPlayerInScope_superAdmin_returnsTrue() {
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(null);
        Player player = Player.builder().id(UUID.randomUUID()).build();
        assertThat(accessScopeService.isPlayerInScope(player)).isTrue();
    }

    @Test
    void isPlayerInScope_emptySet_returnsFalseAndNeverQueriesRepositories() {
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(Collections.emptySet());
        Player player = Player.builder().id(UUID.randomUUID()).build();
        assertThat(accessScopeService.isPlayerInScope(player)).isFalse();
        verify(organisationPersonRepository, never()).existsByPersonIdAndOrganisationIdIn(any(), any());
        verify(playerTeamRepository, never()).existsActiveByPlayerIdAndOrganisationIdIn(any(), any());
    }

    @Test
    void isPlayerInScope_nullPlayer_returnsFalse() {
        assertThat(accessScopeService.isPlayerInScope(null)).isFalse();
    }

    @Test
    void isPlayerInScope_inScopeViaPerson_returnsTrue() {
        UUID orgId = UUID.randomUUID();
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(Set.of(orgId));

        Person person = new Person();
        person.setId(UUID.randomUUID());
        Player player = Player.builder().id(UUID.randomUUID()).person(person).build();

        when(organisationPersonRepository.existsByPersonIdAndOrganisationIdIn(person.getId(), Set.of(orgId)))
                .thenReturn(true);

        assertThat(accessScopeService.isPlayerInScope(player)).isTrue();
        verify(playerTeamRepository, never()).existsActiveByPlayerIdAndOrganisationIdIn(any(), any());
    }

    @Test
    void isPlayerInScope_inScopeViaTeam_returnsTrue() {
        UUID orgId = UUID.randomUUID();
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(Set.of(orgId));

        Person person = new Person();
        person.setId(UUID.randomUUID());
        Player player = Player.builder().id(UUID.randomUUID()).person(person).build();

        when(organisationPersonRepository.existsByPersonIdAndOrganisationIdIn(person.getId(), Set.of(orgId)))
                .thenReturn(false);
        when(playerTeamRepository.existsActiveByPlayerIdAndOrganisationIdIn(player.getId(), Set.of(orgId)))
                .thenReturn(true);

        assertThat(accessScopeService.isPlayerInScope(player)).isTrue();
    }

    @Test
    void isPlayerInScope_outOfScope_returnsFalse() {
        UUID orgId = UUID.randomUUID();
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(Set.of(orgId));

        Person person = new Person();
        person.setId(UUID.randomUUID());
        Player player = Player.builder().id(UUID.randomUUID()).person(person).build();

        when(organisationPersonRepository.existsByPersonIdAndOrganisationIdIn(person.getId(), Set.of(orgId)))
                .thenReturn(false);
        when(playerTeamRepository.existsActiveByPlayerIdAndOrganisationIdIn(player.getId(), Set.of(orgId)))
                .thenReturn(false);

        assertThat(accessScopeService.isPlayerInScope(player)).isFalse();
    }

    @Test
    void isUserInScope_superAdmin_returnsTrue() {
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(null);
        User targetUser = User.builder().id(UUID.randomUUID()).build();
        assertThat(accessScopeService.isUserInScope(targetUser)).isTrue();
    }

    @Test
    void isUserInScope_emptySet_returnsFalse() {
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(Collections.emptySet());
        User targetUser = User.builder().id(UUID.randomUUID()).organisation(Organisation.builder().id(UUID.randomUUID()).build()).build();
        assertThat(accessScopeService.isUserInScope(targetUser)).isFalse();
    }

    @Test
    void isUserInScope_nullUserOrNullOrg_returnsFalse() {
        assertThat(accessScopeService.isUserInScope(null)).isFalse();
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(Set.of(UUID.randomUUID()));
        assertThat(accessScopeService.isUserInScope(User.builder().id(UUID.randomUUID()).organisation(null).build())).isFalse();
    }

    @Test
    void isUserInScope_inScope_returnsTrue() {
        UUID orgId = UUID.randomUUID();
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(Set.of(orgId));
        User targetUser = User.builder().id(UUID.randomUUID()).organisation(Organisation.builder().id(orgId).build()).build();
        assertThat(accessScopeService.isUserInScope(targetUser)).isTrue();
    }

    @Test
    void isUserInScope_outOfScope_returnsFalse() {
        UUID orgId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(Set.of(orgId));
        User targetUser = User.builder().id(UUID.randomUUID()).organisation(Organisation.builder().id(otherId).build()).build();
        assertThat(accessScopeService.isUserInScope(targetUser)).isFalse();
    }

    @Test
    void canReadMatch_and_canWriteMatch_assignedAsTournamentOfficial_allowsAccess() {
        UUID tournamentId = UUID.randomUUID();
        UUID officialUserId = UUID.randomUUID();
        UUID matchId = UUID.randomUUID();

        Tournament tournament = Tournament.builder()
                .id(tournamentId)
                .organiserOrg(Organisation.builder().id(UUID.randomUUID()).build())
                .build();
        Match match = Match.builder()
                .id(matchId)
                .tournament(tournament)
                .build();

        // Not super admin, tournament not in org scope
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(Set.of(UUID.randomUUID()));
        when(userService.getCurrentUser()).thenReturn(User.builder().id(officialUserId).build());

        // Official is NOT assigned to this specific match
        when(matchOfficialRepository.isUserAssignedToMatch(matchId, officialUserId)).thenReturn(false);

        // Official IS assigned to the tournament (TournamentOfficial with isActive = true)
        when(tournamentOfficialRepository.isUserAssignedToTournament(tournamentId, officialUserId)).thenReturn(true);

        // Both canReadMatch and canWriteMatch should return true (isUserAssignedToMatch checks tournamentOfficialRepository)
        assertThat(accessScopeService.canReadMatch(match)).isTrue();
        assertThat(accessScopeService.canWriteMatch(match)).isTrue();
    }

    @Test
    void matchLevelOfficial_canWriteAssignedMatch_cannotWriteOtherMatch_inSameTournament() {
        UUID tournamentId = UUID.randomUUID();
        UUID officialUserId = UUID.randomUUID();
        UUID m1Id = UUID.randomUUID();
        UUID m2Id = UUID.randomUUID();

        Tournament tournament = Tournament.builder()
                .id(tournamentId)
                .organiserOrg(Organisation.builder().id(UUID.randomUUID()).build())
                .build();
        Match m1 = Match.builder().id(m1Id).tournament(tournament).build();
        Match m2 = Match.builder().id(m2Id).tournament(tournament).build();

        // Not super admin, tournament not in org scope
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(Set.of(UUID.randomUUID()));
        when(userService.getCurrentUser()).thenReturn(User.builder().id(officialUserId).build());

        // Official assigned to M1, but NOT M2
        when(matchOfficialRepository.isUserAssignedToMatch(m1Id, officialUserId)).thenReturn(true);
        when(matchOfficialRepository.isUserAssignedToMatch(m2Id, officialUserId)).thenReturn(false);

        // NOT on tournament panel
        when(tournamentOfficialRepository.isUserAssignedToTournament(tournamentId, officialUserId)).thenReturn(false);

        // For M2 read check: isUserAssignedToTournamentMatches returns true because official is assigned to M1 in this tournament
        when(matchOfficialRepository.isUserAssignedToTournamentMatches(tournamentId, officialUserId)).thenReturn(true);

        // M1: canWrite is true
        assertThat(accessScopeService.canWriteMatch(m1)).isTrue();

        // M2: canWrite is false, canRead is true
        assertThat(accessScopeService.canWriteMatch(m2)).isFalse();
        assertThat(accessScopeService.canReadMatch(m2)).isTrue();
    }

    @Test
    void canReadMatch_and_canWriteMatch_unassignedOfficial_deniesAccess() {
        UUID tournamentId = UUID.randomUUID();
        UUID officialUserId = UUID.randomUUID();
        UUID matchId = UUID.randomUUID();

        Tournament tournament = Tournament.builder()
                .id(tournamentId)
                .organiserOrg(Organisation.builder().id(UUID.randomUUID()).build())
                .build();
        Match match = Match.builder()
                .id(matchId)
                .tournament(tournament)
                .build();

        // Not super admin, tournament not in org scope
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(Set.of(UUID.randomUUID()));
        when(userService.getCurrentUser()).thenReturn(User.builder().id(officialUserId).build());

        // Not assigned to match
        when(matchOfficialRepository.isUserAssignedToMatch(matchId, officialUserId)).thenReturn(false);
        // Not assigned to tournament
        when(tournamentOfficialRepository.isUserAssignedToTournament(tournamentId, officialUserId)).thenReturn(false);
        when(matchOfficialRepository.isUserAssignedToTournamentMatches(tournamentId, officialUserId)).thenReturn(false);

        // Can neither read nor write
        assertThat(accessScopeService.canReadMatch(match)).isFalse();
        assertThat(accessScopeService.canWriteMatch(match)).isFalse();
    }
}
