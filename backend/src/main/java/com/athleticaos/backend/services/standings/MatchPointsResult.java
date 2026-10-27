package com.athleticaos.backend.services.standings;

public record MatchPointsResult(
        TeamMatchPoints home,
        TeamMatchPoints away
) {
}
