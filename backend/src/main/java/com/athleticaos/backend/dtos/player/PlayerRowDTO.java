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
    @NotBlank(message = "Nationality is required") String nationality,
    @NotBlank(message = "Email is required") @Email(message = "Invalid email format") String email,
    String state,
    String medicalNotes,
    Boolean confirmPossibleDuplicate
) {
    public PlayerRowDTO(
            String firstName, String lastName, String gender, LocalDate dob,
            String nationality, String email, String state, String medicalNotes) {
        this(firstName, lastName, gender, dob, nationality, email, state, medicalNotes, null);
    }
}
