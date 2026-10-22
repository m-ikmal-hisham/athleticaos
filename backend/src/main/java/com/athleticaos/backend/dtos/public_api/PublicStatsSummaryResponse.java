package com.athleticaos.backend.dtos.public_api;

public record PublicStatsSummaryResponse(
        long tournaments,
        long teams,
        long players,
        long matchesPlayed
) {}
