package com.athleticaos.backend.dtos.system;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ThemeConfigResponse {
    private UUID id;
    private UUID organisationId;
    private String primaryColor;
    private String secondaryColor;
    private String logoUrl;
}
