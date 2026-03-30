package com.athleticaos.backend.dtos.official;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssignOfficialRequest {
    @NotNull(message = "Official ID is required")
    private UUID officialId;

    private Integer officialRoleId;

    private String assignedRole; // Fallback string role if officialRoleId not provided
}
