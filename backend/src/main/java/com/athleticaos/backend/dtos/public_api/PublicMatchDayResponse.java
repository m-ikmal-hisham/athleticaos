package com.athleticaos.backend.dtos.public_api;

import java.time.LocalDate;

public record PublicMatchDayResponse(
        LocalDate date,
        long total,
        long live,
        long completed,
        long cancelled
) {
}
