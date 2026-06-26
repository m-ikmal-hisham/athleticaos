package com.athleticaos.backend.dtos.player;

import java.util.List;
import java.util.UUID;

public record PlayerRowResult(
    int index,
    String status, // SUCCESS, ERROR
    UUID playerId,
    List<String> errors
) {}
