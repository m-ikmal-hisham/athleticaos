package com.athleticaos.backend.dtos.team;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamUpdateRequest {
    private String name;
    private String category;
    private String ageGroup;
    private String division;
    private String state;
    private String status;
}
