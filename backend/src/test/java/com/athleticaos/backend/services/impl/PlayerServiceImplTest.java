package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.player.PlayerResponse;
import com.athleticaos.backend.dtos.player.PlayerUpdateRequest;
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.repositories.PersonRepository;
import com.athleticaos.backend.repositories.PlayerRepository;
import com.athleticaos.backend.repositories.PlayerTeamRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class PlayerServiceImplTest {

    @Mock
    private PlayerRepository playerRepository;

    @Mock
    private PersonRepository personRepository;

    @Mock
    private PlayerTeamRepository playerTeamRepository;

    @Mock
    private com.athleticaos.backend.repositories.TeamRepository teamRepository;

    @Mock
    private com.athleticaos.backend.services.PlayerBatchHelper playerBatchHelper;

    @Mock
    private jakarta.validation.Validator validator;

    @InjectMocks
    private PlayerServiceImpl playerService;

    private UUID playerId;
    private UUID personId;
    private Player existingPlayer;
    private Person existingPerson;

    @BeforeEach
    void setUp() {
        playerId = UUID.randomUUID();
        personId = UUID.randomUUID();

        existingPerson = Person.builder()
                .id(personId)
                .firstName("John")
                .lastName("Doe")
                .gender("MALE")
                .dob(LocalDate.of(1995, 5, 20))
                .icOrPassport("950520145551")
                .identificationType("MALAYSIAN_IC")
                .email("john.doe@example.com")
                .build();

        existingPlayer = Player.builder()
                .id(playerId)
                .person(existingPerson)
                .status("ACTIVE")
                .build();
    }

    @Test
    void getPlayerById_returnsIdentificationPresentWithoutRawValue() {
        when(playerRepository.findById(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerTeamRepository.findByPlayerIdAndIsActiveTrue(playerId)).thenReturn(Collections.emptyList());

        PlayerResponse response = playerService.getPlayerById(playerId);

        assertThat(response).isNotNull();
        assertThat(response.identificationPresent()).isTrue();
        assertThat(response.identificationDisplay()).isEqualTo("PRESENT");
        assertThat(response.identificationType()).isEqualTo("MALAYSIAN_IC");
    }

    @Test
    void updatePlayer_nullIcOrPassport_preservesExistingIdentification() {
        when(playerRepository.findByIdWithPerson(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerRepository.findPersonByPlayerId(playerId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.save(any(Person.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(playerRepository.save(any(Player.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(playerTeamRepository.findByPlayerIdAndIsActiveTrue(playerId)).thenReturn(Collections.emptyList());

        PlayerUpdateRequest request = new PlayerUpdateRequest(
                "Jonathan", null, null, null,
                null, // icOrPassport is null -> leave unchanged
                null, null, null, null,
                null, null, null, null, null, null, null,
                null, null, null, null, null, null
        );

        PlayerResponse response = playerService.updatePlayer(playerId, request);

        assertThat(response.firstName()).isEqualTo("Jonathan");
        assertThat(existingPerson.getIcOrPassport()).isEqualTo("950520145551");
        assertThat(response.identificationPresent()).isTrue();
        assertThat(response.identificationDisplay()).isEqualTo("PRESENT");
        verify(personRepository).save(existingPerson);
    }

    @Test
    void updatePlayer_withValidNewIc_updatesIdentification() {
        when(playerRepository.findByIdWithPerson(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerRepository.findPersonByPlayerId(playerId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.existsByIcOrPassportAndIdNot("950520145553", personId)).thenReturn(false);
        when(personRepository.save(any(Person.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(playerRepository.save(any(Player.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(playerTeamRepository.findByPlayerIdAndIsActiveTrue(playerId)).thenReturn(Collections.emptyList());

        PlayerUpdateRequest request = new PlayerUpdateRequest(
                null, null, null, null,
                "950520-14-5553", // valid Malaysian IC matching 1995-05-20 and MALE
                "MALAYSIAN_IC", null, null, null,
                null, null, null, null, null, null, null,
                null, null, null, null, null, null
        );

        PlayerResponse response = playerService.updatePlayer(playerId, request);

        assertThat(existingPerson.getIcOrPassport()).isEqualTo("950520145553");
        assertThat(response.identificationPresent()).isTrue();
        assertThat(response.identificationDisplay()).isEqualTo("PRESENT");
    }

    @Test
    void updatePlayer_withInvalidMalaysianIc_throwsException() {
        when(playerRepository.findByIdWithPerson(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerRepository.findPersonByPlayerId(playerId)).thenReturn(Optional.of(existingPerson));

        PlayerUpdateRequest request = new PlayerUpdateRequest(
                null, null, null, null,
                "900101145551", // DOB in IC (900101) does not match existing person DOB (950520)
                "MALAYSIAN_IC", null, null, null,
                null, null, null, null, null, null, null,
                null, null, null, null, null, null
        );

        assertThatThrownBy(() -> playerService.updatePlayer(playerId, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Malaysian IC date prefix");
    }

    @Test
    void getPlayerById_whenIcIsBlank_returnsIdentificationNotPresent() {
        existingPerson.setIcOrPassport(null);
        when(playerRepository.findById(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerTeamRepository.findByPlayerIdAndIsActiveTrue(playerId)).thenReturn(Collections.emptyList());

        PlayerResponse response = playerService.getPlayerById(playerId);

        assertThat(response.identificationPresent()).isFalse();
        assertThat(response.identificationDisplay()).isNull();
    }

    @Test
    void updatePlayer_withTypeOnly_doesNotMutateType() {
        when(playerRepository.findByIdWithPerson(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerRepository.findPersonByPlayerId(playerId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.save(any(Person.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(playerRepository.save(any(Player.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(playerTeamRepository.findByPlayerIdAndIsActiveTrue(playerId)).thenReturn(Collections.emptyList());

        // Attempting to change type to PASSPORT without providing icOrPassport
        PlayerUpdateRequest request = new PlayerUpdateRequest(
                null, null, null, null,
                null, // icOrPassport is null
                "PASSPORT", // type provided without ID
                null, null, null,
                null, null, null, null, null, null, null,
                null, null, null, null, null, null
        );

        playerService.updatePlayer(playerId, request);

        // Type must remain unchanged (MALAYSIAN_IC)
        assertThat(existingPerson.getIdentificationType()).isEqualTo("MALAYSIAN_IC");
    }

    @Test
    void updatePlayer_withNewIc_missingIdentificationType_throwsException() {
        when(playerRepository.findByIdWithPerson(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerRepository.findPersonByPlayerId(playerId)).thenReturn(Optional.of(existingPerson));

        PlayerUpdateRequest request = new PlayerUpdateRequest(
                null, null, null, null,
                "950520-14-5553",
                null, // missing identificationType
                null, null, null,
                null, null, null, null, null, null, null,
                null, null, null, null, null, null
        );

        assertThatThrownBy(() -> playerService.updatePlayer(playerId, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("identificationType is required");
    }

    @Test
    void createBatchPlayers_invalidDobMismatch_returnsErrorAndDoesNotPersist() {
        UUID teamId = UUID.randomUUID();
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(new com.athleticaos.backend.entities.Team()));

        com.athleticaos.backend.dtos.player.PlayerRowDTO row = new com.athleticaos.backend.dtos.player.PlayerRowDTO(
                "Test", "Player", "MALE", LocalDate.of(1995, 5, 20),
                "MALAYSIAN_IC", "900101145551", "Malaysian", null, null, null
        );

        when(validator.validate(any())).thenReturn(Collections.emptySet());

        com.athleticaos.backend.dtos.player.PlayerBatchResponse response =
                playerService.createBatchPlayers(teamId, java.util.List.of(row));

        assertThat(response.failCount()).isEqualTo(1);
        assertThat(response.successCount()).isEqualTo(0);
        assertThat(response.results().get(0).errors()).anyMatch(e -> e.contains("Malaysian IC date prefix"));
        verify(playerBatchHelper, org.mockito.Mockito.never()).savePlayerInNewTransaction(any(), any());
    }
}
