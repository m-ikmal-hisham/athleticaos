package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.season.SeasonOverviewResponse;
import com.athleticaos.backend.entities.Season;

import java.util.List;
import java.util.UUID;

public interface SeasonService {
    List<Season> getAllSeasons();

    List<Season> getActiveSeasons();

    Season getSeasonById(UUID id);

    Season createSeason(Season season);

    Season updateSeason(UUID id, Season season);

    Season updateStatus(UUID id, String status);

    SeasonOverviewResponse getSeasonOverview(UUID seasonId);
}
