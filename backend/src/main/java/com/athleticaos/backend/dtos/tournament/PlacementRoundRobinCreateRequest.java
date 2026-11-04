package com.athleticaos.backend.dtos.tournament;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlacementRoundRobinCreateRequest {
    @NotBlank(message = "Name is required")
    private String name;

    @NotNull(message = "First place is required")
    @Min(value = 1, message = "First place must be at least 1")
    private Integer firstPlace;

    @NotNull(message = "Team count is required")
    @Min(value = 3, message = "Placement round robin requires at least 3 teams")
    @Max(value = 6, message = "Placement round robin supports up to 6 teams")
    private Integer teamCount;

    private UUID categoryId;

    @NotNull(message = "Slots are required")
    private List<SlotSource> slots;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SlotSource {
        private UUID teamId;
        private String placeholder;
    }
}

