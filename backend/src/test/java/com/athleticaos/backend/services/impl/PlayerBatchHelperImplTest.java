package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.player.PlayerRowDTO;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.repositories.OrganisationPersonRepository;
import com.athleticaos.backend.repositories.PersonRepository;
import com.athleticaos.backend.repositories.PlayerRepository;
import com.athleticaos.backend.repositories.PlayerTeamRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class PlayerBatchHelperImplTest {

    @Mock
    private PersonRepository personRepository;
    @Mock
    private PlayerRepository playerRepository;
    @Mock
    private PlayerTeamRepository playerTeamRepository;
    @Mock
    private OrganisationPersonRepository organisationPersonRepository;

    @InjectMocks
    private PlayerBatchHelperImpl playerBatchHelper;

    private Team team;

    @BeforeEach
    void setUp() {
        Organisation org = Organisation.builder()
                .id(UUID.randomUUID())
                .name("Test Club")
                .build();

        team = Team.builder()
                .id(UUID.randomUUID())
                .name("Warriors")
                .organisation(org)
                .build();
    }

    @Test
    @DisplayName("Batch row saves person with UNVERIFIED status and canonical gender")
    void savePlayerInNewTransaction_savesPersonCorrectly() {
        PlayerRowDTO row = new PlayerRowDTO(
                "Person",
                "Synthetic B",
                "male",
                LocalDate.of(2000, 1, 1),
                "MALAYSIAN",
                "person.b@example.com",
                "Selangor",
                null
        );

        when(personRepository.save(any(Person.class))).thenAnswer(i -> {
            Person p = i.getArgument(0);
            p.setId(UUID.randomUUID());
            return p;
        });
        when(playerRepository.existsBySlug(anyString())).thenReturn(false);
        when(playerRepository.save(any(Player.class))).thenAnswer(i -> {
            Player pl = i.getArgument(0);
            pl.setId(UUID.randomUUID());
            return pl;
        });

        playerBatchHelper.savePlayerInNewTransaction(row, team);

        ArgumentCaptor<Person> personCaptor = ArgumentCaptor.forClass(Person.class);
        verify(personRepository).save(personCaptor.capture());
        Person savedPerson = personCaptor.getValue();

        assertThat(savedPerson.getRecordVerificationStatus()).isEqualTo("UNVERIFIED");
        assertThat(savedPerson.getGender()).isEqualTo("MALE");
        assertThat(savedPerson.getEmail()).isEqualTo("person.b@example.com");
    }
}
