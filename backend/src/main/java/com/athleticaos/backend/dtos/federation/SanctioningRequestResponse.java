package com.athleticaos.backend.dtos.federation;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class SanctioningRequestResponse {
    private UUID id;
    private UUID tournamentId;
    private String tournamentName;
    private UUID requesterOrgId;
    private String requesterOrgName;
    private UUID approverOrgId;
    private String approverOrgName;
    private String status;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
