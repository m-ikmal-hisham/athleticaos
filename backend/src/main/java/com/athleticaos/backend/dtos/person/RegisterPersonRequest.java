package com.athleticaos.backend.dtos.person;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;

@Data
public class RegisterPersonRequest {
    @NotBlank(message = "First name is required")
    private String firstName;
    
    @NotBlank(message = "Last name is required")
    private String lastName;
    
    @NotBlank(message = "IC or Passport is required")
    private String icOrPassport;
    
    @NotNull(message = "Date of birth is required")
    private LocalDate dob;
    
    @NotBlank(message = "Gender is required")
    private String gender;
    
    @NotBlank(message = "Nationality is required")
    private String nationality;
    
    private String nationalPlayerStatus;
}
