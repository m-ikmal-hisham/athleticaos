package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.dashboard.DashboardStatsResponse;

public interface DashboardService {

    /**
     * Get dashboard statistics
     */
    DashboardStatsResponse getDashboardStats();
}
