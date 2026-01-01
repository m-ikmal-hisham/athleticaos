package com.athleticaos.backend.dtos.federation;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;

@Data
public class SanctioningCreateRequest {
    @NotNull
    private UUID tournamentId;

    @NotNull
    private UUID approverOrgId; // The parent org (Union) being asked to sanction

    private String notes;
}
