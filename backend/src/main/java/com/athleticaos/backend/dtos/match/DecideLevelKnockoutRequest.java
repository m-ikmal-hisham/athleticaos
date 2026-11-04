package com.athleticaos.backend.dtos.match;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DecideLevelKnockoutRequest {

    @NotNull(message = "Method is required")
    private String method; // FIRST_TRY, EXTRA_TIME, DROP_KICKS, COIN_TOSS

    @NotNull(message = "Winner team ID is required")
    private UUID winnerTeamId;

    private Integer dropKicksHome;
    private Integer dropKicksAway;
}

