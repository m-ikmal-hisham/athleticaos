package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.tournament.TournamentCreateRequest;
import com.athleticaos.backend.dtos.tournament.TournamentResponse;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TournamentService {

    private final TournamentRepository tournamentRepository;
    private final OrganisationRepository organisationRepository;

    public List<TournamentResponse> getAllTournaments() {
        return tournamentRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @SuppressWarnings("null")
    public TournamentResponse getTournamentById(UUID id) {
        return tournamentRepository.findById(id)
                .map(this::mapToResponse)
                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));
    }

    @Transactional
    @SuppressWarnings("null")
    public TournamentResponse createTournament(TournamentCreateRequest request) {
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
                .build();

        return mapToResponse(tournamentRepository.save(tournament));
    }

    private TournamentResponse mapToResponse(Tournament tournament) {
        return TournamentResponse.builder()
                .id(tournament.getId())
                .name(tournament.getName())
                .level(tournament.getLevel())
                .organiserOrgId(tournament.getOrganiserOrg().getId())
                .startDate(tournament.getStartDate())
                .endDate(tournament.getEndDate())
                .venue(tournament.getVenue())
                .isPublished(tournament.isPublished())
                .build();
    }
}
