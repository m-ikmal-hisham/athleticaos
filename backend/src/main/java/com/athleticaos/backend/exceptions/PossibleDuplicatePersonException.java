package com.athleticaos.backend.exceptions;

import com.athleticaos.backend.dtos.person.PossibleDuplicateMatch;
import lombok.Getter;

import java.util.Collections;
import java.util.List;

@Getter
public class PossibleDuplicatePersonException extends RuntimeException {

    private final List<PossibleDuplicateMatch> matches;
    private final int otherOrganisationMatches;

    public PossibleDuplicatePersonException(List<PossibleDuplicateMatch> matches, int otherOrganisationMatches) {
        super("A person with the same name, date of birth and gender already exists.");
        this.matches = matches != null ? matches : Collections.emptyList();
        this.otherOrganisationMatches = otherOrganisationMatches;
    }
}
