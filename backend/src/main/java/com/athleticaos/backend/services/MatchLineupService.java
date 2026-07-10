package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.roster.MatchLineupEntryDTO;
import com.athleticaos.backend.dtos.roster.MatchLineupUpdateRequest;

import java.util.List;
import java.util.UUID;

public interface MatchLineupService {
    List<MatchLineupEntryDTO> getLineup(UUID matchId, UUID teamId);

    List<MatchLineupEntryDTO> updateLineup(UUID matchId, MatchLineupUpdateRequest request);
}
