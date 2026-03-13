package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.season.SeasonOverviewResponse;
import com.athleticaos.backend.dtos.season.SeasonResponse;
import com.athleticaos.backend.entities.Season;

import java.util.List;
import java.util.UUID;

public interface SeasonService {
    List<SeasonResponse> getAllSeasons();

    List<SeasonResponse> getActiveSeasons();

    SeasonResponse getSeasonById(UUID id);

    SeasonResponse createSeason(Season season);

    SeasonResponse updateSeason(UUID id, Season season);

    SeasonResponse updateStatus(UUID id, String status);

    void deleteSeason(UUID id);

    SeasonOverviewResponse getSeasonOverview(UUID seasonId);
}
