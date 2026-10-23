package com.athleticaos.backend.dtos.tournament;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TournamentFeaturedRequest {

    @NotNull(message = "Featured status is required")
    private Boolean featured;

    private Integer featuredOrder;
}
