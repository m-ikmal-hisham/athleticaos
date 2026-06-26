package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.player.PlayerRowDTO;
import com.athleticaos.backend.entities.Team;
import java.util.UUID;

public interface PlayerBatchHelper {
    UUID savePlayerInNewTransaction(PlayerRowDTO row, Team team);
}
