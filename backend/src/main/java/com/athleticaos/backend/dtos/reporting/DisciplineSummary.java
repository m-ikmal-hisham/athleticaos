package com.athleticaos.backend.dtos.reporting;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DisciplineSummary {
    private String teamId;
    private String teamName;
    private int yellowCards;
    private int redCards;
    private int totalInfractions;
}
