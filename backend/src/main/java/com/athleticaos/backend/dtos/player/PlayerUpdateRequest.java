package com.athleticaos.backend.dtos.player;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Email;

import java.time.LocalDate;

public record PlayerUpdateRequest(
        // Person (PII) fields
        String firstName,
        String lastName,
        String gender,
        @JsonFormat(pattern = "yyyy-MM-dd") LocalDate dob,
        // icOrPassport: null = leave existing value unchanged; non-blank = validate and replace
        String icOrPassport,
        // identificationType: MALAYSIAN_IC | PASSPORT | OTHER (canonical Phase 1 values)
        String identificationType,
        String nationality,

        @Email(message = "Invalid email format") String email,

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
        String status, // ACTIVE, INACTIVE, BANNED

        String dominantHand,
        String dominantLeg,
        Integer heightCm,
        Integer weightKg,
        String photoUrl,
        Boolean confirmPossibleDuplicate) {

    public PlayerUpdateRequest(
            String firstName, String lastName, String gender, LocalDate dob,
            String icOrPassport, String identificationType, String nationality,
            String email, String phone, String addressLine1, String addressLine2,
            String postcode, String city, String state, String country,
            String address, String status, String dominantHand,
            String dominantLeg, Integer heightCm, Integer weightKg, String photoUrl) {
        this(firstName, lastName, gender, dob, icOrPassport, identificationType,
                nationality, email, phone, addressLine1, addressLine2, postcode,
                city, state, country, address, status, dominantHand,
                dominantLeg, heightCm, weightKg, photoUrl, null);
    }
}
