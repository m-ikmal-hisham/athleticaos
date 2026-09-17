package com.athleticaos.backend.dtos.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserCreateRequest {
    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    // Admin-set initial password; validated by PasswordPolicy. The user must change it at first sign-in.
    @NotBlank(message = "Password is required")
    @ToString.Exclude
    private String password;

    private String role; // e.g. "PLAYER"

    private String club; // Optional, for context
}
