package com.athleticaos.backend.dtos.player;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record PlayerCreateRequest(
        @NotBlank(message = "First name is required") String firstName,

        @NotBlank(message = "Last name is required") String lastName,

        @Email(message = "Invalid email format") @NotBlank(message = "Email is required") String email,

        String password // Optional, will use default if null
) {
}
