package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.tournament.CreateVenueRequest;
import com.athleticaos.backend.dtos.tournament.TournamentVenueDTO;
import com.athleticaos.backend.dtos.tournament.UpdateVenueRequest;

import java.util.List;
import java.util.UUID;

public interface TournamentVenueService {

    List<TournamentVenueDTO> getVenuesByTournament(UUID tournamentId);

    TournamentVenueDTO getVenue(UUID tournamentId, UUID venueId);

    TournamentVenueDTO createVenue(UUID tournamentId, CreateVenueRequest request);

    TournamentVenueDTO updateVenue(UUID tournamentId, UUID venueId, UpdateVenueRequest request);

    void deleteVenue(UUID tournamentId, UUID venueId);
}
