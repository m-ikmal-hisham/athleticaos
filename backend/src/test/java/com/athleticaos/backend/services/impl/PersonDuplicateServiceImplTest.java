package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.person.PossibleDuplicateCheck;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.OrganisationPerson;
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.repositories.OrganisationPersonRepository;
import com.athleticaos.backend.repositories.PersonRepository;
import com.athleticaos.backend.services.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PersonDuplicateServiceImplTest {

    @Mock
    private PersonRepository personRepository;

    @Mock
    private OrganisationPersonRepository organisationPersonRepository;

    @Mock
    private UserService userService;

    @InjectMocks
    private PersonDuplicateServiceImpl personDuplicateService;

    private LocalDate dob;

    @BeforeEach
    void setUp() {
        dob = LocalDate.of(1995, 6, 15);
    }

    @Test
    @DisplayName("Should return empty check if any identity parameter is null")
    void check_nullInputs_returnsEmpty() {
        PossibleDuplicateCheck check1 = personDuplicateService.check(null, "Test", dob, "MALE", null);
        assertThat(check1.hasMatches()).isFalse();

        PossibleDuplicateCheck check2 = personDuplicateService.check("Test", null, dob, "MALE", null);
        assertThat(check2.hasMatches()).isFalse();

        PossibleDuplicateCheck check3 = personDuplicateService.check("Test", "Person", null, "MALE", null);
        assertThat(check3.hasMatches()).isFalse();

        PossibleDuplicateCheck check4 = personDuplicateService.check("Test", "Person", dob, null, null);
        assertThat(check4.hasMatches()).isFalse();

        verifyNoInteractions(personRepository);
    }

    @Test
    @DisplayName("Should return empty check when repository returns no matches")
    void check_noCandidatesFound_returnsEmpty() {
        when(personRepository.findPossibleDuplicates(eq("Test"), eq("Person"), eq(dob), eq("MALE"), any(Pageable.class)))
                .thenReturn(Collections.emptyList());

        PossibleDuplicateCheck result = personDuplicateService.check("  Test  ", "  Person  ", dob, "MALE", null);

        assertThat(result.hasMatches()).isFalse();
        assertThat(result.visibleMatches()).isEmpty();
        assertThat(result.otherOrganisationMatches()).isEqualTo(0);
        verify(personRepository).findPossibleDuplicates(eq("Test"), eq("Person"), eq(dob), eq("MALE"), any(Pageable.class));
    }

    @Test
    @DisplayName("Super admin (accessibleOrgIds is null) sees all matches up to 5")
    void check_superAdmin_seesAllMatchesUpToFive() {
        List<Person> candidates = new ArrayList<>();
        for (int i = 1; i <= 7; i++) {
            Person p = Person.builder()
                    .id(UUID.randomUUID())
                    .firstName("Test")
                    .lastName("Person " + i)
                    .registrationNo("AOS-00000" + i)
                    .dob(dob)
                    .gender("MALE")
                    .build();
            candidates.add(p);
        }

        when(personRepository.findPossibleDuplicates(eq("Test"), eq("Person"), eq(dob), eq("MALE"), any(Pageable.class)))
                .thenReturn(candidates);
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(null); // super admin

        PossibleDuplicateCheck result = personDuplicateService.check("Test", "Person", dob, "MALE", null);

        assertThat(result.hasMatches()).isTrue();
        assertThat(result.visibleMatches()).hasSize(5);
        assertThat(result.otherOrganisationMatches()).isEqualTo(0);
        assertThat(result.visibleMatches().get(0).registrationNo()).isEqualTo("AOS-000001");
        verifyNoInteractions(organisationPersonRepository);
    }

    @Test
    @DisplayName("Non-super admin only sees matches within their accessible organisations")
    void check_nonSuperAdmin_filtersByAccessibleOrganisations() {
        UUID accessibleOrgId = UUID.randomUUID();
        UUID otherOrgId = UUID.randomUUID();

        Organisation accessibleOrg = Organisation.builder().id(accessibleOrgId).name("Accessible Org").build();
        Organisation otherOrg = Organisation.builder().id(otherOrgId).name("Other Org").build();

        Person inScopePerson = Person.builder()
                .id(UUID.randomUUID())
                .firstName("Test")
                .lastName("Person")
                .registrationNo("AOS-000101")
                .dob(dob)
                .gender("MALE")
                .build();

        Person outOfScopePerson = Person.builder()
                .id(UUID.randomUUID())
                .firstName("Test")
                .lastName("Person")
                .registrationNo("AOS-000102")
                .dob(dob)
                .gender("MALE")
                .build();

        List<Person> candidates = List.of(inScopePerson, outOfScopePerson);

        when(personRepository.findPossibleDuplicates(eq("Test"), eq("Person"), eq(dob), eq("MALE"), any(Pageable.class)))
                .thenReturn(candidates);
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(Set.of(accessibleOrgId));

        OrganisationPerson op1 = OrganisationPerson.builder()
                .organisation(accessibleOrg)
                .person(inScopePerson)
                .build();
        OrganisationPerson op2 = OrganisationPerson.builder()
                .organisation(otherOrg)
                .person(outOfScopePerson)
                .build();

        when(organisationPersonRepository.findAllByPersonIdIn(anySet())).thenReturn(List.of(op1, op2));

        PossibleDuplicateCheck result = personDuplicateService.check("Test", "Person", dob, "MALE", null);

        assertThat(result.hasMatches()).isTrue();
        assertThat(result.visibleMatches()).hasSize(1);
        assertThat(result.visibleMatches().get(0).registrationNo()).isEqualTo("AOS-000101");
        assertThat(result.otherOrganisationMatches()).isEqualTo(1);
    }

    @Test
    @DisplayName("Candidate with no organisation links is counted as out-of-scope")
    void check_candidateWithNoOrg_countedAsOtherOrg() {
        UUID accessibleOrgId = UUID.randomUUID();

        Person independentPerson = Person.builder()
                .id(UUID.randomUUID())
                .firstName("Test")
                .lastName("Person")
                .registrationNo("AOS-000200")
                .dob(dob)
                .gender("MALE")
                .build();

        when(personRepository.findPossibleDuplicates(eq("Test"), eq("Person"), eq(dob), eq("MALE"), any(Pageable.class)))
                .thenReturn(List.of(independentPerson));
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(Set.of(accessibleOrgId));
        when(organisationPersonRepository.findAllByPersonIdIn(anySet())).thenReturn(Collections.emptyList());

        PossibleDuplicateCheck result = personDuplicateService.check("Test", "Person", dob, "MALE", null);

        assertThat(result.hasMatches()).isTrue();
        assertThat(result.visibleMatches()).isEmpty();
        assertThat(result.otherOrganisationMatches()).isEqualTo(1);
    }

    @Test
    @DisplayName("Should use findPossibleDuplicatesExcludingId when excludePersonId is provided")
    void check_withExcludePersonId_callsExcludingIdMethod() {
        UUID excludeId = UUID.randomUUID();
        when(personRepository.findPossibleDuplicatesExcludingId(eq("Test"), eq("Person"), eq(dob), eq("MALE"), eq(excludeId), any(Pageable.class)))
                .thenReturn(Collections.emptyList());

        PossibleDuplicateCheck result = personDuplicateService.check("Test", "Person", dob, "MALE", excludeId);

        assertThat(result.hasMatches()).isFalse();
        verify(personRepository).findPossibleDuplicatesExcludingId(eq("Test"), eq("Person"), eq(dob), eq("MALE"), eq(excludeId), any(Pageable.class));
        verify(personRepository, never()).findPossibleDuplicates(anyString(), anyString(), any(), anyString(), any());
    }
}
