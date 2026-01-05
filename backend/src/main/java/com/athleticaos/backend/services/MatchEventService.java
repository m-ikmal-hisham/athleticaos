package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.match.MatchEventCreateRequest;
import com.athleticaos.backend.dtos.match.MatchEventResponse;
import com.athleticaos.backend.dtos.match.MatchEventUpdateRequest;

import java.util.List;
import java.util.UUID;

public interface MatchEventService {
        List<MatchEventResponse> getEventsForMatch(UUID matchId);

        MatchEventResponse addEventToMatch(UUID matchId, MatchEventCreateRequest request,
                        jakarta.servlet.http.HttpServletRequest httpRequest);

        MatchEventResponse updateEvent(UUID eventId, MatchEventUpdateRequest request,
                        jakarta.servlet.http.HttpServletRequest httpRequest);

        UUID deleteEvent(UUID eventId, jakarta.servlet.http.HttpServletRequest httpRequest);
}
