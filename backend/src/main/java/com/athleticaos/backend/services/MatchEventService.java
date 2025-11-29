package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.match.MatchEventCreateRequest;
import com.athleticaos.backend.dtos.match.MatchEventResponse;

import java.util.List;
import java.util.UUID;

public interface MatchEventService {
    List<MatchEventResponse> getEventsForMatch(UUID matchId);

    MatchEventResponse addEventToMatch(UUID matchId, MatchEventCreateRequest request);

    void deleteEvent(UUID eventId);
}
