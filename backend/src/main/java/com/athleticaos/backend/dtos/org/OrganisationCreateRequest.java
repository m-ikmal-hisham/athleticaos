package com.athleticaos.backend.dtos.org;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OrganisationCreateRequest {
    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Type is required")
    private String orgType;

    private UUID parentOrgId;
    private String primaryColor;
    private String secondaryColor;
    private String tertiaryColor;
    private String quaternaryColor;
    private String logoUrl;
    private String accentColor;
    private String coverImageUrl;
    private com.athleticaos.backend.enums.OrganisationLevel orgLevel;
}
