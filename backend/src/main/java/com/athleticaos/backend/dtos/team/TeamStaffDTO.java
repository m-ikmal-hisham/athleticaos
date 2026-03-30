package com.athleticaos.backend.dtos.team;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamStaffDTO {
    private UUID id;
    private UUID personId;
    private String firstName;
    private String lastName;
    private Integer staffRoleId;
    private String staffRoleName;
    private String staffRoleDescription;
    private LocalDate joinedAt;
    private boolean isWorldRugbyCertified;
}
