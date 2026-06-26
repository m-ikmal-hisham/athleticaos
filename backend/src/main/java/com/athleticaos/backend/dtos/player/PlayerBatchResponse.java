package com.athleticaos.backend.dtos.player;

import java.util.List;

public record PlayerBatchResponse(
    int successCount,
    int failCount,
    List<PlayerRowResult> results
) {}
