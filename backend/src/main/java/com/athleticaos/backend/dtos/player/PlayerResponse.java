package com.athleticaos.backend.dtos.player;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import lombok.Builder;

@Builder
public record PlayerResponse(
                // Player ID
                UUID id,

                // Person (PII) fields
                UUID personId,
                String firstName,
                String lastName,
                String gender,
                LocalDate dob,
                String icOrPassport, // Full value for updates (not masked for now)
                String nationality,
                String email,
                String phone,
                String address,

                // Player (Rugby-specific) fields
                String status,
                String dominantHand,
                String dominantLeg,
                Integer heightCm,
                Integer weightKg,

                LocalDateTime createdAt) {
}
