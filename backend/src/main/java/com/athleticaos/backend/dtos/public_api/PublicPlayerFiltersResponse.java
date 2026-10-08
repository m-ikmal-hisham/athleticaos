package com.athleticaos.backend.dtos.public_api;

import java.util.List;

/** Dropdown options for the public players directory. */
public record PublicPlayerFiltersResponse(List<String> states, List<String> positions) {
}
