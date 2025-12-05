package com.athleticaos.backend.config;

import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.enums.OrganisationLevel;
import com.athleticaos.backend.repositories.OrganisationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class OrganisationSeedConfig {

    private final OrganisationRepository organisationRepository;

    @Bean
    public CommandLineRunner seedOrganisations() {
        return args -> {
            List<Organisation> countries = organisationRepository.findByOrgLevel(OrganisationLevel.COUNTRY);
            if (!countries.isEmpty()) {
                log.info("Organisations already seeded.");
                return;
            }

            log.info("Seeding Malaysia hierarchy...");

            // Country
            Organisation malaysia = Organisation.builder()
                    .name("Malaysia")
                    .orgType("UNION")
                    .orgLevel(OrganisationLevel.COUNTRY)
                    .status("Active")
                    .build();
            malaysia = organisationRepository.save(malaysia);

            // States
            String[] states = { "Sarawak", "Sabah", "Johor", "Selangor", "Kuala Lumpur", "Penang", "Perak", "Kedah",
                    "Perlis", "Kelantan", "Terengganu", "Pahang", "Negeri Sembilan", "Melaka", "Putrajaya", "Labuan" };

            Organisation sarawak = null;

            for (String stateName : states) {
                Organisation state = Organisation.builder()
                        .name(stateName)
                        .orgType("STATE_UNION")
                        .orgLevel(OrganisationLevel.STATE)
                        .parentOrg(malaysia)
                        .status("Active")
                        .build();
                state = organisationRepository.save(state);

                if (stateName.equals("Sarawak")) {
                    sarawak = state;
                }
            }

            if (sarawak != null) {
                // Division
                Organisation mukahDiv = Organisation.builder()
                        .name("Mukah Division")
                        .orgType("DIVISION")
                        .orgLevel(OrganisationLevel.DIVISION)
                        .parentOrg(sarawak)
                        .status("Active")
                        .build();
                mukahDiv = organisationRepository.save(mukahDiv);

                // District
                Organisation mukahDist = Organisation.builder()
                        .name("Mukah District")
                        .orgType("DISTRICT")
                        .orgLevel(OrganisationLevel.DISTRICT)
                        .parentOrg(mukahDiv)
                        .status("Active")
                        .build();
                mukahDist = organisationRepository.save(mukahDist);

                // Club
                Organisation club = Organisation.builder()
                        .name("Mukah Rugby Club")
                        .orgType("CLUB")
                        .orgLevel(OrganisationLevel.CLUB)
                        .parentOrg(mukahDist)
                        .status("Active")
                        .build();
                organisationRepository.save(club);

                // School
                Organisation school = Organisation.builder()
                        .name("SMK Mukah Rugby")
                        .orgType("SCHOOL")
                        .orgLevel(OrganisationLevel.SCHOOL)
                        .parentOrg(mukahDist)
                        .status("Active")
                        .build();
                organisationRepository.save(school);
            }
        };
    }
}
