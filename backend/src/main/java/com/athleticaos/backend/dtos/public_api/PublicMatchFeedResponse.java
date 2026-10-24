package com.athleticaos.backend.dtos.public_api;

import java.time.LocalDateTime;
import java.util.List;

public record PublicMatchFeedResponse(
        List<PublicMatchFeedItemResponse> items,
        int page,
        int size,
        long totalItems,
        int totalPages,
        boolean hasNext,
        PublicMatchFeedCounts counts,
        LocalDateTime lastUpdated
) {
}
