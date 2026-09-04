package com.athleticaos.backend.dtos.player;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import java.time.LocalDate;

public record PlayerRowDTO(
    @NotBlank(message = "First name is required") String firstName,
    @NotBlank(message = "Last name is required") String lastName,
    @NotBlank(message = "Gender is required") String gender,
    @NotNull(message = "Date of birth is required") @Past(message = "Date of birth must be in the past") LocalDate dob,
    @NotBlank(message = "Identification type is required") String identificationType, // MALAYSIAN_IC | PASSPORT | OTHER
    @NotBlank(message = "IC or Passport is required") String icOrPassport,
    @NotBlank(message = "Nationality is required") String nationality,
    @Email(message = "Invalid email format") String email,
    String state,
    String medicalNotes
) {}
