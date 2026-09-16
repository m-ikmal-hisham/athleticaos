package com.athleticaos.backend.dtos.person;

import java.util.Collections;
import java.util.List;

public record PossibleDuplicateCheck(
        List<PossibleDuplicateMatch> visibleMatches,
        int otherOrganisationMatches
) {
    public PossibleDuplicateCheck {
        if (visibleMatches == null) {
            visibleMatches = Collections.emptyList();
        }
    }

    public boolean hasMatches() {
        return !visibleMatches.isEmpty() || otherOrganisationMatches > 0;
    }

    public int totalMatches() {
        return visibleMatches.size() + otherOrganisationMatches;
    }
}
