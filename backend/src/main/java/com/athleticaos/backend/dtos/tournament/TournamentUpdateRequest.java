package com.athleticaos.backend.dtos.tournament;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TournamentUpdateRequest {
    @NotBlank(message = "Name is required")
    private String name;

    private String level;

    private UUID organiserOrgId;

    private UUID seasonId;
    private String seasonName;

    private LocalDate startDate;

    private LocalDate endDate;

    private String venue;

    private Boolean isPublished;

    private String logoUrl;
    private String bannerUrl;
    private String backgroundUrl;
    private String livestreamUrl;

    private List<CreateCategoryRequest> categories;
}
