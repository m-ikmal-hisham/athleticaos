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
public class OrganisationResponse {
    private UUID id;
    private String name;
    private String slug;
    private String type; // Renamed from orgType for frontend compatibility
    private UUID parentOrgId;
    private String parentOrganisationName; // Derived field
    private String primaryColor;
    private String secondaryColor;
    private String tertiaryColor;
    private String quaternaryColor;
    private String logoUrl;
    private String accentColor;
    private String coverImageUrl;
    private String state;
    private String addressLine1;
    private String addressLine2;
    private String postcode;
    private String city;
    private String stateCode;
    private String countryCode;
    private String status;
    private com.athleticaos.backend.enums.OrganisationLevel orgLevel;
}
