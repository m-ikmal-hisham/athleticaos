package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.player.PlayerCreateRequest;
import com.athleticaos.backend.dtos.player.PlayerResponse;
import com.athleticaos.backend.dtos.player.PlayerUpdateRequest;
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.repositories.PersonRepository;
import com.athleticaos.backend.repositories.PlayerRepository;
import com.athleticaos.backend.repositories.PlayerTeamRepository;
import com.athleticaos.backend.exceptions.DuplicateEmailException;
import com.athleticaos.backend.exceptions.EmailRequiredException;
import com.athleticaos.backend.exceptions.PossibleDuplicatePersonException;
import com.athleticaos.backend.dtos.person.PossibleDuplicateCheck;
import com.athleticaos.backend.dtos.person.PossibleDuplicateMatch;
import com.athleticaos.backend.services.PersonDuplicateService;
import com.athleticaos.backend.repositories.OrganisationPersonRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
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
    private com.athleticaos.backend.audit.AuditLogger auditLogger;
    @Mock
    private ObjectProvider<HttpServletRequest> requestProvider;
    @Mock
    private PersonDuplicateService personDuplicateService;
    @Mock
    private OrganisationPersonRepository organisationPersonRepository;
    @Mock
    private com.athleticaos.backend.services.UserService userService;

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
                .recordVerificationStatus("UNVERIFIED")
                .email("john.doe@example.com")
                .build();

        existingPlayer = Player.builder()
                .id(playerId)
                .person(existingPerson)
                .status("ACTIVE")
                .build();

        org.mockito.Mockito.lenient().when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(null);
    }

    @Test
    void getPlayerById_returnsRecordVerificationSummary() {
        when(playerRepository.findById(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerTeamRepository.findByPlayerIdAndIsActiveTrue(playerId)).thenReturn(Collections.emptyList());

        PlayerResponse response = playerService.getPlayerById(playerId);

        assertThat(response).isNotNull();
        assertThat(response.recordVerification()).isNotNull();
        assertThat(response.recordVerification().status()).isEqualTo("UNVERIFIED");
    }

    @Test
    void updatePlayer_invalidGenderOther_throwsIllegalArgument() {
        when(playerRepository.findByIdWithPerson(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerRepository.findPersonByPlayerId(playerId)).thenReturn(Optional.of(existingPerson));

        PlayerUpdateRequest request = new PlayerUpdateRequest(
                null, null, "OTHER", null,
                null, null, null, null, null,
                null, null, null, null, null, null, null,
                null, null, null, null
        );

        assertThatThrownBy(() -> playerService.updatePlayer(playerId, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Gender must be MALE or FEMALE.");

        verify(personRepository, org.mockito.Mockito.never()).save(any(Person.class));
        assertThat(existingPerson.getGender()).isEqualTo("MALE");
    }

    @Test
    void updatePlayer_verified_dobChanged_clearsRecordVerificationAndAuditsReset() {
        existingPerson.setRecordVerificationStatus("VERIFIED");
        existingPerson.setRecordVerifiedAt(java.time.LocalDateTime.now());
        existingPerson.setRecordVerifiedBy(UUID.randomUUID());
        existingPerson.setRecordVerifiedByName("Admin User");
        existingPerson.setRecordVerificationMethod("DOCUMENT_SIGHTED");

        when(playerRepository.findByIdWithPerson(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerRepository.findPersonByPlayerId(playerId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));
        when(playerRepository.save(any(Player.class))).thenAnswer(i -> i.getArgument(0));
        when(playerTeamRepository.findByPlayerIdAndIsActiveTrue(playerId)).thenReturn(Collections.emptyList());

        PlayerUpdateRequest request = new PlayerUpdateRequest(
                null, null, null, LocalDate.of(1995, 5, 5),
                null, null, null, null, null,
                null, null, null, null, null, null, null,
                null, null, null, null
        );

        playerService.updatePlayer(playerId, request);

        assertThat(existingPerson.getRecordVerificationStatus()).isEqualTo("UNVERIFIED");
        assertThat(existingPerson.getRecordVerifiedAt()).isNull();
        assertThat(existingPerson.getRecordVerifiedBy()).isNull();
        assertThat(existingPerson.getRecordVerifiedByName()).isNull();
        assertThat(existingPerson.getRecordVerificationMethod()).isNull();
        verify(auditLogger).logRecordVerificationReset(eq(existingPerson), any());
    }

    @Test
    void updatePlayer_verified_firstNameChanged_clearsRecordVerificationAndAuditsReset() {
        existingPerson.setRecordVerificationStatus("VERIFIED");
        existingPerson.setRecordVerifiedAt(java.time.LocalDateTime.now());
        existingPerson.setRecordVerifiedBy(UUID.randomUUID());
        existingPerson.setRecordVerifiedByName("Admin User");
        existingPerson.setRecordVerificationMethod("DOCUMENT_SIGHTED");

        when(playerRepository.findByIdWithPerson(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerRepository.findPersonByPlayerId(playerId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));
        when(playerRepository.save(any(Player.class))).thenAnswer(i -> i.getArgument(0));
        when(playerTeamRepository.findByPlayerIdAndIsActiveTrue(playerId)).thenReturn(Collections.emptyList());

        PlayerUpdateRequest request = new PlayerUpdateRequest(
                "DifferentFirst", null, null, null,
                null, null, null, null, null,
                null, null, null, null, null, null, null,
                null, null, null, null
        );

        playerService.updatePlayer(playerId, request);

        assertThat(existingPerson.getRecordVerificationStatus()).isEqualTo("UNVERIFIED");
        assertThat(existingPerson.getRecordVerifiedAt()).isNull();
        verify(auditLogger).logRecordVerificationReset(eq(existingPerson), any());
    }

    @Test
    void updatePlayer_verified_lastNameChanged_clearsRecordVerificationAndAuditsReset() {
        existingPerson.setRecordVerificationStatus("VERIFIED");
        existingPerson.setRecordVerifiedAt(java.time.LocalDateTime.now());
        existingPerson.setRecordVerifiedBy(UUID.randomUUID());
        existingPerson.setRecordVerifiedByName("Admin User");
        existingPerson.setRecordVerificationMethod("DOCUMENT_SIGHTED");

        when(playerRepository.findByIdWithPerson(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerRepository.findPersonByPlayerId(playerId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));
        when(playerRepository.save(any(Player.class))).thenAnswer(i -> i.getArgument(0));
        when(playerTeamRepository.findByPlayerIdAndIsActiveTrue(playerId)).thenReturn(Collections.emptyList());

        PlayerUpdateRequest request = new PlayerUpdateRequest(
                null, "DifferentLast", null, null,
                null, null, null, null, null,
                null, null, null, null, null, null, null,
                null, null, null, null
        );

        playerService.updatePlayer(playerId, request);

        assertThat(existingPerson.getRecordVerificationStatus()).isEqualTo("UNVERIFIED");
        assertThat(existingPerson.getRecordVerifiedAt()).isNull();
        verify(auditLogger).logRecordVerificationReset(eq(existingPerson), any());
    }

    @Test
    void updatePlayer_verified_genderChanged_clearsRecordVerificationAndAuditsReset() {
        existingPerson.setRecordVerificationStatus("VERIFIED");
        existingPerson.setRecordVerifiedAt(java.time.LocalDateTime.now());
        existingPerson.setRecordVerifiedBy(UUID.randomUUID());
        existingPerson.setRecordVerifiedByName("Admin User");
        existingPerson.setRecordVerificationMethod("DOCUMENT_SIGHTED");

        when(playerRepository.findByIdWithPerson(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerRepository.findPersonByPlayerId(playerId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));
        when(playerRepository.save(any(Player.class))).thenAnswer(i -> i.getArgument(0));
        when(playerTeamRepository.findByPlayerIdAndIsActiveTrue(playerId)).thenReturn(Collections.emptyList());

        PlayerUpdateRequest request = new PlayerUpdateRequest(
                null, null, "FEMALE", null,
                null, null, null, null, null,
                null, null, null, null, null, null, null,
                null, null, null, null
        );

        playerService.updatePlayer(playerId, request);

        assertThat(existingPerson.getGender()).isEqualTo("FEMALE");
        assertThat(existingPerson.getRecordVerificationStatus()).isEqualTo("UNVERIFIED");
        assertThat(existingPerson.getRecordVerifiedAt()).isNull();
        verify(auditLogger).logRecordVerificationReset(eq(existingPerson), any());
    }

    @Test
    void updatePlayer_verified_phoneOnlyChange_resendingSameDobAndGender_staysVerified() {
        existingPerson.setRecordVerificationStatus("VERIFIED");
        java.time.LocalDateTime verifiedAt = java.time.LocalDateTime.now();
        UUID adminId = UUID.randomUUID();
        existingPerson.setRecordVerifiedAt(verifiedAt);
        existingPerson.setRecordVerifiedBy(adminId);
        existingPerson.setRecordVerifiedByName("Admin User");
        existingPerson.setRecordVerificationMethod("PRE_REGISTRATION_RECORD");

        when(playerRepository.findByIdWithPerson(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerRepository.findPersonByPlayerId(playerId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));
        when(playerRepository.save(any(Player.class))).thenAnswer(i -> i.getArgument(0));
        when(playerTeamRepository.findByPlayerIdAndIsActiveTrue(playerId)).thenReturn(Collections.emptyList());

        PlayerUpdateRequest request = new PlayerUpdateRequest(
                null, null, existingPerson.getGender(), existingPerson.getDob(),
                null, null, "+60123456789", null, null,
                null, null, null, null, null, null, null,
                null, null, null, null
        );

        playerService.updatePlayer(playerId, request);

        assertThat(existingPerson.getRecordVerificationStatus()).isEqualTo("VERIFIED");
        assertThat(existingPerson.getRecordVerifiedAt()).isEqualTo(verifiedAt);
        assertThat(existingPerson.getRecordVerifiedBy()).isEqualTo(adminId);
        assertThat(existingPerson.getRecordVerifiedByName()).isEqualTo("Admin User");
        assertThat(existingPerson.getRecordVerificationMethod()).isEqualTo("PRE_REGISTRATION_RECORD");
        verify(auditLogger, never()).logRecordVerificationReset(any(), any());
    }

    // -----------------------------------------------------------------------
    // DEF-R01: Email normalisation & duplicate handling
    // -----------------------------------------------------------------------

    @Test
    void createPlayer_blankEmail_savedWithNull() {
        PlayerCreateRequest request = new PlayerCreateRequest(
                "Ali", "Abu", "MALE", LocalDate.of(1995, 5, 5), "MALAYSIAN",
                "   ", null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null
        );

        assertThatThrownBy(() -> playerService.createPlayer(request))
                .isInstanceOf(EmailRequiredException.class)
                .hasMessage("Email is required.");
    }

    @Test
    void updatePlayer_blankEmail_throwsEmailRequiredException() {
        existingPerson.setEmail("player@example.com");
        when(playerRepository.findByIdWithPerson(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerRepository.findPersonByPlayerId(playerId)).thenReturn(Optional.of(existingPerson));

        PlayerUpdateRequest request = new PlayerUpdateRequest(
                null, null, null, null,
                null, "   ", null,
                null, null,
                null, null, null, null, null, null, null,
                null, null, null, null
        );

        assertThatThrownBy(() -> playerService.updatePlayer(playerId, request))
                .isInstanceOf(EmailRequiredException.class)
                .hasMessage("An existing email address cannot be removed.");
    }

    @Test
    void updatePlayer_legacyPersonWithoutEmail_editingOtherFields_succeeds() {
        existingPerson.setEmail(null);
        when(playerRepository.findByIdWithPerson(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerRepository.findPersonByPlayerId(playerId)).thenReturn(Optional.of(existingPerson));
        when(playerRepository.save(any(Player.class))).thenAnswer(i -> i.getArgument(0));
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        // (firstName, lastName, gender, dob, nationality, email, phone, address…)
        PlayerUpdateRequest request = new PlayerUpdateRequest(
                null, null, null, null,
                null, null, "0129998887",
                null, null,
                null, null, null, null, null, null, null,
                null, null, null, null
        );

        playerService.updatePlayer(playerId, request);

        assertThat(existingPerson.getEmail()).isNull();
        assertThat(existingPerson.getPhone()).isEqualTo("0129998887");
    }

    @Test
    void createPlayer_duplicateEmailIgnoreCase_throwsDuplicateEmailException() {
        PlayerCreateRequest request = new PlayerCreateRequest(
                "Ali", "Abu", "MALE", LocalDate.of(1995, 5, 5), "MALAYSIAN",
                "case@example.test", null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null
        );

        when(personRepository.existsByEmailIgnoreCase("case@example.test")).thenReturn(true);

        assertThatThrownBy(() -> playerService.createPlayer(request))
                .isInstanceOf(DuplicateEmailException.class);
        verify(personRepository).existsByEmailIgnoreCase("case@example.test");
    }

    @Test
    void updatePlayer_duplicateEmailIgnoreCase_throwsDuplicateEmailException() {
        when(playerRepository.findByIdWithPerson(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerRepository.findPersonByPlayerId(playerId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.existsByEmailIgnoreCaseAndIdNot("case@example.test", personId)).thenReturn(true);

        PlayerUpdateRequest request = new PlayerUpdateRequest(
                null, null, null, null,
                null, "case@example.test", null,
                null, null,
                null, null, null, null, null, null, null,
                null, null, null, null
        );

        assertThatThrownBy(() -> playerService.updatePlayer(playerId, request))
                .isInstanceOf(DuplicateEmailException.class);
        verify(personRepository).existsByEmailIgnoreCaseAndIdNot("case@example.test", personId);
    }

    @Test
    void updatePlayer_changingDobIntoMatch_throwsPossibleDuplicatePersonException() {
        existingPerson.setDob(LocalDate.of(2000, 1, 1));
        existingPerson.setFirstName("Ali");
        existingPerson.setLastName("Abu");
        existingPerson.setGender("MALE");
        existingPerson.setEmail("existing@example.com");

        when(playerRepository.findByIdWithPerson(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerRepository.findPersonByPlayerId(playerId)).thenReturn(Optional.of(existingPerson));

        LocalDate newDob = LocalDate.of(2001, 2, 2);
        PlayerUpdateRequest request = new PlayerUpdateRequest(
                null, null, null, newDob,
                null, null, null,
                null, null,
                null, null, null, null, null, null, null,
                null, null, null, null
        );

        PossibleDuplicateCheck matchCheck = new PossibleDuplicateCheck(
                List.of(new PossibleDuplicateMatch("AOS-000001", "Ali", "Abu")), 0);
        when(personDuplicateService.check("Ali", "Abu", newDob, "MALE", personId))
                .thenReturn(matchCheck);

        assertThatThrownBy(() -> playerService.updatePlayer(playerId, request))
                .isInstanceOf(PossibleDuplicatePersonException.class);
    }

    @Test
    void createPlayer_withoutEmail_throwsEmailRequiredException() {
        PlayerCreateRequest request = new PlayerCreateRequest(
                "Ali", "Abu", "MALE", LocalDate.of(1995, 5, 5), "MALAYSIAN",
                null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null
        );

        assertThatThrownBy(() -> playerService.createPlayer(request))
                .isInstanceOf(EmailRequiredException.class);
    }

    @Test
    void updatePlayer_changingOnlyPhone_duplicateServiceNeverCalled() {
        existingPerson.setEmail("existing@example.com");
        when(playerRepository.findByIdWithPerson(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerRepository.findPersonByPlayerId(playerId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));
        when(playerRepository.save(any(Player.class))).thenAnswer(i -> i.getArgument(0));

        PlayerUpdateRequest request = new PlayerUpdateRequest(
                null, null, null, null,
                null, null, "0123456789",
                null, null,
                null, null, null, null, null, null, null,
                null, null, null, null
        );

        playerService.updatePlayer(playerId, request);

        verify(personDuplicateService, never()).check(any(), any(), any(), any(), any());
    }

    @Test
    void createBatchPlayers_rowWithBlankEmail_returnsRowErrorAndDoesNotSave() {
        UUID teamId = UUID.randomUUID();
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(new com.athleticaos.backend.entities.Team()));

        com.athleticaos.backend.dtos.player.PlayerRowDTO row = new com.athleticaos.backend.dtos.player.PlayerRowDTO(
                "Test", "Player", "MALE", LocalDate.of(1995, 5, 20),
                "Malaysian", "   ", null, null
        );

        when(validator.validate(any())).thenReturn(Collections.emptySet());

        com.athleticaos.backend.dtos.player.PlayerBatchResponse response =
                playerService.createBatchPlayers(teamId, List.of(row));

        assertThat(response.failCount()).isEqualTo(1);
        assertThat(response.successCount()).isEqualTo(0);
        assertThat(response.results().get(0).errors()).contains("Email is required.");
        verify(playerBatchHelper, never()).savePlayerInNewTransaction(any(), any());
    }

    @Test
    void createBatchPlayers_rowWithPossibleDuplicate_noFlag_returnsPossibleDuplicateStatusAndDoesNotSave() {
        UUID teamId = UUID.randomUUID();
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(new com.athleticaos.backend.entities.Team()));

        com.athleticaos.backend.dtos.player.PlayerRowDTO row = new com.athleticaos.backend.dtos.player.PlayerRowDTO(
                "Test", "Player", "MALE", LocalDate.of(1995, 5, 20),
                "Malaysian", "test@example.invalid", null, null, false
        );

        when(validator.validate(any())).thenReturn(Collections.emptySet());
        when(personRepository.existsByEmailIgnoreCase("test@example.invalid")).thenReturn(false);

        PossibleDuplicateCheck dupCheck = new PossibleDuplicateCheck(
                List.of(new PossibleDuplicateMatch("AOS-000001", "Test", "Player")), 0);
        when(personDuplicateService.check("Test", "Player", LocalDate.of(1995, 5, 20), "MALE", null))
                .thenReturn(dupCheck);

        com.athleticaos.backend.dtos.player.PlayerBatchResponse response =
                playerService.createBatchPlayers(teamId, List.of(row));

        assertThat(response.failCount()).isEqualTo(1);
        assertThat(response.successCount()).isEqualTo(0);
        assertThat(response.results().get(0).status()).isEqualTo("POSSIBLE_DUPLICATE");
        verify(playerBatchHelper, never()).savePlayerInNewTransaction(any(), any());
    }

    @Test
    void createBatchPlayers_rowWithPossibleDuplicate_confirmFlagTrue_savesPlayerAndAudits() {
        UUID teamId = UUID.randomUUID();
        com.athleticaos.backend.entities.Team team = new com.athleticaos.backend.entities.Team();
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));

        com.athleticaos.backend.dtos.player.PlayerRowDTO row = new com.athleticaos.backend.dtos.player.PlayerRowDTO(
                "Test", "Player", "MALE", LocalDate.of(1995, 5, 20),
                "Malaysian", "test@example.invalid", null, null, true
        );

        when(validator.validate(any())).thenReturn(Collections.emptySet());
        when(personRepository.existsByEmailIgnoreCase("test@example.invalid")).thenReturn(false);

        PossibleDuplicateCheck dupCheck = new PossibleDuplicateCheck(
                List.of(new PossibleDuplicateMatch("AOS-000001", "Test", "Player")), 0);
        when(personDuplicateService.check("Test", "Player", LocalDate.of(1995, 5, 20), "MALE", null))
                .thenReturn(dupCheck);

        UUID newPlayerId = UUID.randomUUID();
        when(playerBatchHelper.savePlayerInNewTransaction(row, team)).thenReturn(newPlayerId);
        Player savedPlayer = Player.builder().person(existingPerson).build();
        when(playerRepository.findByIdWithPerson(newPlayerId)).thenReturn(Optional.of(savedPlayer));

        com.athleticaos.backend.dtos.player.PlayerBatchResponse response =
                playerService.createBatchPlayers(teamId, List.of(row));

        assertThat(response.failCount()).isEqualTo(0);
        assertThat(response.successCount()).isEqualTo(1);
        assertThat(response.results().get(0).status()).isEqualTo("SUCCESS");
        verify(playerBatchHelper).savePlayerInNewTransaction(row, team);
        verify(auditLogger).logPersonPossibleDuplicateOverride(eq(existingPerson), eq(1), eq(0), any());
    }

    @Test
    void getPlayerInScope_superAdmin_readsAnyPlayer() {
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(null);
        when(playerRepository.findById(playerId)).thenReturn(Optional.of(existingPlayer));
        when(playerTeamRepository.findByPlayerIdAndIsActiveTrue(playerId)).thenReturn(Collections.emptyList());

        PlayerResponse response = playerService.getPlayerInScope(playerId.toString());

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(playerId);
    }

    @Test
    void getPlayerInScope_orgAdmin_readsPlayerLinkedThroughOrganisationPerson() {
        UUID orgId = UUID.randomUUID();
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(java.util.Set.of(orgId));
        when(playerRepository.findById(playerId)).thenReturn(Optional.of(existingPlayer));
        when(organisationPersonRepository.existsByPersonIdAndOrganisationIdIn(personId, java.util.Set.of(orgId)))
                .thenReturn(true);
        when(playerTeamRepository.findByPlayerIdAndIsActiveTrue(playerId)).thenReturn(Collections.emptyList());

        PlayerResponse response = playerService.getPlayerInScope(playerId.toString());

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(playerId);
    }

    @Test
    void getPlayerInScope_orgAdmin_readsPlayerThroughActiveTeamOnly() {
        UUID orgId = UUID.randomUUID();
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(java.util.Set.of(orgId));
        when(playerRepository.findById(playerId)).thenReturn(Optional.of(existingPlayer));
        when(organisationPersonRepository.existsByPersonIdAndOrganisationIdIn(personId, java.util.Set.of(orgId)))
                .thenReturn(false);
        when(playerTeamRepository.existsActiveByPlayerIdAndOrganisationIdIn(playerId, java.util.Set.of(orgId)))
                .thenReturn(true);
        when(playerTeamRepository.findByPlayerIdAndIsActiveTrue(playerId)).thenReturn(Collections.emptyList());

        PlayerResponse response = playerService.getPlayerInScope(playerId.toString());

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(playerId);
    }

    @Test
    void getPlayerInScope_outOfScope_throwsNotFoundWithExactMessage() {
        UUID orgId = UUID.randomUUID();
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(java.util.Set.of(orgId));
        when(playerRepository.findById(playerId)).thenReturn(Optional.of(existingPlayer));
        when(organisationPersonRepository.existsByPersonIdAndOrganisationIdIn(personId, java.util.Set.of(orgId)))
                .thenReturn(false);
        when(playerTeamRepository.existsActiveByPlayerIdAndOrganisationIdIn(playerId, java.util.Set.of(orgId)))
                .thenReturn(false);

        assertThatThrownBy(() -> playerService.getPlayerInScope(playerId.toString()))
                .isInstanceOf(jakarta.persistence.EntityNotFoundException.class)
                .hasMessage("Player not found");
    }

    @Test
    void getPlayerInScope_emptyAccessibleSet_throwsNotFound() {
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(Collections.emptySet());
        when(playerRepository.findById(playerId)).thenReturn(Optional.of(existingPlayer));

        assertThatThrownBy(() -> playerService.getPlayerInScope(playerId.toString()))
                .isInstanceOf(jakarta.persistence.EntityNotFoundException.class)
                .hasMessage("Player not found");

        // An empty set must never reach the IN-clause scope queries
        verify(organisationPersonRepository, never()).existsByPersonIdAndOrganisationIdIn(any(), any());
        verify(playerTeamRepository, never()).existsActiveByPlayerIdAndOrganisationIdIn(any(), any());
    }

    @Test
    void getPlayerInScope_bySlug_scopedSameWay() {
        String slug = "player-a";
        existingPlayer.setSlug(slug);

        // In scope via SUPER_ADMIN
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(null);
        when(playerRepository.findBySlug(slug)).thenReturn(Optional.of(existingPlayer));
        when(playerTeamRepository.findByPlayerIdAndIsActiveTrue(playerId)).thenReturn(Collections.emptyList());

        PlayerResponse response = playerService.getPlayerInScope(slug);
        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(playerId);

        // Out of scope
        UUID orgId = UUID.randomUUID();
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(java.util.Set.of(orgId));
        when(organisationPersonRepository.existsByPersonIdAndOrganisationIdIn(personId, java.util.Set.of(orgId)))
                .thenReturn(false);
        when(playerTeamRepository.existsActiveByPlayerIdAndOrganisationIdIn(playerId, java.util.Set.of(orgId)))
                .thenReturn(false);

        assertThatThrownBy(() -> playerService.getPlayerInScope(slug))
                .isInstanceOf(jakarta.persistence.EntityNotFoundException.class)
                .hasMessage("Player not found");
    }

    @Test
    void updatePlayer_outOfScope_throwsNotFoundAndNeverSaves() {
        UUID orgId = UUID.randomUUID();
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(java.util.Set.of(orgId));
        when(playerRepository.findByIdWithPerson(playerId)).thenReturn(Optional.of(existingPlayer));
        when(organisationPersonRepository.existsByPersonIdAndOrganisationIdIn(personId, java.util.Set.of(orgId)))
                .thenReturn(false);
        when(playerTeamRepository.existsActiveByPlayerIdAndOrganisationIdIn(playerId, java.util.Set.of(orgId)))
                .thenReturn(false);

        PlayerUpdateRequest request = new PlayerUpdateRequest(
                null, null, "MALE", null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null, null, null
        );

        assertThatThrownBy(() -> playerService.updatePlayer(playerId, request))
                .isInstanceOf(jakarta.persistence.EntityNotFoundException.class)
                .hasMessage("Player not found");

        verify(playerRepository, never()).save(any());
        verify(personRepository, never()).save(any());
    }

    @Test
    void deletePlayer_outOfScope_throwsNotFoundAndNeverDeletesOrSaves() {
        UUID orgId = UUID.randomUUID();
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(java.util.Set.of(orgId));
        when(playerRepository.findById(playerId)).thenReturn(Optional.of(existingPlayer));
        when(organisationPersonRepository.existsByPersonIdAndOrganisationIdIn(personId, java.util.Set.of(orgId)))
                .thenReturn(false);
        when(playerTeamRepository.existsActiveByPlayerIdAndOrganisationIdIn(playerId, java.util.Set.of(orgId)))
                .thenReturn(false);

        assertThatThrownBy(() -> playerService.deletePlayer(playerId))
                .isInstanceOf(jakarta.persistence.EntityNotFoundException.class)
                .hasMessage("Player not found");

        verify(playerRepository, never()).delete(any());
        verify(playerRepository, never()).save(any());
        verify(playerTeamRepository, never()).deleteAll(any());
        verify(personRepository, never()).delete(any());
    }

    @Test
    void getAllPlayers_withForeignTeamId_returnsEmpty() {
        UUID myOrgId = UUID.randomUUID();
        UUID foreignOrgId = UUID.randomUUID();
        UUID foreignTeamId = UUID.randomUUID();

        com.athleticaos.backend.entities.Organisation foreignOrg = com.athleticaos.backend.entities.Organisation.builder()
                .id(foreignOrgId)
                .build();
        com.athleticaos.backend.entities.Team foreignTeam = com.athleticaos.backend.entities.Team.builder()
                .id(foreignTeamId)
                .organisation(foreignOrg)
                .build();

        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(java.util.Set.of(myOrgId));
        when(teamRepository.findById(foreignTeamId)).thenReturn(Optional.of(foreignTeam));

        List<PlayerResponse> result = playerService.getAllPlayers(null, foreignTeamId);
        assertThat(result).isEmpty();
        verify(playerTeamRepository, never()).findPlayersByTeamId(any());
    }
}
