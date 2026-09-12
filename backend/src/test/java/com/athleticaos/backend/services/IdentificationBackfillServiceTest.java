package com.athleticaos.backend.services;

import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.repositories.PersonRepository;
import com.athleticaos.backend.services.impl.IdentificationBackfillPersister;
import com.athleticaos.backend.services.impl.IdentificationBackfillServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class IdentificationBackfillServiceTest {

    @Mock
    private PersonRepository personRepository;

    @Mock
    private IdentificationHashService identificationHashService;

    @Mock
    private IdentificationBackfillPersister persister;

    @InjectMocks
    private IdentificationBackfillServiceImpl backfillService;

    private UUID personId1;
    private UUID personId2;
    private Person person1;
    private Person person2;

    @BeforeEach
    void setUp() {
        personId1 = UUID.randomUUID();
        personId2 = UUID.randomUUID();

        person1 = Person.builder()
                .id(personId1)
                .firstName("Ali")
                .lastName("Ahmad")
                .icOrPassport("900101011234")
                .identificationType("MALAYSIAN_IC")
                .build();

        person2 = Person.builder()
                .id(personId2)
                .firstName("Bob")
                .lastName("Smith")
                .icOrPassport("A98765432")
                .identificationType("PASSPORT")
                .build();
    }

    @Test
    void runBackfill_hmacNotConfigured_throwsIllegalStateException() {
        when(identificationHashService.isConfigured()).thenReturn(false);

        assertThatThrownBy(() -> backfillService.runBackfill(true, 100))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("HMAC service is not configured");
    }

    @Test
    void runBackfill_dryRun_calculatesCountsWithoutPersisting() {
        when(identificationHashService.isConfigured()).thenReturn(true);
        when(identificationHashService.getActiveVersion()).thenReturn(1);

        when(personRepository.findUnhashedWithIdentificationOrderByIdAsc(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(person1, person2)));
        when(personRepository.findUnhashedWithIdentificationAndIdGreaterThanOrderByIdAsc(eq(personId2), any(Pageable.class)))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        when(identificationHashService.computeHash("900101011234")).thenReturn("hash1111111111111111111111111111111111111111111111111111111111111111");
        when(identificationHashService.computeHash("A98765432")).thenReturn("hash2222222222222222222222222222222222222222222222222222222222222222");

        when(personRepository.findByIdentificationHash("hash1111111111111111111111111111111111111111111111111111111111111111")).thenReturn(Optional.empty());
        when(personRepository.findByIdentificationHash("hash2222222222222222222222222222222222222222222222222222222222222222")).thenReturn(Optional.empty());

        Map<String, Object> summary = backfillService.runBackfill(true, 100);

        assertThat(summary.get("dryRun")).isEqualTo(true);
        assertThat(summary.get("totalProcessed")).isEqualTo(2L);
        assertThat(summary.get("totalHashed")).isEqualTo(2L);
        assertThat(summary.get("totalFlagged")).isEqualTo(0L);
        assertThat(summary.get("totalSkipped")).isEqualTo(0L);
        assertThat(summary.get("totalConflicting")).isEqualTo(0L);

        // Dry-run must NEVER invoke persister
        verify(persister, never()).persistHashedPerson(any(), anyString(), anyInt());
        verify(persister, never()).persistFlaggedPerson(any(), anyString());
    }

    @Test
    void runBackfill_liveRun_persistsHashedPersons() {
        when(identificationHashService.isConfigured()).thenReturn(true);
        when(identificationHashService.getActiveVersion()).thenReturn(1);

        when(personRepository.findUnhashedWithIdentificationOrderByIdAsc(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(person1)));
        when(personRepository.findUnhashedWithIdentificationAndIdGreaterThanOrderByIdAsc(eq(personId1), any(Pageable.class)))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        String hash = "hash1111111111111111111111111111111111111111111111111111111111111111";
        when(identificationHashService.computeHash("900101011234")).thenReturn(hash);
        when(personRepository.findByIdentificationHash(hash)).thenReturn(Optional.empty());
        when(persister.persistHashedPerson(person1, hash, 1)).thenReturn(true);

        Map<String, Object> summary = backfillService.runBackfill(false, 100);

        assertThat(summary.get("dryRun")).isEqualTo(false);
        assertThat(summary.get("totalProcessed")).isEqualTo(1L);
        assertThat(summary.get("totalHashed")).isEqualTo(1L);
        assertThat(summary.get("totalFlagged")).isEqualTo(0L);

        verify(persister, times(1)).persistHashedPerson(person1, hash, 1);
    }

    @Test
    void runBackfill_dbDuplicateCollision_flagsStatus() {
        when(identificationHashService.isConfigured()).thenReturn(true);
        when(identificationHashService.getActiveVersion()).thenReturn(1);

        when(personRepository.findUnhashedWithIdentificationOrderByIdAsc(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(person1)));
        when(personRepository.findUnhashedWithIdentificationAndIdGreaterThanOrderByIdAsc(eq(personId1), any(Pageable.class)))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        String collidingHash = "hash-existing-another-person";
        when(identificationHashService.computeHash("900101011234")).thenReturn(collidingHash);

        Person otherPerson = Person.builder()
                .id(UUID.randomUUID())
                .identificationHash(collidingHash)
                .build();
        when(personRepository.findByIdentificationHash(collidingHash)).thenReturn(Optional.of(otherPerson));

        Map<String, Object> summary = backfillService.runBackfill(false, 100);

        assertThat(summary.get("totalProcessed")).isEqualTo(1L);
        assertThat(summary.get("totalHashed")).isEqualTo(0L);
        assertThat(summary.get("totalFlagged")).isEqualTo(1L);

        verify(persister, never()).persistHashedPerson(any(), anyString(), anyInt());
        verify(persister, times(1)).persistFlaggedPerson(person1, "DB_DUPLICATE");
    }

    @Test
    void runBackfill_inBatchDuplicate_flagsSecondRecord() {
        when(identificationHashService.isConfigured()).thenReturn(true);
        when(identificationHashService.getActiveVersion()).thenReturn(1);

        // person2 has the same IC as person1
        person2.setIcOrPassport("900101011234");

        when(personRepository.findUnhashedWithIdentificationOrderByIdAsc(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(person1, person2)));
        when(personRepository.findUnhashedWithIdentificationAndIdGreaterThanOrderByIdAsc(eq(personId2), any(Pageable.class)))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        String sameHash = "hash-shared-by-both";
        when(identificationHashService.computeHash("900101011234")).thenReturn(sameHash);
        when(personRepository.findByIdentificationHash(sameHash)).thenReturn(Optional.empty());
        when(persister.persistHashedPerson(person1, sameHash, 1)).thenReturn(true);

        Map<String, Object> summary = backfillService.runBackfill(false, 100);

        assertThat(summary.get("totalProcessed")).isEqualTo(2L);
        assertThat(summary.get("totalHashed")).isEqualTo(1L);
        assertThat(summary.get("totalFlagged")).isEqualTo(1L);

        verify(persister, times(1)).persistHashedPerson(person1, sameHash, 1);
        verify(persister, times(1)).persistFlaggedPerson(person2, "IN_BATCH_DUPLICATE");
    }

    @Test
    void runBackfill_secondarySourceSelection_whenPrimaryNull() {
        when(identificationHashService.isConfigured()).thenReturn(true);
        when(identificationHashService.getActiveVersion()).thenReturn(1);

        Person secondaryOnly = Person.builder()
                .id(personId1)
                .icOrPassport(null)
                .identificationValue("950520-14-5551")
                .identificationType("MALAYSIAN_IC")
                .build();

        when(personRepository.findUnhashedWithIdentificationOrderByIdAsc(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(secondaryOnly)));
        when(personRepository.findUnhashedWithIdentificationAndIdGreaterThanOrderByIdAsc(eq(personId1), any(Pageable.class)))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        String hash = "hash-from-secondary";
        when(identificationHashService.computeHash("950520145551")).thenReturn(hash);
        when(personRepository.findByIdentificationHash(hash)).thenReturn(Optional.empty());
        when(persister.persistHashedPerson(secondaryOnly, hash, 1)).thenReturn(true);

        Map<String, Object> summary = backfillService.runBackfill(false, 100);

        assertThat(summary.get("totalProcessed")).isEqualTo(1L);
        assertThat(summary.get("totalHashed")).isEqualTo(1L);
        verify(persister).persistHashedPerson(secondaryOnly, hash, 1);
    }

    @Test
    void runBackfill_matchingSources_usesValue() {
        when(identificationHashService.isConfigured()).thenReturn(true);
        when(identificationHashService.getActiveVersion()).thenReturn(1);

        Person matching = Person.builder()
                .id(personId1)
                .icOrPassport("950520-14-5551")
                .identificationValue("950520145551")
                .identificationType("MALAYSIAN_IC")
                .build();

        when(personRepository.findUnhashedWithIdentificationOrderByIdAsc(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(matching)));
        when(personRepository.findUnhashedWithIdentificationAndIdGreaterThanOrderByIdAsc(eq(personId1), any(Pageable.class)))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        String hash = "hash-from-matching";
        when(identificationHashService.computeHash("950520145551")).thenReturn(hash);
        when(personRepository.findByIdentificationHash(hash)).thenReturn(Optional.empty());
        when(persister.persistHashedPerson(matching, hash, 1)).thenReturn(true);

        Map<String, Object> summary = backfillService.runBackfill(false, 100);

        assertThat(summary.get("totalHashed")).isEqualTo(1L);
        assertThat(summary.get("totalConflicting")).isEqualTo(0L);
    }

    @Test
    void runBackfill_conflictingSources_flagsAsConflict() {
        when(identificationHashService.isConfigured()).thenReturn(true);
        when(identificationHashService.getActiveVersion()).thenReturn(1);

        Person conflicting = Person.builder()
                .id(personId1)
                .icOrPassport("950520145551")
                .identificationValue("900101011234")
                .identificationType("MALAYSIAN_IC")
                .build();

        when(personRepository.findUnhashedWithIdentificationOrderByIdAsc(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(conflicting)));
        when(personRepository.findUnhashedWithIdentificationAndIdGreaterThanOrderByIdAsc(eq(personId1), any(Pageable.class)))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        Map<String, Object> summary = backfillService.runBackfill(false, 100);

        assertThat(summary.get("totalProcessed")).isEqualTo(1L);
        assertThat(summary.get("totalHashed")).isEqualTo(0L);
        assertThat(summary.get("totalFlagged")).isEqualTo(1L);
        assertThat(summary.get("totalConflicting")).isEqualTo(1L);

        verify(persister, times(1)).persistFlaggedPerson(conflicting, "SOURCE_CONFLICT");
    }

    @Test
    void runBackfill_alreadyHashedAtCurrentVersion_skips() {
        when(identificationHashService.isConfigured()).thenReturn(true);
        when(identificationHashService.getActiveVersion()).thenReturn(1);

        Person alreadyHashed = Person.builder()
                .id(personId1)
                .icOrPassport("950520145551")
                .identificationHash("existing-valid-hash")
                .identificationHashVersion(1)
                .build();

        when(personRepository.findUnhashedWithIdentificationOrderByIdAsc(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(alreadyHashed)));
        when(personRepository.findUnhashedWithIdentificationAndIdGreaterThanOrderByIdAsc(eq(personId1), any(Pageable.class)))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        Map<String, Object> summary = backfillService.runBackfill(false, 100);

        assertThat(summary.get("totalProcessed")).isEqualTo(1L);
        assertThat(summary.get("totalAlreadyHashed")).isEqualTo(1L);
        assertThat(summary.get("totalHashed")).isEqualTo(0L);

        verify(persister, never()).persistHashedPerson(any(), anyString(), anyInt());
    }

    @Test
    void runBackfill_blankOrEmptyIc_skips() {
        when(identificationHashService.isConfigured()).thenReturn(true);
        when(identificationHashService.getActiveVersion()).thenReturn(1);

        Person blankIcPerson = Person.builder()
                .id(personId1)
                .icOrPassport("   ")
                .identificationValue(null)
                .build();

        when(personRepository.findUnhashedWithIdentificationOrderByIdAsc(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(blankIcPerson)));
        when(personRepository.findUnhashedWithIdentificationAndIdGreaterThanOrderByIdAsc(eq(personId1), any(Pageable.class)))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        Map<String, Object> summary = backfillService.runBackfill(false, 100);

        assertThat(summary.get("totalProcessed")).isEqualTo(1L);
        assertThat(summary.get("totalSkipped")).isEqualTo(1L);
        assertThat(summary.get("totalHashed")).isEqualTo(0L);

        verify(persister, never()).persistHashedPerson(any(), anyString(), anyInt());
        verify(persister, never()).persistFlaggedPerson(any(), anyString());
    }
}
