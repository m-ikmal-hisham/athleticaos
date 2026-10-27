package com.athleticaos.backend.controllers;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.config.PublicHttpCache;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.enums.OrganisationLevel;
import com.athleticaos.backend.exceptions.GlobalExceptionHandler;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.PlayerTeamRepository;
import com.athleticaos.backend.repositories.TeamRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import com.athleticaos.backend.security.JwtAuthenticationFilter;
import com.athleticaos.backend.security.SecurityConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = PublicOrganisationController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@SuppressWarnings("null")
public class PublicOrganisationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrganisationRepository organisationRepository;

    @MockBean
    private TeamRepository teamRepository;

    @MockBean
    private PlayerTeamRepository playerTeamRepository;

    @MockBean
    private TournamentRepository tournamentRepository;

    @MockBean
    private AuditLogger auditLogger;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private UserDetailsService userDetailsService;

    @BeforeEach
    void setUp() throws Exception {
        org.mockito.Mockito.doAnswer(invocation -> {
            jakarta.servlet.FilterChain chain = invocation.getArgument(2);
            chain.doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(jwtAuthenticationFilter).doFilter(any(), any(), any());
    }

    @Test
    @DisplayName("GET /api/public/organisations/tree returns 200, 5-min cache header, and privacy-safe JSON")
    void getTree_success() throws Exception {
        Organisation union = Organisation.builder()
                .id(UUID.randomUUID())
                .name("Malaysia Rugby")
                .slug("malaysia-rugby")
                .orgLevel(OrganisationLevel.COUNTRY)
                .status("Active")
                .deleted(false)
                .state("Kuala Lumpur")
                .addressLine1("Secret Address 1")
                .city("Secret City")
                .postcode("50000")
                .build();

        Organisation club = Organisation.builder()
                .id(UUID.randomUUID())
                .name("Cobra RC")
                .slug("cobra-rc")
                .orgLevel(OrganisationLevel.CLUB)
                .parentOrg(union)
                .status("Active")
                .deleted(false)
                .state("Selangor")
                .build();

        Team team = Team.builder()
                .id(UUID.randomUUID())
                .name("Cobra Black")
                .slug("cobra-black")
                .organisation(club)
                .status("Active")
                .category("MENS")
                .ageGroup("SENIOR")
                .build();

        when(organisationRepository.findAllActiveNonDeletedWithParentOrg()).thenReturn(List.of(union, club));
        when(teamRepository.findAllActiveWithOrganisation()).thenReturn(List.of(team));
        when(playerTeamRepository.countActivePlayersGroupedByTeam()).thenReturn(List.<Object[]>of(
                new Object[]{team.getId(), 25L}
        ));

        mockMvc.perform(get("/api/public/organisations/tree"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", PublicHttpCache.CACHE_CONTROL_5MIN))
                .andExpect(jsonPath("$.organisations", hasSize(2)))
                .andExpect(jsonPath("$.teams", hasSize(1)))
                .andExpect(jsonPath("$.organisations[0].name", notNullValue()))
                .andExpect(jsonPath("$.teams[0].playerCount", is(25)))
                // Privacy checks: no address, postcode, city keys
                .andExpect(jsonPath("$.organisations[*].addressLine1").doesNotExist())
                .andExpect(jsonPath("$.organisations[*].addressLine2").doesNotExist())
                .andExpect(jsonPath("$.organisations[*].postcode").doesNotExist())
                .andExpect(jsonPath("$.organisations[*].city").doesNotExist())
                .andExpect(jsonPath("$.organisations[*].stateCode").doesNotExist())
                .andExpect(jsonPath("$.organisations[*].countryCode").doesNotExist());
    }

    @Test
    @DisplayName("GET /api/public/organisations/{slug} returns 200, 5-min cache header and detail DTO")
    void getDetail_bySlug_success() throws Exception {
        Organisation union = Organisation.builder()
                .id(UUID.randomUUID())
                .name("Malaysia Rugby")
                .slug("malaysia-rugby")
                .orgLevel(OrganisationLevel.COUNTRY)
                .status("Active")
                .deleted(false)
                .build();

        Organisation state = Organisation.builder()
                .id(UUID.randomUUID())
                .name("Selangor Rugby")
                .slug("selangor-rugby")
                .orgLevel(OrganisationLevel.STATE)
                .parentOrg(union)
                .status("Active")
                .deleted(false)
                .primaryColor("#003366")
                .addressLine1("Private Street 99")
                .city("Shah Alam")
                .postcode("40000")
                .build();

        when(organisationRepository.findBySlugWithParentOrg("selangor-rugby")).thenReturn(Optional.of(state));
        when(organisationRepository.findAllActiveNonDeletedWithParentOrg()).thenReturn(List.of(union, state));
        when(teamRepository.findAllActiveWithOrganisation()).thenReturn(List.of());
        when(tournamentRepository.findPublishedByOrganiserOrgId(state.getId())).thenReturn(List.of());

        mockMvc.perform(get("/api/public/organisations/selangor-rugby"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", PublicHttpCache.CACHE_CONTROL_5MIN))
                .andExpect(jsonPath("$.name", is("Selangor Rugby")))
                .andExpect(jsonPath("$.slug", is("selangor-rugby")))
                .andExpect(jsonPath("$.parentChain", hasSize(1)))
                .andExpect(jsonPath("$.parentChain[0].name", is("Malaysia Rugby")))
                .andExpect(jsonPath("$.primaryColor", is("#003366")))
                // Privacy checks
                .andExpect(jsonPath("$.addressLine1").doesNotExist())
                .andExpect(jsonPath("$.city").doesNotExist())
                .andExpect(jsonPath("$.postcode").doesNotExist());
    }

    @Test
    @DisplayName("GET /api/public/organisations/{id} allows slug-less organisation lookup by UUID")
    void getDetail_byId_slugless_success() throws Exception {
        UUID id = UUID.randomUUID();
        Organisation slugless = Organisation.builder()
                .id(id)
                .name("Independent Rugby Club")
                .slug(null)
                .orgLevel(OrganisationLevel.CLUB)
                .status("Active")
                .deleted(false)
                .build();

        when(organisationRepository.findByIdWithParentOrg(id)).thenReturn(Optional.of(slugless));
        when(organisationRepository.findAllActiveNonDeletedWithParentOrg()).thenReturn(List.of(slugless));
        when(teamRepository.findAllActiveWithOrganisation()).thenReturn(List.of());
        when(tournamentRepository.findPublishedByOrganiserOrgId(id)).thenReturn(List.of());

        mockMvc.perform(get("/api/public/organisations/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(id.toString())))
                .andExpect(jsonPath("$.slug").value(nullValue()))
                .andExpect(jsonPath("$.name", is("Independent Rugby Club")));
    }

    @Test
    @DisplayName("GET /api/public/organisations/{idOrSlug} returns 404 if organisation is inactive or deleted")
    void getDetail_inactiveOrDeleted_returns404() throws Exception {
        Organisation inactive = Organisation.builder()
                .id(UUID.randomUUID())
                .name("Inactive Org")
                .slug("inactive-org")
                .status("Inactive")
                .deleted(false)
                .build();

        Organisation deleted = Organisation.builder()
                .id(UUID.randomUUID())
                .name("Deleted Org")
                .slug("deleted-org")
                .status("Active")
                .deleted(true)
                .build();

        when(organisationRepository.findBySlugWithParentOrg("inactive-org")).thenReturn(Optional.of(inactive));
        when(organisationRepository.findBySlugWithParentOrg("deleted-org")).thenReturn(Optional.of(deleted));
        when(organisationRepository.findBySlugWithParentOrg("missing-org")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/public/organisations/inactive-org")).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/public/organisations/deleted-org")).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/public/organisations/missing-org")).andExpect(status().isNotFound());
    }
}
