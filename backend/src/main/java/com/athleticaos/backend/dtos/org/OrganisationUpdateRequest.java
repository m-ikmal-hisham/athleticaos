package com.athleticaos.backend.dtos.org;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrganisationUpdateRequest {
    private String name;
    private String orgType;
    private String state;
    private String status;
    private String addressLine1;
    private String addressLine2;
    private String postcode;
    private String city;
    private String stateCode;
    private String countryCode;
    private com.athleticaos.backend.enums.OrganisationLevel orgLevel;
    private String primaryColor;
    private String secondaryColor;
    private String tertiaryColor;
    private String quaternaryColor;
    private String logoUrl;
    private String accentColor;
    private String coverImageUrl;
    private java.util.UUID parentOrgId;
    private java.util.List<java.util.UUID> teamIds;
}
