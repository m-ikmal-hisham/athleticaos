package com.athleticaos.backend.dtos.player;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record PlayerCreateRequest(
        // Person (PII) fields
        @NotBlank(message = "First name is required") String firstName,

        @NotBlank(message = "Last name is required") String lastName,

        @NotBlank(message = "Gender is required") String gender, // MALE, FEMALE, OTHER

        @NotNull(message = "Date of birth is required") LocalDate dob,

        @NotBlank(message = "IC or Passport is required") String icOrPassport,

        @NotBlank(message = "Nationality is required") String nationality,

        @Email(message = "Invalid email format") @NotBlank(message = "Email is required") String email,

        String phone,

        String address,

        // Player (Rugby-specific) fields
        String status, // ACTIVE, INACTIVE, BANNED - defaults to ACTIVE if null

        String dominantHand, // LEFT, RIGHT, BOTH

        String dominantLeg, // LEFT, RIGHT, BOTH

        Integer heightCm,

        Integer weightKg) {
}
