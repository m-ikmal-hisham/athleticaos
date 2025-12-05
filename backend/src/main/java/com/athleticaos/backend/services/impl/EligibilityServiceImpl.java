package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.roster.EligibilityResult;
import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.services.EligibilityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.Period;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class EligibilityServiceImpl implements EligibilityService {

    private static final Pattern AGE_GROUP_PATTERN = Pattern.compile("U(\\d+)", Pattern.CASE_INSENSITIVE);

    @Override
    public EligibilityResult checkPlayerEligibility(Tournament tournament, Player player) {
        // If not an age-grade tournament, player is eligible
        if (!tournament.isAgeGrade()) {
            return EligibilityResult.builder()
                    .eligible(true)
                    .reason("Open category")
                    .build();
        }

        // Check if player has a person record with DOB
        if (player.getPerson() == null || player.getPerson().getDob() == null) {
            return EligibilityResult.builder()
                    .eligible(false)
                    .reason("Missing date of birth for age-grade tournament")
                    .build();
        }

        // Parse age group label
        String ageGroupLabel = tournament.getAgeGroupLabel();
        if (ageGroupLabel == null || ageGroupLabel.trim().isEmpty()) {
            log.warn("Tournament {} is marked as age-grade but has no age group label", tournament.getId());
            return EligibilityResult.builder()
                    .eligible(true)
                    .reason("Age group not specified")
                    .build();
        }

        Integer ageLimit = parseAgeLimit(ageGroupLabel);
        if (ageLimit == null) {
            log.warn("Could not parse age limit from label: {}", ageGroupLabel);
            return EligibilityResult.builder()
                    .eligible(true)
                    .reason("Unable to parse age group: " + ageGroupLabel)
                    .build();
        }

        // Calculate player age at tournament start date
        LocalDate referenceDate = tournament.getStartDate() != null
                ? tournament.getStartDate()
                : LocalDate.now();

        LocalDate dob = player.getPerson().getDob();
        int playerAge = Period.between(dob, referenceDate).getYears();

        // Check if player is within age limit
        if (playerAge > ageLimit) {
            return EligibilityResult.builder()
                    .eligible(false)
                    .reason(String.format("Over age limit (Age: %d, Limit: U%d)", playerAge, ageLimit))
                    .build();
        }

        return EligibilityResult.builder()
                .eligible(true)
                .reason(String.format("Within age limit (Age: %d, Limit: U%d)", playerAge, ageLimit))
                .build();
    }

    /**
     * Parses age limit from age group label (e.g., "U18" -> 18, "Under 16" -> 16)
     */
    private Integer parseAgeLimit(String ageGroupLabel) {
        Matcher matcher = AGE_GROUP_PATTERN.matcher(ageGroupLabel);
        if (matcher.find()) {
            try {
                return Integer.parseInt(matcher.group(1));
            } catch (NumberFormatException e) {
                log.error("Failed to parse age from: {}", ageGroupLabel, e);
                return null;
            }
        }
        return null;
    }
}
