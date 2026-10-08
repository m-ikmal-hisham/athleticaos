package com.athleticaos.backend.dtos.common;

import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

/**
 * Shared page envelope for directory endpoints.
 * {@code page} is 0-based; {@code hasNext} is false on the last page and on pages past the end.
 */
public record PageResponse<T>(
        List<T> items,
        int page,
        int size,
        long totalItems,
        int totalPages,
        boolean hasNext) {

    public static <E, T> PageResponse<T> of(Page<E> source, Function<List<E>, List<T>> mapper) {
        return new PageResponse<>(
                mapper.apply(source.getContent()),
                source.getNumber(),
                source.getSize(),
                source.getTotalElements(),
                source.getTotalPages(),
                source.hasNext());
    }
}
