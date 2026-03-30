package com.athleticaos.backend.dtos.official;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchOfficialDTO {
    private UUID id;
    private UUID officialId;
    private String officialName;
    private String assignedRole;
    private Integer officialRoleId;
    private String officialRoleName;
    @JsonProperty("isConfirmed")
    private boolean isConfirmed;
}
