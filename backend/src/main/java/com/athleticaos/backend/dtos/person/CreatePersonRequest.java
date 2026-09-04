package com.athleticaos.backend.dtos.person;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePersonRequest {
    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    private String icOrPassport;

    // identificationType: MALAYSIAN_IC | PASSPORT | OTHER (canonical Phase 1 values)
    private String identificationType;

    @NotNull(message = "Date of birth is required")
    private LocalDate dob;

    @NotBlank(message = "Gender is required")
    private String gender;

    private String nationality;

    @Email(message = "Invalid email format")
    private String email;
    private String phone;
    private String nationalPlayerStatus;
    private Boolean isPlayer;
    private Boolean isOfficial;
    private Boolean isStaff;
}
