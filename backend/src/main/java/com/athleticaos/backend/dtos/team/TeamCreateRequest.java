package com.athleticaos.backend.dtos.team;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TeamCreateRequest {
    @NotNull(message = "Organisation ID is required")
    private UUID organisationId;

    @NotBlank(message = "Name is required")
    private String name;

    private String shortName; // Optional, max 5 chars handled by entity/db or validation if needed

    @NotBlank(message = "Category is required")
    private String category;

    @NotBlank(message = "Age group is required")
    private String ageGroup;

    private String division; // Optional

    private String state; // Optional

    private String logoUrl;
}
