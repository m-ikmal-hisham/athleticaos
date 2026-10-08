package com.athleticaos.backend.dtos.org;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OrganisationOptionDTO {
    private UUID id;
    private String name;
    private String orgType;
    private UUID parentOrgId;
}
