package com.athleticaos.backend.dtos.season;

import com.athleticaos.backend.enums.SeasonLevel;
import com.athleticaos.backend.enums.SeasonStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeasonResponse {
    private UUID id;
    private String name;
    private String code;
    private LocalDate startDate;
    private LocalDate endDate;
    private String description;
    private SeasonLevel level;
    private SeasonStatus status;

    private OrganiserInfo organiser;

    private boolean deleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrganiserInfo {
        private UUID id;
        private String name;
    }
}
