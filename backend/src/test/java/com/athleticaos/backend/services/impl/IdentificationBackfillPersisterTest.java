package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.repositories.PersonRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class IdentificationBackfillPersisterTest {

    @Mock
    private PersonRepository personRepository;

    @InjectMocks
    private IdentificationBackfillPersister persister;

    private Person person;

    @BeforeEach
    void setUp() {
        person = Person.builder()
                .id(UUID.randomUUID())
                .firstName("Test")
                .lastName("Subject")
                .build();
    }

    @Test
    void persistHashedPerson_success_setsHashVersionAndLegacyStatus() {
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        boolean result = persister.persistHashedPerson(person, "validhash123", 1);

        assertThat(result).isTrue();
        assertThat(person.getIdentificationHash()).isEqualTo("validhash123");
        assertThat(person.getIdentificationHashVersion()).isEqualTo(1);
        assertThat(person.getIdentificationVerificationStatus()).isEqualTo("LEGACY");
        verify(personRepository).save(person);
    }

    @Test
    void persistHashedPerson_dataIntegrityViolation_returnsFalse() {
        when(personRepository.save(any(Person.class))).thenThrow(new DataIntegrityViolationException("Unique constraint"));

        boolean result = persister.persistHashedPerson(person, "duplicatehash", 1);

        assertThat(result).isFalse();
    }

    @Test
    void persistFlaggedPerson_setsFlaggedStatusWithoutModifyingHash() {
        person.setIdentificationHash(null);
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        persister.persistFlaggedPerson(person, "TEST_REASON");

        assertThat(person.getIdentificationVerificationStatus()).isEqualTo("FLAGGED");
        assertThat(person.getIdentificationHash()).isNull();
        verify(personRepository).save(person);
    }
}
