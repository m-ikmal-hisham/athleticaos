package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.entities.*;
import com.athleticaos.backend.enums.OrganisationLevel;
import com.athleticaos.backend.repositories.*;
import com.athleticaos.backend.services.SeedingService;
import com.athleticaos.backend.utils.SlugGenerator;
import com.github.javafaker.Faker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class SeedingServiceImpl implements SeedingService {

    private final OrganisationRepository organisationRepository;
    private final TeamRepository teamRepository;
    private final PlayerRepository playerRepository;
    private final PersonRepository personRepository;
    private final PlayerTeamRepository playerTeamRepository;
    // Removed SlugGenerator injection

    private static final String[] STATES = {
            "Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan",
            "Pahang", "Penang", "Perak", "Perlis", "Sabah", "Sarawak",
            "Selangor", "Terengganu", "Wilayah Persekutuan Kuala Lumpur",
            "Wilayah Persekutuan Labuan", "Wilayah Persekutuan Putrajaya"
    };

    private static final Map<String, String> STATE_CODES = Map.ofEntries(
            Map.entry("Johor", "MY-01"),
            Map.entry("Kedah", "MY-02"),
            Map.entry("Kelantan", "MY-03"),
            Map.entry("Melaka", "MY-04"),
            Map.entry("Negeri Sembilan", "MY-05"),
            Map.entry("Pahang", "MY-06"),
            Map.entry("Penang", "MY-07"),
            Map.entry("Perak", "MY-08"),
            Map.entry("Perlis", "MY-09"),
            Map.entry("Selangor", "MY-10"),
            Map.entry("Terengganu", "MY-11"),
            Map.entry("Sabah", "MY-12"),
            Map.entry("Sarawak", "MY-13"),
            Map.entry("Wilayah Persekutuan Kuala Lumpur", "MY-14"),
            Map.entry("Wilayah Persekutuan Labuan", "MY-15"),
            Map.entry("Wilayah Persekutuan Putrajaya", "MY-16"));

    private final Faker faker = new Faker();

    @Override
    @Transactional
    public void seedPilotData() {
        log.info("Starting pilot data seeding...");

        for (String state : STATES) {
            // 1. Create/Find State Union Organisation
            String orgName = state + " Rugby";
            if (state.contains("Wilayah")) {
                orgName = state.replace("Wilayah Persekutuan ", "") + " Rugby";
            }

            // Correcting lambda variable name to avoid conflict
            final String searchName = orgName;
            Organisation org = organisationRepository.findAll().stream()
                    .filter(o -> o.getName().equalsIgnoreCase(searchName) || o.getName().contains(state))
                    .findFirst()
                    .orElseGet(() -> createStateUnion(state, searchName));

            // 2. Create/Find Men's Open Team
            String teamName = (state.contains("Wilayah") ? state.replace("Wilayah Persekutuan ", "") : state)
                    + " Men's Open";
            // Correcting lambda variable
            final String searchTeamName = teamName;
            Team team = teamRepository.findByOrganisationId(org.getId()).stream()
                    .filter(t -> t.getName().equalsIgnoreCase(searchTeamName))
                    .findFirst()
                    .orElseGet(() -> createTeam(org, searchTeamName));

            // 3. Ensure 40 Players
            long currentPlayers = playerTeamRepository.countByTeamId(team.getId());
            int needing = 40 - (int) currentPlayers;

            if (needing > 0) {
                log.info("Generating {} players for team {}", needing, team.getName());
                for (int i = 0; i < needing; i++) {
                    createAndAssignPlayer(team, org);
                }
            }
        }

        log.info("Pilot data seeding completed.");
    }

    @SuppressWarnings("null")
    private Organisation createStateUnion(String state, String name) {
        String slug = SlugGenerator.generateUniqueSlug(name, s -> organisationRepository.findBySlug(s).isPresent());
        Organisation org = Organisation.builder()
                .name(name)
                .slug(slug)
                .orgType("STATE_UNION")
                .orgLevel(OrganisationLevel.STATE)
                .state(state)
                .stateCode(STATE_CODES.getOrDefault(state, ""))
                .countryCode("MY")
                .status("Active")
                .build();
        return organisationRepository.save(org);
    }

    @SuppressWarnings("null")
    private Team createTeam(Organisation org, String name) {
        String slug = SlugGenerator.generateUniqueSlug(name, s -> teamRepository.findBySlug(s).isPresent());
        Team team = Team.builder()
                .organisation(org)
                .name(name)
                .slug(slug)
                .category("MEN")
                .ageGroup("SENIOR")
                .state(org.getState())
                .status("Active")
                .build();
        return teamRepository.save(team);
    }

    @SuppressWarnings("null")
    private void createAndAssignPlayer(Team team, Organisation org) {
        // Person
        String firstName = faker.name().firstName();
        String lastName = faker.name().lastName();
        Person person = Person.builder()
                .firstName(firstName)
                .lastName(lastName)
                .email(faker.internet().emailAddress(firstName.toLowerCase() + "." + lastName.toLowerCase()))
                .gender("MALE")
                .dob(LocalDate.of(1990 + faker.random().nextInt(15), 1 + faker.random().nextInt(11),
                        1 + faker.random().nextInt(27)))
                .nationality("Malaysia")
                .icOrPassport(faker.number().digits(12))
                .identificationType("IC")
                .identificationValue(faker.number().digits(12))
                .state(org.getState())
                .build();
        person = personRepository.save(person);

        // Player
        String slug = SlugGenerator.generateUniqueSlug(firstName + " " + lastName,
                s -> playerRepository.findBySlug(s).isPresent());
        Player player = Player.builder()
                .person(person)
                .slug(slug)
                .status("ACTIVE")
                .heightCm(160 + faker.random().nextInt(40))
                .weightKg(60 + faker.random().nextInt(60))
                .dominantHand(faker.random().nextBoolean() ? "RIGHT" : "LEFT")
                .dominantLeg(faker.random().nextBoolean() ? "RIGHT" : "LEFT")
                .deleted(false)
                .build();
        player = playerRepository.save(player);

        // Assign
        PlayerTeam pt = PlayerTeam.builder()
                .player(player)
                .team(team)
                .isActive(true)
                .joinedDate(LocalDate.now())
                .build();
        playerTeamRepository.save(pt);
    }

    @Override
    @Transactional
    public void seedLineups() {
        log.info("Starting lineup seeding (Jerseys & Positions)...");
        List<Team> teams = teamRepository.findAll();

        for (Team team : teams) {
            List<PlayerTeam> roster = playerTeamRepository.findByTeamIdAndIsActiveTrue(team.getId());
            if (roster.isEmpty())
                continue;

            // Sort by CreatedAt to be deterministic
            roster.sort(Comparator.comparing(PlayerTeam::getJoinedDate).thenComparing(PlayerTeam::getId));

            int jersey = 1;
            for (PlayerTeam pt : roster) {
                if (jersey > 40)
                    break; // Limit to 40

                pt.setJerseyNumber(jersey);
                pt.setPosition(getXVPosition(jersey));
                jersey++;
            }
            playerTeamRepository.saveAll(roster);
            log.info("Updated lineup for team: {}", team.getName());
        }
        log.info("Lineup seeding completed.");
    }

    private String getXVPosition(int jersey) {
        return switch (jersey) {
            case 1 -> "Loosehead Prop";
            case 2 -> "Hooker";
            case 3 -> "Tighthead Prop";
            case 4, 5 -> "Lock";
            case 6 -> "Blindside Flanker";
            case 7 -> "Openside Flanker";
            case 8 -> "Number 8";
            case 9 -> "Scrum Half";
            case 10 -> "Fly Half";
            case 11 -> "Left Wing";
            case 12 -> "Inside Centre";
            case 13 -> "Outside Centre";
            case 14 -> "Right Wing";
            case 15 -> "Fullback";
            case 16 -> "Reserve Hooker";
            case 17, 18 -> "Reserve Prop";
            case 19 -> "Reserve Lock";
            case 20 -> "Reserve Back Row";
            case 21 -> "Reserve Scrum Half";
            case 22 -> "Reserve Fly Half";
            case 23 -> "Reserve Outside Back";
            default -> "Utility / Extended Squad";
        };
    }
}
