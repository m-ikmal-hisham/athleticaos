package com.athleticaos.backend.dtos.playerteam;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PlayerInTeamDTO {
    private UUID playerId;
    private String firstName;
    private String lastName;
    private String email;
    private Integer jerseyNumber;
    private String position;
    private String status;
    private LocalDate joinedDate;
    private Boolean isActive;
}
