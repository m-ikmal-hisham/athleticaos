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
                String icOrPassport,
                String nationality,

                @Email(message = "Invalid email format") String email,

                String phone,
                String address,

                // Player (Rugby-specific) fields
                String status, // ACTIVE, INACTIVE, BANNED

                String dominantHand,
                String dominantLeg,
                Integer heightCm,
                Integer weightKg) {
}
