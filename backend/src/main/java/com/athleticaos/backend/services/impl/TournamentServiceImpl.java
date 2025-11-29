package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.tournament.TournamentCreateRequest;
import com.athleticaos.backend.dtos.tournament.TournamentResponse;
import com.athleticaos.backend.dtos.tournament.TournamentUpdateRequest;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import com.athleticaos.backend.services.TournamentService;
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
public class TournamentServiceImpl implements TournamentService {

    private final TournamentRepository tournamentRepository;
    private final OrganisationRepository organisationRepository;

    public List<TournamentResponse> getAllTournaments() {
        return tournamentRepository.findAll().stream()
                .filter(tournament -> !tournament.isDeleted()) // Filter out deleted tournaments
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @SuppressWarnings("null")
    public TournamentResponse getTournamentById(UUID id) {
        return tournamentRepository.findById(id)
                .filter(tournament -> !tournament.isDeleted())
                .map(this::mapToResponse)
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));
    }

    @Transactional
    @SuppressWarnings("null")
    public TournamentResponse createTournament(TournamentCreateRequest request) {
        log.info("Creating tournament: {}", request.getName());

        // Validate dates
        validateDates(request.getStartDate(), request.getEndDate());

        // Validate organiser organisation exists
        Organisation org = organisationRepository.findById(request.getOrganiserOrgId())
                .orElseThrow(() -> new EntityNotFoundException("Organiser Organisation not found"));

        Tournament tournament = Tournament.builder()
                .organiserOrg(org)
                .name(request.getName())
                .level(request.getLevel())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .venue(request.getVenue())
                .isPublished(false)
                .deleted(false)
                .build();

        return mapToResponse(tournamentRepository.save(tournament));
    }

    @Transactional
    @SuppressWarnings("null")
    public TournamentResponse updateTournament(UUID id, TournamentUpdateRequest request) {
        log.info("Updating tournament: {}", id);
        Tournament tournament = tournamentRepository.findById(id)
                .filter(t -> !t.isDeleted())
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));

        // Update fields if provided
        if (request.getName() != null) {
            tournament.setName(request.getName());
        }
        if (request.getLevel() != null) {
            tournament.setLevel(request.getLevel());
        }
        if (request.getOrganiserOrgId() != null) {
            Organisation org = organisationRepository.findById(request.getOrganiserOrgId())
                    .orElseThrow(() -> new EntityNotFoundException("Organiser Organisation not found"));
            tournament.setOrganiserOrg(org);
        }
        if (request.getStartDate() != null) {
            tournament.setStartDate(request.getStartDate());
        }
        if (request.getEndDate() != null) {
            tournament.setEndDate(request.getEndDate());
        }
        if (request.getVenue() != null) {
            tournament.setVenue(request.getVenue());
        }
        if (request.getIsPublished() != null) {
            tournament.setPublished(request.getIsPublished());
        }

        // Validate dates after updates
        validateDates(tournament.getStartDate(), tournament.getEndDate());

        return mapToResponse(tournamentRepository.save(tournament));
    }

    @Transactional
    @SuppressWarnings("null")
    public void deleteTournament(UUID id) {
        log.info("Soft deleting tournament: {}", id);
        Tournament tournament = tournamentRepository.findById(id)
                .filter(t -> !t.isDeleted())
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));

        tournament.setDeleted(true);
        tournamentRepository.save(tournament);
    }

    @Transactional
    @SuppressWarnings("null")
    public TournamentResponse updatePublishStatus(UUID id, boolean publish) {
        log.info("Updating publish status for tournament {}: {}", id, publish);
        Tournament tournament = tournamentRepository.findById(id)
                .filter(t -> !t.isDeleted())
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));

        tournament.setPublished(publish);
        return mapToResponse(tournamentRepository.save(tournament));
    }

    private void validateDates(java.time.LocalDate startDate, java.time.LocalDate endDate) {
        if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("End date must be on or after start date");
        }
    }

    private TournamentResponse mapToResponse(Tournament tournament) {
        String status;
        java.time.LocalDate now = java.time.LocalDate.now();

        if (!tournament.isPublished()) {
            status = "Draft";
        } else if (now.isBefore(tournament.getStartDate())) {
            status = "Upcoming";
        } else if (now.isAfter(tournament.getEndDate())) {
            status = "Completed";
        } else {
            status = "Ongoing";
        }

        return TournamentResponse.builder()
                .id(tournament.getId())
                .name(tournament.getName())
                .level(tournament.getLevel())
                .organiserOrgId(tournament.getOrganiserOrg().getId())
                .startDate(tournament.getStartDate())
                .endDate(tournament.getEndDate())
                .venue(tournament.getVenue())
                .isPublished(tournament.isPublished())
                .status(status)
                .build();
    }
}
