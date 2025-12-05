package com.athleticaos.backend.dtos.tournament;

import com.athleticaos.backend.enums.CompetitionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TournamentCreateRequest {
    @NotNull(message = "Organiser Org ID is required")
    private UUID organiserOrgId;

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Level is required")
    private String level;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    @NotBlank(message = "Venue is required")
    private String venue;

    // Phase C: Competition Management
    private UUID seasonId;
    private CompetitionType competitionType;
}
