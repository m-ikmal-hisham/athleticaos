package com.athleticaos.backend.dtos.tournament;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TournamentCategoryDTO {
    private UUID id;
    private UUID tournamentId;
    private String name;
    private String description;
    private String gender;
    private Integer minAge;
    private Integer maxAge;
}
