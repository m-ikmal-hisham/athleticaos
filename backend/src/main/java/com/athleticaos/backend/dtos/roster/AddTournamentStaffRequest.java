package com.athleticaos.backend.dtos.roster;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AddTournamentStaffRequest {
    private UUID teamId;
    
    @NotNull(message = "Person ID is required")
    private UUID personId;
    
    @NotNull(message = "Staff Role ID is required")
    private Integer staffRoleId;
}
