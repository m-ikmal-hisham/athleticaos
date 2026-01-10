package com.athleticaos.backend.services;

import com.athleticaos.backend.entities.MatchOfficial;
import com.athleticaos.backend.entities.OfficialRegistry;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface OfficialService {

        // Registry Management
        OfficialRegistry registerOfficial(UUID userId, String accreditationLevel, String primaryRole,
                        String badgeNumber,
                        LocalDateTime expiryDate);

        OfficialRegistry updateOfficial(UUID officialId, String accreditationLevel, String primaryRole,
                        LocalDateTime expiryDate);

        List<OfficialRegistry> getAllOfficials();

        OfficialRegistry getOfficialById(UUID officialId);

        // Assignment Management
        MatchOfficial assignOfficialToMatch(UUID matchId, UUID officialId, String role);

        void removeOfficialFromMatch(UUID assignmentId);

        List<MatchOfficial> getOfficialsForMatch(UUID matchId);

        List<MatchOfficial> getOfficialHistory(UUID officialId);
}
