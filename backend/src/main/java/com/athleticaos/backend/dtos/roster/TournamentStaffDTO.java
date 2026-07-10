package com.athleticaos.backend.dtos.roster;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TournamentStaffDTO {
    private UUID id;
    private UUID personId;
    private String firstName;
    private String lastName;
    private Integer staffRoleId;
    private String staffRoleName;
    private String staffRoleDescription;
    @JsonProperty("isActive")
    private boolean isActive;
}
