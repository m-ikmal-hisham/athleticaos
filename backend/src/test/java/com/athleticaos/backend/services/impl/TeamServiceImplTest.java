package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.playerteam.PlayerInTeamDTO;
import com.athleticaos.backend.dtos.team.PersonSummaryDTO;
import com.athleticaos.backend.dtos.team.TeamResponse;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.OrganisationPerson;
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.repositories.OrganisationPersonRepository;
import com.athleticaos.backend.repositories.TeamRepository;
import com.athleticaos.backend.repositories.TeamStaffRepository;
import com.athleticaos.backend.repositories.TournamentTeamRepository;
import com.athleticaos.backend.services.AccessScopeService;
import com.athleticaos.backend.services.PlayerTeamService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class TeamServiceImplTest {

    @Mock
    private TeamRepository teamRepository;
    @Mock
    private PlayerTeamService playerTeamService;
    @Mock
    private OrganisationPersonRepository organisationPersonRepository;
    @Mock
    private TeamStaffRepository teamStaffRepository;
    @Mock
    private TournamentTeamRepository tournamentTeamRepository;
    @Mock
    private AccessScopeService accessScopeService;
    @Mock
    private com.athleticaos.backend.repositories.OrganisationRepository organisationRepository;
    @Mock
    private com.athleticaos.backend.repositories.PersonRepository personRepository;
    @Mock
    private com.athleticaos.backend.repositories.StaffRoleRepository staffRoleRepository;
    @Mock
    private com.athleticaos.backend.audit.AuditLogger auditLogger;

    @InjectMocks
    private TeamServiceImpl teamService;

    private UUID teamId;
    private String slug;
    private Team team;
    private Organisation org;

    @BeforeEach
    void setUp() {
        teamId = UUID.randomUUID();
        slug = "team-alpha";
        org = Organisation.builder().id(UUID.randomUUID()).name("Org Alpha").build();
        team = Team.builder()
                .id(teamId)
                .name("Team Alpha")
                .slug(slug)
                .organisation(org)
                .category("MENS")
                .ageGroup("SENIOR")
                .status("Active")
                .build();
        lenient().when(tournamentTeamRepository.findActiveTournamentsByTeamId(any()))
                .thenReturn(Collections.emptyList());
        lenient().when(accessScopeService.isTeamInScope(any())).thenReturn(true);
        lenient().when(accessScopeService.isOrganisationInScope(any())).thenReturn(true);
        lenient().when(accessScopeService.isPersonInScope(any())).thenReturn(true);
    }

    // R1: getTeamByIdInScope
    @Test
    void getTeamByIdInScope_whenInScope_returnsResponse() {
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(accessScopeService.isTeamInScope(team)).thenReturn(true);
        when(playerTeamService.getTeamRoster(teamId, null)).thenReturn(Collections.emptyList());

        TeamResponse response = teamService.getTeamByIdInScope(teamId);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(teamId);
        assertThat(response.getName()).isEqualTo("Team Alpha");
    }

    @Test
    void getTeamByIdInScope_whenOutOfScope_throws404ExactMessage() {
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(accessScopeService.isTeamInScope(team)).thenReturn(false);
        when(accessScopeService.getCurrentUserId()).thenReturn(UUID.randomUUID());

        assertThatThrownBy(() -> teamService.getTeamByIdInScope(teamId))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Team not found");
    }

    @Test
    void getTeamByIdInScope_whenMissing_throws404ExactMessage() {
        when(teamRepository.findById(teamId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> teamService.getTeamByIdInScope(teamId))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Team not found");
    }

    @Test
    void getTeamByIdInScope_whenSuperAdmin_returnsResponse() {
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(accessScopeService.isTeamInScope(team)).thenReturn(true);
        when(playerTeamService.getTeamRoster(teamId, null)).thenReturn(Collections.emptyList());

        TeamResponse response = teamService.getTeamByIdInScope(teamId);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(teamId);
    }

    // R1: getTeamBySlugInScope
    @Test
    void getTeamBySlugInScope_whenInScope_returnsResponse() {
        when(teamRepository.findBySlug(slug)).thenReturn(Optional.of(team));
        when(accessScopeService.isTeamInScope(team)).thenReturn(true);
        when(playerTeamService.getTeamRoster(teamId, null)).thenReturn(Collections.emptyList());

        TeamResponse response = teamService.getTeamBySlugInScope(slug);

        assertThat(response).isNotNull();
        assertThat(response.getSlug()).isEqualTo(slug);
    }

    @Test
    void getTeamBySlugInScope_whenOutOfScope_throws404WithExactSlugMessage() {
        when(teamRepository.findBySlug(slug)).thenReturn(Optional.of(team));
        when(accessScopeService.isTeamInScope(team)).thenReturn(false);
        when(accessScopeService.getCurrentUserId()).thenReturn(UUID.randomUUID());

        assertThatThrownBy(() -> teamService.getTeamBySlugInScope(slug))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Team not found with slug: " + slug);
    }

    @Test
    void getTeamBySlugInScope_whenMissing_throws404WithExactSlugMessage() {
        when(teamRepository.findBySlug(slug)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> teamService.getTeamBySlugInScope(slug))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Team not found with slug: " + slug);
    }

    // R2: getPlayersByTeamInScope
    @Test
    void getPlayersByTeamInScope_whenInScope_returnsRoster() {
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(accessScopeService.isTeamInScope(team)).thenReturn(true);
        PlayerInTeamDTO player = PlayerInTeamDTO.builder().playerId(UUID.randomUUID()).firstName("Player").lastName("A").email("player.a@example.test").build();
        when(playerTeamService.getTeamRoster(teamId, null)).thenReturn(List.of(player));

        List<PlayerInTeamDTO> result = teamService.getPlayersByTeamInScope(teamId, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEmail()).isEqualTo("player.a@example.test");
    }

    @Test
    void getPlayersByTeamInScope_whenOutOfScope_returnsEmptyList() {
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(accessScopeService.isTeamInScope(team)).thenReturn(false);
        when(accessScopeService.getCurrentUserId()).thenReturn(UUID.randomUUID());

        List<PlayerInTeamDTO> result = teamService.getPlayersByTeamInScope(teamId, null);

        assertThat(result).isEmpty();
    }

    @Test
    void getPlayersByTeamInScope_whenMissingTeam_returnsEmptyList() {
        when(teamRepository.findById(teamId)).thenReturn(Optional.empty());

        List<PlayerInTeamDTO> result = teamService.getPlayersByTeamInScope(teamId, null);

        assertThat(result).isEmpty();
    }

    // R3: getAvailablePersonsForStaffInScope
    @Test
    void getAvailablePersonsForStaffInScope_whenInScope_returnsStaffList() {
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(accessScopeService.isTeamInScope(team)).thenReturn(true);
        Person person = new Person();
        person.setId(UUID.randomUUID());
        person.setFirstName("Staff");
        person.setLastName("Member");
        person.setEmail("staff.a@example.test");
        person.setRegistrationNo("AOS-900001");
        OrganisationPerson op = OrganisationPerson.builder().organisation(org).person(person).build();
        when(organisationPersonRepository.findByOrganisationIdOrHierarchy(org.getId())).thenReturn(List.of(op));

        List<PersonSummaryDTO> result = teamService.getAvailablePersonsForStaffInScope(teamId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getRegistrationNo()).isEqualTo("AOS-900001");
        assertThat(result.get(0).getEmail()).isEqualTo("staff.a@example.test");
    }

    @Test
    void getAvailablePersonsForStaffInScope_whenOutOfScope_throws404ExactMessage() {
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(accessScopeService.isTeamInScope(team)).thenReturn(false);
        when(accessScopeService.getCurrentUserId()).thenReturn(UUID.randomUUID());

        assertThatThrownBy(() -> teamService.getAvailablePersonsForStaffInScope(teamId))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Team not found");
    }

    @Test
    void getAvailablePersonsForStaffInScope_whenMissingTeam_throws404ExactMessage() {
        when(teamRepository.findById(teamId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> teamService.getAvailablePersonsForStaffInScope(teamId))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Team not found");
    }

    // W4: createTeam scope tests
    @Test
    void createTeam_whenOrganisationOutOfScope_throwsNotFoundWithExactMessageAndNeverSaves() {
        when(organisationRepository.findById(org.getId())).thenReturn(Optional.of(org));
        when(accessScopeService.isOrganisationInScope(org.getId())).thenReturn(false);
        when(accessScopeService.getCurrentUserId()).thenReturn(UUID.randomUUID());

        com.athleticaos.backend.dtos.team.TeamCreateRequest request = new com.athleticaos.backend.dtos.team.TeamCreateRequest();
        request.setOrganisationId(org.getId());
        request.setName("New Team");

        assertThatThrownBy(() -> teamService.createTeam(request, null))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Organisation not found");

        verify(teamRepository, never()).save(any());
        verify(auditLogger, never()).logTeamCreated(any(), any());
    }

    // W4: deleteTeam scope tests
    @Test
    void deleteTeam_whenTeamOutOfScope_throwsNotFoundWithExactMessageAndNeverDeletes() {
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(accessScopeService.isTeamInScope(team)).thenReturn(false);
        when(accessScopeService.getCurrentUserId()).thenReturn(UUID.randomUUID());

        assertThatThrownBy(() -> teamService.deleteTeam(teamId, null))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Team not found");

        verify(teamRepository, never()).delete(any());
        verify(auditLogger, never()).logTeamDeleted(any(), any());
    }

    // W5: addTeamStaff scope tests
    @Test
    void addTeamStaff_whenTeamOutOfScope_throwsNotFoundWithExactMessageAndNeverSaves() {
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(accessScopeService.isTeamInScope(team)).thenReturn(false);
        when(accessScopeService.getCurrentUserId()).thenReturn(UUID.randomUUID());

        com.athleticaos.backend.dtos.team.AddTeamStaffRequest request = new com.athleticaos.backend.dtos.team.AddTeamStaffRequest();
        request.setPersonId(UUID.randomUUID());
        request.setStaffRoleId(1);

        assertThatThrownBy(() -> teamService.addTeamStaff(teamId, request, null))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Team not found");

        verify(personRepository, never()).findById(any());
        verify(teamStaffRepository, never()).save(any());
    }

    @Test
    void addTeamStaff_whenPersonOutOfScope_throwsNotFoundWithExactMessageAndNeverSaves() {
        UUID personId = UUID.randomUUID();
        Person person = Person.builder().id(personId).firstName("Staff").lastName("One").build();
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(accessScopeService.isTeamInScope(team)).thenReturn(true);
        when(personRepository.findById(personId)).thenReturn(Optional.of(person));
        when(accessScopeService.isPersonInScope(personId)).thenReturn(false);
        when(accessScopeService.getCurrentUserId()).thenReturn(UUID.randomUUID());

        com.athleticaos.backend.dtos.team.AddTeamStaffRequest request = new com.athleticaos.backend.dtos.team.AddTeamStaffRequest();
        request.setPersonId(personId);
        request.setStaffRoleId(1);

        assertThatThrownBy(() -> teamService.addTeamStaff(teamId, request, null))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Person not found");

        verify(staffRoleRepository, never()).findById(any());
        verify(teamStaffRepository, never()).save(any());
    }

    // W5: removeTeamStaff scope tests
    @Test
    void removeTeamStaff_whenTeamOutOfScope_throwsNotFoundWithExactMessageAndNeverDeletes() {
        UUID staffAssignmentId = UUID.randomUUID();
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(accessScopeService.isTeamInScope(team)).thenReturn(false);
        when(accessScopeService.getCurrentUserId()).thenReturn(UUID.randomUUID());

        assertThatThrownBy(() -> teamService.removeTeamStaff(teamId, staffAssignmentId, null))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Team not found");

        verify(teamStaffRepository, never()).findById(any());
        verify(teamStaffRepository, never()).delete(any());
    }

    @Test
    void removeTeamStaff_whenStaffNotBelongingToTeam_throwsIllegalArgument() {
        UUID staffAssignmentId = UUID.randomUUID();
        UUID otherTeamId = UUID.randomUUID();
        Team otherTeam = Team.builder().id(otherTeamId).name("Other Team").build();
        com.athleticaos.backend.entities.TeamStaff teamStaff = com.athleticaos.backend.entities.TeamStaff.builder()
                .id(staffAssignmentId)
                .team(otherTeam)
                .build();

        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(accessScopeService.isTeamInScope(team)).thenReturn(true);
        when(teamStaffRepository.findById(staffAssignmentId)).thenReturn(Optional.of(teamStaff));

        assertThatThrownBy(() -> teamService.removeTeamStaff(teamId, staffAssignmentId, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Staff does not belong to this team");

        verify(teamStaffRepository, never()).delete(any());
    }
}
