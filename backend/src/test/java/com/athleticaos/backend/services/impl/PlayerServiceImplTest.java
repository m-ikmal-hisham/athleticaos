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

    @Mock
    private com.athleticaos.backend.services.IdentificationHashService identificationHashService;

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

    @Test
    void updatePlayer_maskedValue_throwsAndNeverSaves() {
        when(playerRepository.findByIdWithPerson(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerRepository.findPersonByPlayerId(playerId)).thenReturn(Optional.of(existingPerson));

        PlayerUpdateRequest request = new PlayerUpdateRequest(
                null, null, null, null,
                "******9001", // masked value
                "PASSPORT", null, null, null,
                null, null, null, null, null, null, null,
                null, null, null, null, null, null
        );

        assertThatThrownBy(() -> playerService.updatePlayer(playerId, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("masked");

        verify(personRepository, org.mockito.Mockito.never()).save(any(Person.class));
    }

    @Test
    void createBatchPlayers_maskedRowAndValidRow() {
        UUID teamId = UUID.randomUUID();
        com.athleticaos.backend.entities.Team team = new com.athleticaos.backend.entities.Team();
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));

        // Row 0: masked → should fail
        com.athleticaos.backend.dtos.player.PlayerRowDTO maskedRow = new com.athleticaos.backend.dtos.player.PlayerRowDTO(
                "Bad", "Player", "MALE", LocalDate.of(1995, 5, 20),
                "PASSPORT", "XXXX-XXXX-9002", "Malaysian", null, null, null
        );

        // Row 1: valid passport → should succeed
        com.athleticaos.backend.dtos.player.PlayerRowDTO validRow = new com.athleticaos.backend.dtos.player.PlayerRowDTO(
                "Good", "Player", "MALE", LocalDate.of(1995, 5, 20),
                "PASSPORT", "A12345678", "Malaysian", null, null, null
        );

        when(validator.validate(any())).thenReturn(Collections.emptySet());
        when(personRepository.existsByIcOrPassport("A12345678")).thenReturn(false);
        when(identificationHashService.isConfigured()).thenReturn(false);
        UUID newPlayerId = UUID.randomUUID();
        when(playerBatchHelper.savePlayerInNewTransaction(validRow, team)).thenReturn(newPlayerId);

        com.athleticaos.backend.dtos.player.PlayerBatchResponse response =
                playerService.createBatchPlayers(teamId, java.util.List.of(maskedRow, validRow));

        assertThat(response.failCount()).isEqualTo(1);
        assertThat(response.successCount()).isEqualTo(1);
        assertThat(response.results().get(0).errors()).anyMatch(e -> e.contains("masked"));
        assertThat(response.results().get(1).status()).isEqualTo("SUCCESS");
    }

    // -----------------------------------------------------------------------
    // OBS-05B: DOB / gender reentry guard
    // -----------------------------------------------------------------------

    @Test
    void updatePlayer_icHolder_dobChanged_noIc_throwsReentryRequired() {
        when(playerRepository.findByIdWithPerson(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerRepository.findPersonByPlayerId(playerId)).thenReturn(Optional.of(existingPerson));

        // Change DOB from 1995-05-20 to 1991-06-06, but supply no IC
        PlayerUpdateRequest request = new PlayerUpdateRequest(
                null, null, null, LocalDate.of(1991, 6, 6),
                null, null, null, null, null,
                null, null, null, null, null, null, null,
                null, null, null, null, null, null
        );

        assertThatThrownBy(() -> playerService.updatePlayer(playerId, request))
                .isInstanceOf(com.athleticaos.backend.exceptions.IdentificationReentryRequiredException.class);

        verify(personRepository, org.mockito.Mockito.never()).save(any(Person.class));
        // Entity fields must be unchanged
        assertThat(existingPerson.getDob()).isEqualTo(LocalDate.of(1995, 5, 20));
        assertThat(existingPerson.getGender()).isEqualTo("MALE");
        assertThat(existingPerson.getIcOrPassport()).isEqualTo("950520145551");
    }

    @Test
    void updatePlayer_icHolder_genderChanged_noIc_throwsReentryRequired() {
        when(playerRepository.findByIdWithPerson(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerRepository.findPersonByPlayerId(playerId)).thenReturn(Optional.of(existingPerson));

        // Change gender from MALE to FEMALE, but supply no IC
        PlayerUpdateRequest request = new PlayerUpdateRequest(
                null, null, "FEMALE", null,
                null, null, null, null, null,
                null, null, null, null, null, null, null,
                null, null, null, null, null, null
        );

        assertThatThrownBy(() -> playerService.updatePlayer(playerId, request))
                .isInstanceOf(com.athleticaos.backend.exceptions.IdentificationReentryRequiredException.class);

        verify(personRepository, org.mockito.Mockito.never()).save(any(Person.class));
        assertThat(existingPerson.getGender()).isEqualTo("MALE");
    }

    @Test
    void updatePlayer_icHolder_unchangedDobGender_changePhone_succeeds() {
        when(playerRepository.findByIdWithPerson(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerRepository.findPersonByPlayerId(playerId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));
        when(playerRepository.save(any(Player.class))).thenAnswer(i -> i.getArgument(0));
        when(playerTeamRepository.findByPlayerIdAndIsActiveTrue(playerId)).thenReturn(Collections.emptyList());

        // Re-send the same DOB and gender (as all edit forms do), but change phone
        PlayerUpdateRequest request = new PlayerUpdateRequest(
                null, null, "MALE", LocalDate.of(1995, 5, 20),
                null, null, null, null, "0123456789",
                null, null, null, null, null, null, null,
                null, null, null, null, null, null
        );

        playerService.updatePlayer(playerId, request);

        assertThat(existingPerson.getPhone()).isEqualTo("0123456789");
        assertThat(existingPerson.getIcOrPassport()).isEqualTo("950520145551");
        assertThat(existingPerson.getIdentificationType()).isEqualTo("MALAYSIAN_IC");
        verify(personRepository).save(existingPerson);
    }

    @Test
    void updatePlayer_icHolder_dobChanged_validReenteredIc_succeeds() {
        when(playerRepository.findByIdWithPerson(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerRepository.findPersonByPlayerId(playerId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.existsByIcOrPassportAndIdNot("910606145551", personId)).thenReturn(false);
        when(identificationHashService.isConfigured()).thenReturn(true);
        when(identificationHashService.computeHash("910606145551")).thenReturn("hashNew910606");
        when(identificationHashService.getActiveVersion()).thenReturn(1);
        when(personRepository.existsByIdentificationHashAndIdNot("hashNew910606", personId)).thenReturn(false);
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));
        when(playerRepository.save(any(Player.class))).thenAnswer(i -> i.getArgument(0));
        when(playerTeamRepository.findByPlayerIdAndIsActiveTrue(playerId)).thenReturn(Collections.emptyList());

        // DOB changed from 1995-05-20 to 1991-06-06, re-entered IC matching new DOB, MALE (odd last digit)
        PlayerUpdateRequest request = new PlayerUpdateRequest(
                null, null, "MALE", LocalDate.of(1991, 6, 6),
                "910606-14-5551", "MALAYSIAN_IC", null, null, null,
                null, null, null, null, null, null, null,
                null, null, null, null, null, null
        );

        playerService.updatePlayer(playerId, request);

        assertThat(existingPerson.getIcOrPassport()).isEqualTo("910606145551");
        assertThat(existingPerson.getIdentificationHash()).isEqualTo("hashNew910606");
        assertThat(existingPerson.getIdentificationVerificationStatus()).isEqualTo("UNVERIFIED");
        verify(personRepository).save(existingPerson);
    }

    @Test
    void updatePlayer_icHolder_dobChanged_reenteredIcMatchesOldDob_throwsIllegalArgument() {
        when(playerRepository.findByIdWithPerson(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerRepository.findPersonByPlayerId(playerId)).thenReturn(Optional.of(existingPerson));

        // DOB changed from 1995-05-20 to 1991-06-06, but IC prefix matches old DOB (950520)
        PlayerUpdateRequest request = new PlayerUpdateRequest(
                null, null, "MALE", LocalDate.of(1991, 6, 6),
                "950520-14-5551", "MALAYSIAN_IC", null, null, null,
                null, null, null, null, null, null, null,
                null, null, null, null, null, null
        );

        assertThatThrownBy(() -> playerService.updatePlayer(playerId, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Malaysian IC date prefix");

        verify(personRepository, org.mockito.Mockito.never()).save(any(Person.class));
    }

    @Test
    void updatePlayer_passportHolder_dobAndGenderChanged_noIc_succeeds() {
        existingPerson.setIdentificationType("PASSPORT");
        existingPerson.setIcOrPassport("A12345678");

        when(playerRepository.findByIdWithPerson(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerRepository.findPersonByPlayerId(playerId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));
        when(playerRepository.save(any(Player.class))).thenAnswer(i -> i.getArgument(0));
        when(playerTeamRepository.findByPlayerIdAndIsActiveTrue(playerId)).thenReturn(Collections.emptyList());

        // Change both DOB and gender without supplying IC — allowed for PASSPORT holders
        PlayerUpdateRequest request = new PlayerUpdateRequest(
                null, null, "FEMALE", LocalDate.of(2000, 1, 1),
                null, null, null, null, null,
                null, null, null, null, null, null, null,
                null, null, null, null, null, null
        );

        playerService.updatePlayer(playerId, request);

        assertThat(existingPerson.getDob()).isEqualTo(LocalDate.of(2000, 1, 1));
        assertThat(existingPerson.getGender()).isEqualTo("FEMALE");
        assertThat(existingPerson.getIcOrPassport()).isEqualTo("A12345678");
        verify(personRepository).save(existingPerson);
    }

    @Test
    void updatePlayer_reentryException_messageContainsNoDigits() {
        when(playerRepository.findByIdWithPerson(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerRepository.findPersonByPlayerId(playerId)).thenReturn(Optional.of(existingPerson));

        PlayerUpdateRequest request = new PlayerUpdateRequest(
                null, null, "FEMALE", null,
                null, null, null, null, null,
                null, null, null, null, null, null, null,
                null, null, null, null, null, null
        );

        assertThatThrownBy(() -> playerService.updatePlayer(playerId, request))
                .isInstanceOf(com.athleticaos.backend.exceptions.IdentificationReentryRequiredException.class)
                .satisfies(ex -> assertThat(ex.getMessage()).doesNotMatch(".*\\d.*"));
    }

    @Test
    void updatePlayer_nullStoredType_dobChanged_noIdentity_throwsReentryRequired() {
        existingPerson.setIdentificationType(null);
        when(playerRepository.findByIdWithPerson(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerRepository.findPersonByPlayerId(playerId)).thenReturn(Optional.of(existingPerson));

        PlayerUpdateRequest request = new PlayerUpdateRequest(
                null, null, null, LocalDate.of(1991, 6, 6),
                null, null, null, null, null,
                null, null, null, null, null, null, null,
                null, null, null, null, null, null
        );

        assertThatThrownBy(() -> playerService.updatePlayer(playerId, request))
                .isInstanceOf(com.athleticaos.backend.exceptions.IdentificationReentryRequiredException.class);

        verify(personRepository, org.mockito.Mockito.never()).save(any(Person.class));
        assertThat(existingPerson.getDob()).isEqualTo(LocalDate.of(1995, 5, 20));
    }

    @Test
    void updatePlayer_nonCanonicalStoredType_genderChanged_reenteredIc_succeedsWithCanonicalType() {
        existingPerson.setIdentificationType("IC");
        when(playerRepository.findByIdWithPerson(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerRepository.findPersonByPlayerId(playerId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.existsByIcOrPassportAndIdNot("950520145552", personId)).thenReturn(false);
        when(identificationHashService.isConfigured()).thenReturn(true);
        when(identificationHashService.computeHash("950520145552")).thenReturn("hashFemale950520");
        when(identificationHashService.getActiveVersion()).thenReturn(1);
        when(personRepository.existsByIdentificationHashAndIdNot("hashFemale950520", personId)).thenReturn(false);
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));
        when(playerRepository.save(any(Player.class))).thenAnswer(i -> i.getArgument(0));
        when(playerTeamRepository.findByPlayerIdAndIsActiveTrue(playerId)).thenReturn(Collections.emptyList());

        // Gender changed to FEMALE, re-entered consistent IC (even last digit) with canonical type MALAYSIAN_IC
        PlayerUpdateRequest request = new PlayerUpdateRequest(
                null, null, "FEMALE", null,
                "950520-14-5552", "MALAYSIAN_IC", null, null, null,
                null, null, null, null, null, null, null,
                null, null, null, null, null, null
        );

        playerService.updatePlayer(playerId, request);

        assertThat(existingPerson.getGender()).isEqualTo("FEMALE");
        assertThat(existingPerson.getIdentificationType()).isEqualTo("MALAYSIAN_IC");
        assertThat(existingPerson.getIcOrPassport()).isEqualTo("950520145552");
        verify(personRepository).save(existingPerson);
    }

    @Test
    void updatePlayer_nullStoredType_dobChanged_reenteredPassport_succeedsWithPassportType() {
        existingPerson.setIdentificationType(null);
        when(playerRepository.findByIdWithPerson(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerRepository.findPersonByPlayerId(playerId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.existsByIcOrPassportAndIdNot("A98765432", personId)).thenReturn(false);
        when(identificationHashService.isConfigured()).thenReturn(true);
        when(identificationHashService.computeHash("A98765432")).thenReturn("hashPassport");
        when(identificationHashService.getActiveVersion()).thenReturn(1);
        when(personRepository.existsByIdentificationHashAndIdNot("hashPassport", personId)).thenReturn(false);
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));
        when(playerRepository.save(any(Player.class))).thenAnswer(i -> i.getArgument(0));
        when(playerTeamRepository.findByPlayerIdAndIsActiveTrue(playerId)).thenReturn(Collections.emptyList());

        PlayerUpdateRequest request = new PlayerUpdateRequest(
                null, null, null, LocalDate.of(1992, 2, 2),
                "A98765432", "PASSPORT", null, null, null,
                null, null, null, null, null, null, null,
                null, null, null, null, null, null
        );

        playerService.updatePlayer(playerId, request);

        assertThat(existingPerson.getDob()).isEqualTo(LocalDate.of(1992, 2, 2));
        assertThat(existingPerson.getIdentificationType()).isEqualTo("PASSPORT");
        assertThat(existingPerson.getIcOrPassport()).isEqualTo("A98765432");
        verify(personRepository).save(existingPerson);
    }

    @Test
    void updatePlayer_invalidGenderOther_throwsIllegalArgument() {
        when(playerRepository.findByIdWithPerson(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerRepository.findPersonByPlayerId(playerId)).thenReturn(Optional.of(existingPerson));

        PlayerUpdateRequest request = new PlayerUpdateRequest(
                null, null, "OTHER", null,
                null, null, null, null, null,
                null, null, null, null, null, null, null,
                null, null, null, null, null, null
        );

        assertThatThrownBy(() -> playerService.updatePlayer(playerId, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Gender must be MALE or FEMALE.");

        verify(personRepository, org.mockito.Mockito.never()).save(any(Person.class));
        assertThat(existingPerson.getGender()).isEqualTo("MALE");
    }
}
