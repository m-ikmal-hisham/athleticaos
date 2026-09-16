package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.repositories.PersonRepository;
import com.athleticaos.backend.services.PlaceholderEmailBackfillService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PlaceholderEmailBackfillServiceImplTest {

    @Mock
    private PersonRepository personRepository;

    @InjectMocks
    private PlaceholderEmailBackfillServiceImpl service;

    private List<Person> candidates;

    @BeforeEach
    void setUp() {
        candidates = new ArrayList<>();
        for (int i = 1; i <= 3; i++) {
            candidates.add(Person.builder()
                    .id(UUID.randomUUID())
                    .registrationNo(String.format("AOS-%06d", i))
                    .email(null)
                    .build());
        }
    }

    private Page<Person> page(List<Person> content) {
        return new PageImpl<>(content, PageRequest.of(0, 200), content.size());
    }

    @Test
    @DisplayName("Dry run reports the work but writes nothing")
    void dryRun_writesNothing() {
        when(personRepository.countPersonsNeedingPlaceholderEmail()).thenReturn(3L);
        when(personRepository.findPersonsNeedingPlaceholderEmail(any(Pageable.class))).thenReturn(page(candidates));

        PlaceholderEmailBackfillService.Summary summary = service.run(true, 200);

        assertThat(summary.dryRun()).isTrue();
        assertThat(summary.candidates()).isEqualTo(3);
        assertThat(summary.filled()).isEqualTo(3);
        assertThat(candidates).allSatisfy(p -> assertThat(p.getEmail()).isNull());
        verify(personRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("Live run fills each address from the registration number")
    void liveRun_fillsPlaceholders() {
        when(personRepository.countPersonsNeedingPlaceholderEmail()).thenReturn(3L);
        when(personRepository.findPersonsNeedingPlaceholderEmail(any(Pageable.class)))
                .thenReturn(page(candidates))
                .thenReturn(page(List.of()));

        PlaceholderEmailBackfillService.Summary summary = service.run(false, 200);

        assertThat(summary.dryRun()).isFalse();
        assertThat(summary.filled()).isEqualTo(3);
        assertThat(candidates).extracting(Person::getEmail)
                .containsExactly("aos-000001@placeholder.invalid",
                                 "aos-000002@placeholder.invalid",
                                 "aos-000003@placeholder.invalid");
        verify(personRepository).saveAll(any());
    }

    @Test
    @DisplayName("Nothing left to do: no writes, empty summary")
    void secondRun_findsNothing() {
        when(personRepository.countPersonsNeedingPlaceholderEmail()).thenReturn(0L);
        when(personRepository.findPersonsNeedingPlaceholderEmail(any(Pageable.class))).thenReturn(page(List.of()));

        PlaceholderEmailBackfillService.Summary summary = service.run(false, 200);

        assertThat(summary.candidates()).isZero();
        assertThat(summary.filled()).isZero();
        verify(personRepository, never()).saveAll(any());
    }
}
