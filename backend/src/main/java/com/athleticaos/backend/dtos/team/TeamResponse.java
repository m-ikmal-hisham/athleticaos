package com.athleticaos.backend.dtos.team;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TeamResponse {
    private UUID id;
    private UUID organisationId;
    private String name;
    private String category;
    private String ageGroup;
}
