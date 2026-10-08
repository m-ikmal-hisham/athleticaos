package com.athleticaos.backend.dtos.team;

import java.util.List;
import java.util.UUID;

public record AdminTeamFiltersResponse(
        List<OrganisationOption> organisations,
        List<String> categories,
        List<String> ageGroups,
        List<String> states
) {
    public record OrganisationOption(UUID id, String name) {}
}
