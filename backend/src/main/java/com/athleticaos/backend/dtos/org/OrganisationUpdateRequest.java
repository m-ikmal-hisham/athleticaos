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
    private String state;
    private String status;
    private com.athleticaos.backend.enums.OrganisationLevel orgLevel;
    private String primaryColor;
    private String secondaryColor;
    private String tertiaryColor;
    private String quaternaryColor;
    private String logoUrl;
}
