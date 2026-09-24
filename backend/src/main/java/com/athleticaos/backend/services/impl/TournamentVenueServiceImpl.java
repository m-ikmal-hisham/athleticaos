package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.tournament.CreateVenueRequest;
import com.athleticaos.backend.dtos.tournament.TournamentVenueDTO;
import com.athleticaos.backend.dtos.tournament.UpdateVenueRequest;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.entities.TournamentVenue;
import com.athleticaos.backend.repositories.MatchRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import com.athleticaos.backend.repositories.TournamentVenueRepository;
import com.athleticaos.backend.services.TournamentVenueService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class TournamentVenueServiceImpl implements TournamentVenueService {

    private final TournamentVenueRepository venueRepository;
    private final TournamentRepository tournamentRepository;
    private final MatchRepository matchRepository;

    @Override
    @Transactional(readOnly = true)
    public List<TournamentVenueDTO> getVenuesByTournament(UUID tournamentId) {
        if (!tournamentRepository.existsById(tournamentId)) {
            throw new EntityNotFoundException("Tournament not found with ID: " + tournamentId);
        }
        return venueRepository.findByTournamentIdAndDeletedFalseOrderByDisplayOrderAscNameAsc(tournamentId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public TournamentVenueDTO getVenue(UUID tournamentId, UUID venueId) {
        TournamentVenue venue = venueRepository.findByIdAndTournamentIdAndDeletedFalse(venueId, tournamentId)
                .orElseThrow(() -> new EntityNotFoundException("Venue not found with ID: " + venueId + " for tournament: " + tournamentId));
        return mapToDTO(venue);
    }

    @Override
    @Transactional
    public TournamentVenueDTO createVenue(UUID tournamentId, CreateVenueRequest request) {
        Tournament tournament = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found with ID: " + tournamentId));

        String trimmedName = request.getName() != null ? request.getName().trim() : "";
        if (trimmedName.isEmpty()) {
            throw new IllegalArgumentException("Venue name must not be blank");
        }

        if (venueRepository.existsByTournamentIdAndNameIgnoreCaseAndDeletedFalse(tournamentId, trimmedName)) {
            throw new IllegalArgumentException("A venue named '" + trimmedName + "' already exists in this tournament");
        }

        int displayOrder = request.getDisplayOrder() != null ? request.getDisplayOrder() : 0;

        TournamentVenue venue = TournamentVenue.builder()
                .tournament(tournament)
                .name(trimmedName)
                .shortName(request.getShortName() != null && !request.getShortName().trim().isEmpty() ? request.getShortName().trim() : null)
                .displayOrder(displayOrder)
                .deleted(false)
                .build();

        venue = venueRepository.save(venue);
        log.info("Created venue '{}' (id: {}) for tournament {}", venue.getName(), venue.getId(), tournamentId);
        return mapToDTO(venue);
    }

    @Override
    @Transactional
    public TournamentVenueDTO updateVenue(UUID tournamentId, UUID venueId, UpdateVenueRequest request) {
        TournamentVenue venue = venueRepository.findByIdAndTournamentIdAndDeletedFalse(venueId, tournamentId)
                .orElseThrow(() -> new EntityNotFoundException("Venue not found with ID: " + venueId + " for tournament: " + tournamentId));

        String trimmedName = request.getName() != null ? request.getName().trim() : "";
        if (trimmedName.isEmpty()) {
            throw new IllegalArgumentException("Venue name must not be blank");
        }

        if (venueRepository.existsByTournamentIdAndNameIgnoreCaseAndIdNotAndDeletedFalse(tournamentId, trimmedName, venueId)) {
            throw new IllegalArgumentException("A venue named '" + trimmedName + "' already exists in this tournament");
        }

        venue.setName(trimmedName);
        venue.setShortName(request.getShortName() != null && !request.getShortName().trim().isEmpty() ? request.getShortName().trim() : null);
        if (request.getDisplayOrder() != null) {
            venue.setDisplayOrder(request.getDisplayOrder());
        }

        venue = venueRepository.save(venue);
        matchRepository.updateVenueNameForVenueId(venueId, trimmedName);
        log.info("Updated venue '{}' (id: {}) for tournament {}", venue.getName(), venue.getId(), tournamentId);
        return mapToDTO(venue);
    }

    @Override
    @Transactional
    public void deleteVenue(UUID tournamentId, UUID venueId) {
        TournamentVenue venue = venueRepository.findByIdAndTournamentIdAndDeletedFalse(venueId, tournamentId)
                .orElseThrow(() -> new EntityNotFoundException("Venue not found with ID: " + venueId + " for tournament: " + tournamentId));

        long assignedMatches = matchRepository.countByTournamentVenueIdAndDeletedFalse(venueId);
        if (assignedMatches > 0) {
            throw new IllegalStateException("Cannot delete venue '" + venue.getName() + "' because " + assignedMatches + " match(es) are currently assigned to it");
        }

        venue.setDeleted(true);
        venueRepository.save(venue);
        log.info("Soft-deleted venue '{}' (id: {}) for tournament {}", venue.getName(), venue.getId(), tournamentId);
    }

    private TournamentVenueDTO mapToDTO(TournamentVenue venue) {
        return TournamentVenueDTO.builder()
                .id(venue.getId())
                .tournamentId(venue.getTournament().getId())
                .name(venue.getName())
                .shortName(venue.getShortName())
                .displayOrder(venue.getDisplayOrder())
                .createdAt(venue.getCreatedAt())
                .updatedAt(venue.getUpdatedAt())
                .build();
    }
}
