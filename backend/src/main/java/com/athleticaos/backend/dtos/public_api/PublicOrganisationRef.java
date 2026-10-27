package com.athleticaos.backend.dtos.public_api;

import com.athleticaos.backend.enums.OrganisationLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PublicOrganisationRef {
    private UUID id;
    private String slug;
    private String name;
    private OrganisationLevel level;
    private String logoUrl;
    private String primaryColor;
    private String secondaryColor;
}
