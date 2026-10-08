package com.athleticaos.backend.dtos.public_api;

import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

/**
 * Page envelope for public directory endpoints (players, teams).
 * {@code page} is 0-based; {@code hasNext} is false on the last page and on pages past the end.
 */
public record PublicPageResponse<T>(
        List<T> items,
        int page,
        int size,
        long totalItems,
        int totalPages,
        boolean hasNext) {

    public static <E, T> PublicPageResponse<T> of(Page<E> source, Function<List<E>, List<T>> mapper) {
        return new PublicPageResponse<>(
                mapper.apply(source.getContent()),
                source.getNumber(),
                source.getSize(),
                source.getTotalElements(),
                source.getTotalPages(),
                source.hasNext());
    }
}
