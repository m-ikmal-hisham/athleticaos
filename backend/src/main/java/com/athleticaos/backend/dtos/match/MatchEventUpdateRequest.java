package com.athleticaos.backend.dtos.match;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchEventUpdateRequest {

    @Min(value = 0, message = "Minute cannot be negative")
    @Max(value = 200, message = "Minute cannot exceed 200")
    private Integer minute;

    private String notes;
}
