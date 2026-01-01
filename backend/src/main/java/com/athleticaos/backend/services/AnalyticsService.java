package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.analytics.DisciplineCorrelation;
import com.athleticaos.backend.dtos.analytics.SeasonSummary;
import com.athleticaos.backend.dtos.analytics.TeamPerformanceTrend;

import java.util.List;
import java.util.UUID;

public interface AnalyticsService {
    List<TeamPerformanceTrend> getTeamPerformanceTrends(UUID teamId);

    List<DisciplineCorrelation> getDisciplineImpact(UUID tournamentId);

    SeasonSummary getSeasonSummary(UUID tournamentId);
}
