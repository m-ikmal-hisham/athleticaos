package com.athleticaos.backend.dtos.player;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import lombok.Builder;

@Builder
public record PlayerResponse(
                // Player ID
                UUID id,

                // Person (PII) fields
                UUID personId,
                String slug,
                String firstName,
                String lastName,
                String gender,
                LocalDate dob,
                // Identification — raw value NOT exposed in responses (Phase 1 containment)
                boolean identificationPresent,
                String identificationType,
                String identificationDisplay, // "PRESENT" when an IC/passport is stored, null otherwise
                String nationality,
                String email,
                String phone,
                // Structured Address
                String addressLine1,
                String addressLine2,
                String postcode,
                String city,
                String state,
                String country,

                @Deprecated String address,

                // Player (Rugby-specific) fields
                String status,
                String dominantHand,
                String dominantLeg,
                Integer heightCm,
                Integer weightKg,
                String photoUrl,

                // Organisation fields (from current team assignment)
                UUID organisationId,
                String organisationName,
                java.util.List<String> teamNames,

                LocalDateTime createdAt) {
}
