package com.athleticaos.backend.dtos.person;

import com.athleticaos.backend.exceptions.ErrorResponse;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class PossibleDuplicateErrorResponse extends ErrorResponse {

    private List<PossibleDuplicateMatch> matches;
    private int otherOrganisationMatches;

    public PossibleDuplicateErrorResponse(
            int status,
            String error,
            String message,
            String details,
            String errorCode,
            String path,
            LocalDateTime timestamp,
            List<PossibleDuplicateMatch> matches,
            int otherOrganisationMatches) {
        super(status, error, message, details, errorCode, path, timestamp);
        this.matches = matches;
        this.otherOrganisationMatches = otherOrganisationMatches;
    }
}
