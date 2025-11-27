package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.user.PlayerResponse;
import com.athleticaos.backend.dtos.player.PlayerCreateRequest;
import com.athleticaos.backend.dtos.player.PlayerUpdateRequest;

import java.util.List;
import java.util.UUID;

public interface PlayerService {
    List<PlayerResponse> getAllPlayers();

    PlayerResponse createPlayer(PlayerCreateRequest request);

    PlayerResponse updatePlayer(UUID id, PlayerUpdateRequest request);

    PlayerResponse toggleStatus(UUID id);
}
