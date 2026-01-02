package com.athleticaos.backend.dtos.roster;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlayerSuspensionDTO {
    private UUID id;
    private UUID tournamentId;
    private String tournamentName;
    private UUID teamId;
    private String teamName;
    private UUID matchId;
    private String matchLabel;
    private UUID playerId;
    private String playerName;
    private String reason;
    private int matchesRemaining;
    private boolean isActive;
    private LocalDateTime createdAt;
}
