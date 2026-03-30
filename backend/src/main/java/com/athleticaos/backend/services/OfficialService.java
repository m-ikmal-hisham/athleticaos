package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.official.*;

import java.util.List;
import java.util.UUID;

public interface OfficialService {

        // Registry Management
        OfficialRegistryDTO registerOfficial(RegisterOfficialRequest request);

        OfficialRegistryDTO updateOfficial(UUID officialId, RegisterOfficialRequest request);

        List<OfficialRegistryDTO> getAllOfficials();

        OfficialRegistryDTO getOfficialById(UUID officialId);

        // Match Assignment Management
        MatchOfficialDTO assignOfficialToMatch(UUID matchId, AssignOfficialRequest request);

        void removeOfficialFromMatch(UUID assignmentId);

        List<MatchOfficialDTO> getOfficialsForMatch(UUID matchId);

        // Tournament Official Panel Management
        TournamentOfficialDTO addOfficialToTournament(UUID tournamentId, AddTournamentOfficialRequest request);

        void removeOfficialFromTournament(UUID tournamentOfficialId);

        List<TournamentOfficialDTO> getTournamentOfficials(UUID tournamentId);
}
