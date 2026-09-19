package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.repositories.OrganisationPersonRepository;
import com.athleticaos.backend.repositories.PlayerTeamRepository;
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
}
