package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.official.OfficialRegistryDTO;
import com.athleticaos.backend.entities.OfficialRegistry;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.repositories.*;
import com.athleticaos.backend.services.AccessScopeService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OfficialServiceImplTest {

    @Mock private OfficialRegistryRepository officialRepository;
    @Mock private MatchOfficialRepository matchOfficialRepository;
    @Mock private UserRepository userRepository;
    @Mock private PersonRepository personRepository;
    @Mock private MatchRepository matchRepository;
    @Mock private TournamentRepository tournamentRepository;
    @Mock private OfficialRoleRepository officialRoleRepository;
    @Mock private TournamentOfficialRepository tournamentOfficialRepository;
    @Mock private AuditLogger auditLogger;
    @Mock private ObjectProvider<HttpServletRequest> requestProvider;
    @Mock private AccessScopeService accessScopeService;

    @InjectMocks
    private OfficialServiceImpl service;

    private UUID ownOrgId;
    private UUID otherOrgId;
    private Organisation ownOrg;
    private Organisation otherOrg;
    private OfficialRegistry inScopeOfficial;
    private OfficialRegistry outOfScopeOfficial;

    @BeforeEach
    void setUp() {
        ownOrgId = UUID.randomUUID();
        otherOrgId = UUID.randomUUID();

        ownOrg = Organisation.builder().id(ownOrgId).name("Own Club").build();
        otherOrg = Organisation.builder().id(otherOrgId).name("Other Club").build();

        User user1 = User.builder().id(UUID.randomUUID()).firstName("John").lastName("Ref").build();
        User user2 = User.builder().id(UUID.randomUUID()).firstName("Jane").lastName("Judge").build();

        inScopeOfficial = OfficialRegistry.builder()
                .id(UUID.randomUUID())
                .user(user1)
                .organisation(ownOrg)
                .accreditationLevel("LEVEL_1")
                .primaryRole("REFEREE")
                .build();

        outOfScopeOfficial = OfficialRegistry.builder()
                .id(UUID.randomUUID())
                .user(user2)
                .organisation(otherOrg)
                .accreditationLevel("LEVEL_2")
                .primaryRole("TOUCH_JUDGE")
                .build();
    }

    @Test
    void getAllOfficials_returnsOnlyOfficialsInAccessibleScope() {
        when(accessScopeService.getAccessibleOrgIds()).thenReturn(Set.of(ownOrgId));
        when(officialRepository.findAll()).thenReturn(List.of(inScopeOfficial, outOfScopeOfficial));

        List<OfficialRegistryDTO> result = service.getAllOfficials();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(inScopeOfficial.getId());
        assertThat(result.get(0).getFirstName()).isEqualTo("John");
    }

    @Test
    void getAllOfficials_superAdminReceivesAllOfficials() {
        when(accessScopeService.getAccessibleOrgIds()).thenReturn(null);
        when(officialRepository.findAll()).thenReturn(List.of(inScopeOfficial, outOfScopeOfficial));

        List<OfficialRegistryDTO> result = service.getAllOfficials();

        assertThat(result).hasSize(2);
    }

    @Test
    void getOfficialById_inScope_returnsOfficial() {
        when(officialRepository.findById(inScopeOfficial.getId())).thenReturn(Optional.of(inScopeOfficial));
        when(accessScopeService.isOrganisationInScope(ownOrgId)).thenReturn(true);

        OfficialRegistryDTO result = service.getOfficialById(inScopeOfficial.getId());

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(inScopeOfficial.getId());
        assertThat(result.getFirstName()).isEqualTo("John");
    }

    @Test
    void getOfficialById_outOfScope_throwsEntityNotFoundException() {
        when(officialRepository.findById(outOfScopeOfficial.getId())).thenReturn(Optional.of(outOfScopeOfficial));
        when(accessScopeService.isOrganisationInScope(otherOrgId)).thenReturn(false);

        assertThatThrownBy(() -> service.getOfficialById(outOfScopeOfficial.getId()))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Official not found");
    }
}
