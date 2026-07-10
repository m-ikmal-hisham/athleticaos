package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.player.PlayerRowDTO;
import com.athleticaos.backend.entities.OrganisationPerson;
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.entities.PlayerTeam;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.repositories.OrganisationPersonRepository;
import com.athleticaos.backend.repositories.PersonRepository;
import com.athleticaos.backend.repositories.PlayerRepository;
import com.athleticaos.backend.repositories.PlayerTeamRepository;
import com.athleticaos.backend.services.PlayerBatchHelper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PlayerBatchHelperImpl implements PlayerBatchHelper {

    private final PersonRepository personRepository;
    private final PlayerRepository playerRepository;
    private final PlayerTeamRepository playerTeamRepository;
    private final OrganisationPersonRepository organisationPersonRepository;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public UUID savePlayerInNewTransaction(PlayerRowDTO row, Team team) {
        log.info("Saving player {} {} in new transaction for team {}", row.firstName(), row.lastName(), team.getId());

        // 1. Normalize IC
        String normalizedIc = row.icOrPassport().trim().toUpperCase().replaceAll("[^A-Z0-9]", "");

        // 2. Create Person record
        Person person = Person.builder()
                .firstName(row.firstName().trim())
                .lastName(row.lastName().trim())
                .gender(row.gender().trim().toUpperCase())
                .dob(row.dob())
                .icOrPassport(normalizedIc)
                .nationality(row.nationality().trim())
                .email(row.email() != null && !row.email().trim().isEmpty() ? row.email().trim().toLowerCase() : null)
                .state(row.state() != null ? row.state().trim() : null)
                .isStaff(false)
                .build();

        if (person == null) {
            throw new IllegalStateException("Person cannot be null");
        }
        person = personRepository.save(person);

        // 3. Generate Slug
        String name = person.getFirstName() + " " + person.getLastName();
        String slug = com.athleticaos.backend.utils.SlugGenerator.generateUniqueSlug(name,
                playerRepository::existsBySlug);

        // 4. Create Player record
        Player player = Player.builder()
                .person(person)
                .slug(slug)
                .status("ACTIVE")
                .build();

        if (player == null) {
            throw new IllegalStateException("Player cannot be null");
        }
        player = playerRepository.save(player);

        // 5. Assign to Team
        PlayerTeam playerTeam = PlayerTeam.builder()
                .player(player)
                .team(team)
                .isActive(true)
                .joinedDate(LocalDate.now())
                .build();

        if (playerTeam == null) {
            throw new IllegalStateException("PlayerTeam cannot be null");
        }
        playerTeamRepository.save(playerTeam);

        // 6. Link Person to Organisation
        if (team.getOrganisation() != null) {
            if (!organisationPersonRepository.existsByOrganisationIdAndPersonId(team.getOrganisation().getId(), person.getId())) {
                OrganisationPerson op = OrganisationPerson.builder()
                        .organisation(team.getOrganisation())
                        .person(person)
                        .build();
                if (op == null) {
                    throw new IllegalStateException("OrganisationPerson cannot be null");
                }
                organisationPersonRepository.save(op);
            }
        }

        return player.getId();
    }
}
