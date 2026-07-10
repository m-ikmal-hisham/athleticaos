package com.athleticaos.backend.dtos.public_api;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.util.UUID;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class PublicTournamentSummaryResponse {
    private UUID id;
    private String name;
    private String slug;
    private String level;
    private String seasonName;
    private LocalDate startDate;
    private LocalDate endDate;
    private String venue;
    private boolean isLive;
    private boolean isCompleted;
    private String organiserName;
    private PublicOrganisationBranding organiserBranding;
    private String competitionType;
    private String logoUrl;
    private String livestreamUrl;
}
