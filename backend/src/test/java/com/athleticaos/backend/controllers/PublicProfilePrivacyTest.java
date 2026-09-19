package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.player.PlayerResponse;
import com.athleticaos.backend.dtos.public_api.PublicPlayerDetailResponse;
import com.athleticaos.backend.dtos.public_api.PublicPlayerListItemResponse;
import com.athleticaos.backend.dtos.public_api.PublicPlayerSummary;
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.repositories.*;
import com.athleticaos.backend.services.PlayerService;
import com.athleticaos.backend.services.PlayerTeamService;
import com.athleticaos.backend.services.StatisticsService;
import com.athleticaos.backend.services.TeamService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PublicProfilePrivacyTest {

    @Mock
    private TeamService teamService;
    @Mock
    private PlayerService playerService;
    @Mock
    private PlayerTeamRepository playerTeamRepository;
    @Mock
    private MatchLineupRepository matchLineupRepository;
    @Mock
    private StatisticsService statisticsService;
    @Mock
    private TournamentTeamRepository tournamentTeamRepository;
    @Mock
    private PlayerTeamService playerTeamService;
    @Mock
    private TournamentPlayerRepository tournamentPlayerRepository;
    @Mock
    private TeamRepository teamRepository;
    @Mock
    private PlayerRepository playerRepository;

    private PublicProfileController controller;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        controller = new PublicProfileController(
                teamService,
                playerService,
                playerTeamRepository,
                matchLineupRepository,
                statisticsService,
                tournamentTeamRepository,
                playerTeamService,
                tournamentPlayerRepository,
                teamRepository,
                playerRepository
        );
    }

    @Test
    @DisplayName("Public DTOs must not declare dateOfBirth or dob fields")
    void publicDtosDoNotContainDateOfBirthFields() {
        List<Class<?>> publicDtos = List.of(
                PublicPlayerListItemResponse.class,
                PublicPlayerDetailResponse.class,
                PublicPlayerSummary.class
        );

        for (Class<?> dtoClass : publicDtos) {
            List<String> fieldNames = Arrays.stream(dtoClass.getDeclaredFields())
                    .map(field -> field.getName())
                    .toList();
            assertThat(fieldNames)
                    .as("DTO %s should not declare dateOfBirth or dob", dtoClass.getSimpleName())
                    .doesNotContain("dateOfBirth", "dob")
                    .as("DTO %s should not declare registrationNo or registration_no", dtoClass.getSimpleName())
                    .doesNotContain("registrationNo", "registration_no")
                    .as("DTO %s should not declare identification fields", dtoClass.getSimpleName())
                    .doesNotContain("idType", "idNumber", "identificationType", "icOrPassport");
        }

        // PublicPlayerListItemResponse must also not declare city or age
        List<String> listItemFields = Arrays.stream(PublicPlayerListItemResponse.class.getDeclaredFields())
                .map(field -> field.getName())
                .toList();
        assertThat(listItemFields)
                .as("PublicPlayerListItemResponse should not declare city or age")
                .doesNotContain("city", "age");

        // PublicPlayerDetailResponse must declare age and not declare unused emergency/blood fields
        List<String> detailFields = Arrays.stream(PublicPlayerDetailResponse.class.getDeclaredFields())
                .map(field -> field.getName())
                .toList();
        assertThat(detailFields)
                .as("PublicPlayerDetailResponse should declare age")
                .contains("age")
                .as("PublicPlayerDetailResponse should not declare unused blood or emergency contact fields")
                .doesNotContain("bloodGroup", "emergencyContactName", "emergencyContactNumber", "emergencyContactRelationship");
    }

    @Test
    @DisplayName("Public player list endpoint contains no dateOfBirth, dob, age, or city")
    void publicPlayerListExposesNoDateOfBirthOrCityOrAge() throws Exception {
        UUID playerId = UUID.randomUUID();
        LocalDate fabricatedDob = LocalDate.of(1998, 5, 21);

        Person person = Person.builder()
                .registrationNo("AOS-000123")
                .firstName("Test")
                .lastName("Player")
                .dob(fabricatedDob)
                .gender("M")
                .state("Selangor")
                .city("Petaling Jaya")
                .build();

        Player player = Player.builder()
                .id(playerId)
                .person(person)
                .slug("test-player")
                .deleted(false)
                .build();

        when(playerRepository.findAllWithPersonByDeletedFalseOrderByCreatedAtDesc())
                .thenReturn(List.of(player));
        when(playerTeamRepository.findByPlayerIdInAndIsActiveTrue(anyList()))
                .thenReturn(List.of());
        when(tournamentPlayerRepository.countActiveTournamentsGroupedByPlayerIds(anyList()))
                .thenReturn(List.of());

        ResponseEntity<List<PublicPlayerListItemResponse>> response = controller.getPublicPlayers(
                null, null, null, null, null, null
        );

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        List<PublicPlayerListItemResponse> body = Objects.requireNonNull(response.getBody());
        assertThat(body).hasSize(1);

        PublicPlayerListItemResponse item = body.get(0);
        assertThat(item.getState()).isEqualTo("Selangor");
        assertThat(item.getGender()).isEqualTo("M");

        String json = objectMapper.writeValueAsString(body);
        assertThat(json)
                .doesNotContain("dateOfBirth")
                .doesNotContain("dob")
                .doesNotContain("city")
                .doesNotContain("Petaling Jaya")
                .doesNotContain("age")
                .doesNotContain("1998-05-21")
                .doesNotContain("registrationNo")
                .doesNotContain("AOS-");
    }

    @Test
    @DisplayName("Public player detail endpoint computes age correctly from date of birth and does not leak dateOfBirth")
    void publicPlayerDetailComputesAgeFromDob() throws Exception {
        UUID playerId = UUID.randomUUID();
        LocalDate fabricatedDob = LocalDate.now().minusYears(22).minusMonths(1);

        PlayerResponse playerResponse = PlayerResponse.builder()
                .id(playerId)
                .registrationNo("AOS-000456")
                .firstName("Fabricated")
                .lastName("Athlete")
                .dob(fabricatedDob)
                .gender("M")
                .country("Malaysia")
                .state("Kuala Lumpur")
                .city("Cheras")
                .build();

        when(playerService.getPlayerById(playerId)).thenReturn(playerResponse);
        when(playerTeamRepository.findByPlayerIdAndIsActiveTrue(playerId)).thenReturn(List.of());
        when(tournamentPlayerRepository.findActiveTournamentsByPlayerId(playerId)).thenReturn(List.of());
        when(matchLineupRepository.findByPlayerId(playerId)).thenReturn(List.of());

        ResponseEntity<PublicPlayerDetailResponse> response = controller.getPublicPlayer(playerId.toString(), null);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        PublicPlayerDetailResponse detail = Objects.requireNonNull(response.getBody());

        assertThat(detail.getAge()).isEqualTo(22);
        assertThat(detail.getGender()).isEqualTo("M");
        assertThat(detail.getCity()).isEqualTo("Cheras");

        String json = objectMapper.writeValueAsString(detail);
        assertThat(json)
                .doesNotContain("dateOfBirth")
                .doesNotContain("dob")
                .doesNotContain(fabricatedDob.toString())
                .doesNotContain("registrationNo")
                .doesNotContain("AOS-")
                .doesNotContain("bloodGroup")
                .doesNotContain("emergencyContactName")
                .doesNotContain("emergencyContactNumber")
                .doesNotContain("emergencyContactRelationship")
                .contains("\"age\":22");
    }

    @Test
    @DisplayName("Public player detail returns null age when date of birth is null")
    void publicPlayerDetailReturnsNullAgeWhenDobNull() throws Exception {
        UUID playerId = UUID.randomUUID();

        PlayerResponse playerResponse = PlayerResponse.builder()
                .id(playerId)
                .firstName("Unknown")
                .lastName("DobPlayer")
                .dob(null)
                .gender("F")
                .state("Penang")
                .city("George Town")
                .build();

        when(playerService.getPlayerById(playerId)).thenReturn(playerResponse);
        when(playerTeamRepository.findByPlayerIdAndIsActiveTrue(playerId)).thenReturn(List.of());
        when(tournamentPlayerRepository.findActiveTournamentsByPlayerId(playerId)).thenReturn(List.of());
        when(matchLineupRepository.findByPlayerId(playerId)).thenReturn(List.of());

        ResponseEntity<PublicPlayerDetailResponse> response = controller.getPublicPlayer(playerId.toString(), null);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        PublicPlayerDetailResponse detail = Objects.requireNonNull(response.getBody());

        assertThat(detail.getAge()).isNull();

        String json = objectMapper.writeValueAsString(detail);
        assertThat(json)
                .doesNotContain("dateOfBirth")
                .doesNotContain("dob");
    }

    @Test
    @DisplayName("Public player detail returns 404 when player is not found by ID or slug")
    void publicPlayerDetailReturns404WhenNotFound() {
        UUID unknownId = UUID.randomUUID();
        when(playerService.getPlayerById(unknownId)).thenThrow(new jakarta.persistence.EntityNotFoundException("Player not found"));
        when(playerService.getPlayerBySlug("unknown-slug")).thenThrow(new jakarta.persistence.EntityNotFoundException("Player not found"));

        ResponseEntity<PublicPlayerDetailResponse> idResponse = controller.getPublicPlayer(unknownId.toString(), null);
        assertThat(idResponse.getStatusCode().value()).isEqualTo(404);

        ResponseEntity<PublicPlayerDetailResponse> slugResponse = controller.getPublicPlayer("unknown-slug", null);
        assertThat(slugResponse.getStatusCode().value()).isEqualTo(404);
    }

    @Test
    @DisplayName("Public player stats returns 404 when player is not found by ID or slug")
    void publicPlayerStatsReturns404WhenNotFound() {
        UUID unknownId = UUID.randomUUID();
        when(playerService.getPlayerById(unknownId)).thenThrow(new jakarta.persistence.EntityNotFoundException("Player not found"));
        when(playerService.getPlayerBySlug("unknown-slug")).thenThrow(new jakarta.persistence.EntityNotFoundException("Player not found"));

        var idResponse = controller.getPublicPlayerStats(unknownId.toString(), null);
        assertThat(idResponse.getStatusCode().value()).isEqualTo(404);

        var slugResponse = controller.getPublicPlayerStats("unknown-slug", null);
        assertThat(slugResponse.getStatusCode().value()).isEqualTo(404);
    }
}
