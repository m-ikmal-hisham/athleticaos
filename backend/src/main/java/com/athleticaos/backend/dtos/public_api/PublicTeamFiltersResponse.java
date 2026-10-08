package com.athleticaos.backend.dtos.public_api;

import java.util.List;

/** Dropdown options for the public teams directory. */
public record PublicTeamFiltersResponse(List<String> states, List<String> categories) {
}
