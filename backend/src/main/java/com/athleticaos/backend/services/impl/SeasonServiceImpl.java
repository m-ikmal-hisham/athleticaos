package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.season.SeasonOverviewResponse;
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

@Service
@RequiredArgsConstructor
@Slf4j
public class SeasonServiceImpl implements SeasonService {

    private final SeasonRepository seasonRepository;
    private final TournamentRepository tournamentRepository;
    private final OrganisationRepository organisationRepository;

    @Override
    public List<Season> getAllSeasons() {
        return seasonRepository.findAll();
    }

    @Override
    public List<Season> getActiveSeasons() {
        return seasonRepository.findByStatus(SeasonStatus.ACTIVE);
    }

    @Override
    public Season getSeasonById(UUID id) {
        return seasonRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Season not found"));
    }

    @Override
    @Transactional
    public Season createSeason(Season season) {
        log.info("Creating season: {}", season.getName());
        if (season.getOrganiser() != null && season.getOrganiser().getId() != null) {
            Organisation org = organisationRepository.findById(season.getOrganiser().getId())
                    .orElseThrow(() -> new EntityNotFoundException("Organiser not found"));
            season.setOrganiser(org);
        }
        return seasonRepository.save(season);
    }

    @Override
    @Transactional
    public Season updateSeason(UUID id, Season seasonDetails) {
        log.info("Updating season: {}", id);
        Season season = getSeasonById(id);

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

        return seasonRepository.save(season);
    }

    @Override
    @Transactional
    public Season updateStatus(UUID id, String status) {
        log.info("Updating season status: {} -> {}", id, status);
        Season season = getSeasonById(id);
        season.setStatus(SeasonStatus.valueOf(status));
        return seasonRepository.save(season);
    }

    @Override
    public SeasonOverviewResponse getSeasonOverview(UUID seasonId) {
        Season season = getSeasonById(seasonId);
        var tournaments = tournamentRepository.findBySeasonId(seasonId);

        long totalTournaments = tournaments.size();
        // For MVP, we'll set 0 for deeper stats or implement aggregation if
        // repositories support it easily.
        // Assuming we need to fetch matches/teams from tournaments.
        // This can be expensive if not optimized. keeping it simple for now.

        return SeasonOverviewResponse.builder()
                .id(season.getId())
                .name(season.getName())
                .code(season.getCode())
                .level(season.getLevel())
                .status(season.getStatus())
                .startDate(season.getStartDate())
                .endDate(season.getEndDate())
                .totalTournaments(totalTournaments)
                .totalMatches(0) // TODO: Implement aggregation
                .completedMatches(0) // TODO: Implement aggregation
                .totalTeams(0) // TODO: Implement aggregation
                .totalPlayers(0) // TODO: Implement aggregation
                .build();
    }
}
