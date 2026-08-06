package com.athleticaos.backend.dtos.roster;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddPlayersToRosterRequest {

    @NotEmpty(message = "Player IDs list cannot be empty")
    private List<UUID> playerIds;

    /**
     * Optional tournament jersey number per player, keyed by player id. Anyone omitted keeps
     * inheriting their club number, so this can be left empty entirely.
     */
    private Map<UUID, Integer> jerseyNumbers;
}
