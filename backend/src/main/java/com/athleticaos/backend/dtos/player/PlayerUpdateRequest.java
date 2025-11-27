package com.athleticaos.backend.dtos.player;

import jakarta.validation.constraints.Email;

public record PlayerUpdateRequest(
        String firstName,
        String lastName,

        @Email(message = "Invalid email format") String email,

        String status // ACTIVE or INACTIVE
) {
}
