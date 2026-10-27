package com.athleticaos.backend.config;

import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.enums.OrganisationLevel;
import com.athleticaos.backend.repositories.OrganisationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.athleticaos.backend.utils.SlugGenerator;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class OrganisationSeedConfig {

    private final OrganisationRepository organisationRepository;

    @Bean
    @SuppressWarnings("null")
    public CommandLineRunner seedOrganisations() {
        return args -> {
            List<Organisation> countries = organisationRepository.findByOrgLevel(OrganisationLevel.COUNTRY);
            if (!countries.isEmpty()) {
                log.info("Organisations already seeded.");
                return;
            }

            log.info("Seeding Malaysia hierarchy...");
            Set<String> usedSlugs = new HashSet<>();

            // Country
            Organisation malaysia = Organisation.builder()
                    .name("Malaysia")
                    .slug(generateUniqueSlug("Malaysia", null, usedSlugs))
                    .orgType("UNION")
                    .orgLevel(OrganisationLevel.COUNTRY)
                    .status("Active")
                    .build();
            malaysia = organisationRepository.save(malaysia);

            // States
            String[] states = { "Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang", "Penang", "Perak",
                    "Perlis", "Sabah", "Sarawak", "Selangor", "Terengganu", "Kuala Lumpur", "Labuan", "Putrajaya" };

            Organisation sarawak = null;

            for (String stateName : states) {
                Organisation state = Organisation.builder()
                        .name(stateName)
                        .slug(generateUniqueSlug(stateName, null, usedSlugs))
                        .orgType("STATE_UNION")
                        .orgLevel(OrganisationLevel.STATE)
                        .parentOrg(malaysia)
                        .state(stateName)
                        .stateCode(getCodeForState(stateName))
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
                        .slug(generateUniqueSlug("Mukah Division", null, usedSlugs))
                        .orgType("DIVISION")
                        .orgLevel(OrganisationLevel.DIVISION)
                        .parentOrg(sarawak)
                        .status("Active")
                        .build();
                mukahDiv = organisationRepository.save(mukahDiv);

                // District
                Organisation mukahDist = Organisation.builder()
                        .name("Mukah District")
                        .slug(generateUniqueSlug("Mukah District", null, usedSlugs))
                        .orgType("DISTRICT")
                        .orgLevel(OrganisationLevel.DISTRICT)
                        .parentOrg(mukahDiv)
                        .status("Active")
                        .build();
                mukahDist = organisationRepository.save(mukahDist);

                // Club
                Organisation club = Organisation.builder()
                        .name("Mukah Rugby Club")
                        .slug(generateUniqueSlug("Mukah Rugby Club", null, usedSlugs))
                        .orgType("CLUB")
                        .orgLevel(OrganisationLevel.CLUB)
                        .parentOrg(mukahDist)
                        .status("Active")
                        .build();
                organisationRepository.save(club);

                // School
                Organisation school = Organisation.builder()
                        .name("SMK Mukah Rugby")
                        .slug(generateUniqueSlug("SMK Mukah Rugby", null, usedSlugs))
                        .orgType("SCHOOL")
                        .orgLevel(OrganisationLevel.SCHOOL)
                        .parentOrg(mukahDist)
                        .status("Active")
                        .build();
                organisationRepository.save(school);
            }
        };
    }

    String generateUniqueSlug(String name, UUID id, Set<String> usedSlugs) {
        String baseSlug = "";
        try {
            if (name != null && !name.trim().isEmpty()) {
                baseSlug = SlugGenerator.generateSlug(name);
            }
        } catch (IllegalArgumentException ignored) {
            baseSlug = "";
        }

        if (baseSlug.isEmpty()) {
            if (id != null) {
                baseSlug = "org-" + id.toString().substring(0, Math.min(8, id.toString().length()));
            } else {
                baseSlug = "org";
            }
        }

        String slug = baseSlug;
        int counter = 1;
        while (usedSlugs.contains(slug) || organisationRepository.findBySlug(slug).isPresent()) {
            slug = baseSlug + "-" + counter++;
        }
        usedSlugs.add(slug);
        return slug;
    }

    private String getCodeForState(String name) {
        return switch (name) {
            case "Johor" -> "MY-01";
            case "Kedah" -> "MY-02";
            case "Kelantan" -> "MY-03";
            case "Melaka" -> "MY-04";
            case "Negeri Sembilan" -> "MY-05";
            case "Pahang" -> "MY-06";
            case "Penang" -> "MY-07";
            case "Perak" -> "MY-08";
            case "Perlis" -> "MY-09";
            case "Selangor" -> "MY-10";
            case "Terengganu" -> "MY-11";
            case "Sabah" -> "MY-12";
            case "Sarawak" -> "MY-13";
            case "Kuala Lumpur" -> "MY-14";
            case "Labuan" -> "MY-15";
            case "Putrajaya" -> "MY-16";
            default -> null;
        };
    }
}
