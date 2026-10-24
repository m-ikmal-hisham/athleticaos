package com.athleticaos.backend.dtos.public_api;

public record PublicMatchFeedCounts(
        long live,
        long today,
        long results,
        long upcoming
) {
}
