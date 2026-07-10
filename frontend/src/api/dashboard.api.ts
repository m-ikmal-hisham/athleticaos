import api from './axios';

export interface DashboardStats {
    totalPlayers: number;
    playerTrend: number;
    totalTeams: number;
    teamTrend: number;
    totalMatches: number;
    matchTrend: number;
    totalOrganisations: number;
    organisationTrend: number;
    activeTournaments: number;
    upcomingMatches: number;
}

export const fetchDashboardStats = () => api.get<DashboardStats>('/dashboard/stats');
