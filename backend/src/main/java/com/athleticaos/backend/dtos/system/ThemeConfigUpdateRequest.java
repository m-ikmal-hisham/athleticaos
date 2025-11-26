package com.athleticaos.backend.dtos.system;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ThemeConfigUpdateRequest {
    @NotNull(message = "Organisation ID is required")
    private UUID organisationId;
    private String primaryColor;
    private String secondaryColor;
    private String logoUrl;
}
