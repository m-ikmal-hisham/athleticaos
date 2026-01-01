import api from './axios';

export interface TeamPerformanceTrend {
    matchDate: string;
    opponentName: string;
    pointsScored: number;
    pointsConceded: number;
    result: 'WIN' | 'LOSS' | 'DRAW';
}

export interface DisciplineCorrelation {
    teamId: string;
    teamName: string;
    totalRedCards: number;
    totalYellowCards: number;
    leaguePoints: number;
    matchesPlayed: number;
}

export interface SeasonSummary {
    totalMatches: number;
    completedMatches: number;
    totalTries: number;
    avgPointsPerMatch: number;
    highestScoringTeam: string;
    activeTeams: number;
}

export const getTeamPerformanceTrends = async (teamId: string): Promise<TeamPerformanceTrend[]> => {
    const response = await api.get(`/analytics/teams/${teamId}/trends`);
    return response.data;
};

export const getDisciplineImpact = async (tournamentId: string): Promise<DisciplineCorrelation[]> => {
    const response = await api.get(`/analytics/competitions/${tournamentId}/discipline-impact`);
    return response.data;
};

export const getSeasonSummary = async (tournamentId: string): Promise<SeasonSummary> => {
    const response = await api.get(`/analytics/competitions/${tournamentId}/summary`);
    return response.data;
};
