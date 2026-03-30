package com.athleticaos.backend.dtos.official;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegisterOfficialRequest {
    private UUID userId;
    
    private UUID personId;
    
    private UUID organisationId;

    @NotNull(message = "Accreditation level is required")
    private String accreditationLevel;

    @NotNull(message = "Primary role is required")
    private String primaryRole;

    @NotNull(message = "Badge number is required")
    private String badgeNumber;

    private String expiryDate; // ISO date-time string

    private boolean isWorldRugbyCertified;
}
