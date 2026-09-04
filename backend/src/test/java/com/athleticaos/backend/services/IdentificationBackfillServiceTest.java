package com.athleticaos.backend.services;

import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.repositories.PersonRepository;
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
import static org.mockito.ArgumentMatchers.any;
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
    void runBackfill_dryRun_calculatesCountsWithoutPersisting() {
        when(personRepository.findByIdentificationHashIsNullAndIcOrPassportIsNotNullOrderByIdAsc(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(person1, person2)));
        when(personRepository.findByIdentificationHashIsNullAndIcOrPassportIsNotNullAndIdGreaterThanOrderByIdAsc(eq(personId2), any(Pageable.class)))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        when(identificationHashService.hash("900101011234")).thenReturn("hash1111111111111111111111111111111111111111111111111111111111111111");
        when(identificationHashService.hash("A98765432")).thenReturn("hash2222222222222222222222222222222222222222222222222222222222222222");

        when(personRepository.findByIdentificationHash("hash1111111111111111111111111111111111111111111111111111111111111111")).thenReturn(Optional.empty());
        when(personRepository.findByIdentificationHash("hash2222222222222222222222222222222222222222222222222222222222222222")).thenReturn(Optional.empty());

        Map<String, Object> summary = backfillService.runBackfill(true, 100);

        assertThat(summary.get("dryRun")).isEqualTo(true);
        assertThat(summary.get("totalProcessed")).isEqualTo(2L);
        assertThat(summary.get("totalHashed")).isEqualTo(2L);
        assertThat(summary.get("totalFlagged")).isEqualTo(0L);
        assertThat(summary.get("totalSkipped")).isEqualTo(0L);

        // Dry-run must NEVER save to database
        verify(personRepository, never()).save(any(Person.class));
    }

    @Test
    void runBackfill_liveRun_persistsHashedPersons() {
        when(personRepository.findByIdentificationHashIsNullAndIcOrPassportIsNotNullOrderByIdAsc(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(person1)));
        when(personRepository.findByIdentificationHashIsNullAndIcOrPassportIsNotNullAndIdGreaterThanOrderByIdAsc(eq(personId1), any(Pageable.class)))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        String hash = "hash1111111111111111111111111111111111111111111111111111111111111111";
        when(identificationHashService.hash("900101011234")).thenReturn(hash);
        when(identificationHashService.getCurrentVersion()).thenReturn(1);
        when(personRepository.findByIdentificationHash(hash)).thenReturn(Optional.empty());

        Map<String, Object> summary = backfillService.runBackfill(false, 100);

        assertThat(summary.get("dryRun")).isEqualTo(false);
        assertThat(summary.get("totalProcessed")).isEqualTo(1L);
        assertThat(summary.get("totalHashed")).isEqualTo(1L);

        verify(personRepository, times(1)).save(person1);
        assertThat(person1.getIdentificationHash()).isEqualTo(hash);
        assertThat(person1.getIdentificationHashVersion()).isEqualTo(1);
        assertThat(person1.getIdentificationVerificationStatus()).isEqualTo("UNVERIFIED");
    }

    @Test
    void runBackfill_collisionDetected_flagsStatusWithoutSettingDuplicateHash() {
        when(personRepository.findByIdentificationHashIsNullAndIcOrPassportIsNotNullOrderByIdAsc(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(person1)));
        when(personRepository.findByIdentificationHashIsNullAndIcOrPassportIsNotNullAndIdGreaterThanOrderByIdAsc(eq(personId1), any(Pageable.class)))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        String collidingHash = "hash-existing-another-person";
        when(identificationHashService.hash("900101011234")).thenReturn(collidingHash);

        Person otherPerson = Person.builder()
                .id(UUID.randomUUID())
                .identificationHash(collidingHash)
                .build();
        when(personRepository.findByIdentificationHash(collidingHash)).thenReturn(Optional.of(otherPerson));

        Map<String, Object> summary = backfillService.runBackfill(false, 100);

        assertThat(summary.get("totalProcessed")).isEqualTo(1L);
        assertThat(summary.get("totalHashed")).isEqualTo(0L);
        assertThat(summary.get("totalFlagged")).isEqualTo(1L);

        verify(personRepository, times(1)).save(person1);
        // Hash must NOT be set to the colliding hash to protect unique constraint
        assertThat(person1.getIdentificationHash()).isNull();
        assertThat(person1.getIdentificationVerificationStatus()).isEqualTo("FLAGGED");
    }

    @Test
    void runBackfill_blankOrEmptyIc_skips() {
        Person blankIcPerson = Person.builder()
                .id(personId1)
                .icOrPassport("   ")
                .build();

        when(personRepository.findByIdentificationHashIsNullAndIcOrPassportIsNotNullOrderByIdAsc(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(blankIcPerson)));
        when(personRepository.findByIdentificationHashIsNullAndIcOrPassportIsNotNullAndIdGreaterThanOrderByIdAsc(eq(personId1), any(Pageable.class)))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        Map<String, Object> summary = backfillService.runBackfill(false, 100);

        assertThat(summary.get("totalProcessed")).isEqualTo(1L);
        assertThat(summary.get("totalSkipped")).isEqualTo(1L);
        assertThat(summary.get("totalHashed")).isEqualTo(0L);

        verify(personRepository, never()).save(any(Person.class));
    }
}
