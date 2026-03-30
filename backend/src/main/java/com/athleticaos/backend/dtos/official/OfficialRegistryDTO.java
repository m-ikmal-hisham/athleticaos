package com.athleticaos.backend.dtos.official;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfficialRegistryDTO {
    private UUID id;
    private UUID userId;
    private UUID personId;
    private String firstName;
    private String lastName;
    private String accreditationLevel;
    private String primaryRole;
    private String badgeNumber;
    private boolean isActive;
    private UUID organisationId;
    private String organisationName;
    private boolean isWorldRugbyCertified;
}
