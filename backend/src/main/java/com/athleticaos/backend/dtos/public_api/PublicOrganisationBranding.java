package com.athleticaos.backend.dtos.public_api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicOrganisationBranding {
    private String primaryColor;
    private String secondaryColor;
    private String accentColor;
    private String logoUrl;
    private String coverImageUrl;
}
