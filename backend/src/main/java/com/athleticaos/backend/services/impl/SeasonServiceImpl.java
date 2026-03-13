package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.season.SeasonOverviewResponse;
import com.athleticaos.backend.dtos.season.SeasonResponse;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Season;
import com.athleticaos.backend.enums.SeasonStatus;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.SeasonRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import com.athleticaos.backend.services.SeasonService;
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
public class SeasonServiceImpl implements SeasonService {

    private final SeasonRepository seasonRepository;
    private final TournamentRepository tournamentRepository;
    private final OrganisationRepository organisationRepository;

    @Override
    @Transactional(readOnly = true)
    public List<SeasonResponse> getAllSeasons() {
        return seasonRepository.findByDeletedFalse().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<SeasonResponse> getActiveSeasons() {
        return seasonRepository.findByStatusAndDeletedFalse(SeasonStatus.ACTIVE).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public SeasonResponse getSeasonById(UUID id) {
        Season season = seasonRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Season not found"));
        return mapToResponse(season);
    }

    @Override
    @Transactional
    @SuppressWarnings("null")
    public SeasonResponse createSeason(Season season) {
        log.info("Creating season: {}", season.getName());
        if (season.getOrganiser() != null && season.getOrganiser().getId() != null) {
            Organisation org = organisationRepository.findById(season.getOrganiser().getId())
                    .orElseThrow(() -> new EntityNotFoundException("Organiser not found"));
            season.setOrganiser(org);
        }
        return mapToResponse(seasonRepository.save(season));
    }

    @Override
    @Transactional
    @SuppressWarnings("null")
    public SeasonResponse updateSeason(UUID id, Season seasonDetails) {
        log.info("Updating season: {}", id);
        Season season = seasonRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Season not found"));

        season.setName(seasonDetails.getName());
        season.setCode(seasonDetails.getCode());
        season.setStartDate(seasonDetails.getStartDate());
        season.setEndDate(seasonDetails.getEndDate());
        season.setDescription(seasonDetails.getDescription());
        season.setLevel(seasonDetails.getLevel());

        if (seasonDetails.getOrganiser() != null) {
            Organisation org = organisationRepository.findById(seasonDetails.getOrganiser().getId())
                    .orElseThrow(() -> new EntityNotFoundException("Organiser not found"));
            season.setOrganiser(org);
        }

        return mapToResponse(seasonRepository.save(season));
    }

    @Override
    @Transactional
    @SuppressWarnings("null")
    public SeasonResponse updateStatus(UUID id, String status) {
        log.info("Updating season status: {} -> {}", id, status);
        Season season = seasonRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Season not found"));
        season.setStatus(SeasonStatus.valueOf(status));
        return mapToResponse(seasonRepository.save(season));
    }

    @Override
    @Transactional
    @SuppressWarnings("null")
    public void deleteSeason(UUID id) {
        log.info("Deleting season (soft): {}", id);
        Season season = seasonRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Season not found"));
        season.setDeleted(true);
        seasonRepository.save(season);
    }

    @Override
    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public SeasonOverviewResponse getSeasonOverview(UUID seasonId) {
        Season season = seasonRepository.findById(seasonId)
                .orElseThrow(() -> new EntityNotFoundException("Season not found"));
        var tournaments = tournamentRepository.findBySeasonId(seasonId);

        long totalTournaments = tournaments.size();

        return SeasonOverviewResponse.builder()
                .id(season.getId())
                .name(season.getName())
                .code(season.getCode())
                .level(season.getLevel())
                .status(season.getStatus())
                .startDate(season.getStartDate())
                .endDate(season.getEndDate())
                .totalTournaments(totalTournaments)
                .totalMatches(0)
                .completedMatches(0)
                .totalTeams(0)
                .totalPlayers(0)
                .build();
    }

    /**
     * Maps a Season entity to a SeasonResponse DTO, resolving lazy proxies within
     * the active Hibernate session.
     */
    private SeasonResponse mapToResponse(Season season) {
        SeasonResponse.SeasonResponseBuilder builder = SeasonResponse.builder()
                .id(season.getId())
                .name(season.getName())
                .code(season.getCode())
                .startDate(season.getStartDate())
                .endDate(season.getEndDate())
                .description(season.getDescription())
                .level(season.getLevel())
                .status(season.getStatus())
                .deleted(season.isDeleted())
                .createdAt(season.getCreatedAt())
                .updatedAt(season.getUpdatedAt());

        // Safely extract organiser fields within the session
        if (season.getOrganiser() != null) {
            builder.organiser(SeasonResponse.OrganiserInfo.builder()
                    .id(season.getOrganiser().getId())
                    .name(season.getOrganiser().getName())
                    .build());
        }

        return builder.build();
    }
}
