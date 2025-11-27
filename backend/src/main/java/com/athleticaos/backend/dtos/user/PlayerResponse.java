package com.athleticaos.backend.dtos.user;

import java.util.UUID;

public record PlayerResponse(
        UUID id,
        String firstName,
        String lastName,
        String email,
        String role,
        String status,
        String clubName) {
}
