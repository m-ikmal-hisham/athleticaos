package com.athleticaos.backend.dtos.player;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PlayerCreateRequest {
    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    @NotBlank(message = "Gender is required")
    private String gender;

    @NotNull(message = "Date of birth is required")
    private LocalDate dob;

    @NotBlank(message = "IC/Passport is required")
    private String icOrPassport;

    @NotBlank(message = "Nationality is required")
    private String nationality;

    private String email;
    private String phone;
    private String address;

    private String dominantHand;
    private String dominantLeg;
    private Integer heightCm;
    private Integer weightKg;
}
