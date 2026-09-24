package com.athleticaos.backend.dtos.tournament;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateVenueRequest {
    @NotBlank(message = "Venue name is required")
    private String name;

    private String shortName;

    private Integer displayOrder;
}
