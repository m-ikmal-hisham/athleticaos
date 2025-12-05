import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Public API client (no auth required)
const publicApi = axios.create({
    baseURL: `${API_URL}/api/public`,
    headers: {
        'Content-Type': 'application/json',
    },
});

export interface PublicTournamentSummary {
    id: string;
    name: string;
    level: string;
    seasonName?: string;
    startDate: string;
    endDate: string;
    venue: string;
    live: boolean;
    completed: boolean;
    organiserName: string;
    competitionType?: string;
}

export interface PublicTournamentDetail extends PublicTournamentSummary {
    teams: PublicTeamSummary[];
    stages: string[];
}

export interface PublicTeamSummary {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
}

export interface PublicMatchSummary {
    id: string;
    code?: string;
    homeTeamName: string;
    awayTeamName: string;
    homeScore?: number;
    awayScore?: number;
    matchDate: string;
    matchTime: string;
    venue?: string;
    status: string;
    stage?: string;
    round?: string;
}

export interface PublicMatchDetail extends PublicMatchSummary {
    events: PublicMatchEvent[];
    homeStats?: PublicTeamStats;
    awayStats?: PublicTeamStats;
}

export interface PublicMatchEvent {
    minute?: number;
    teamName: string;
    playerName?: string;
    eventType: string;
    points?: number;
}

export interface PublicTeamStats {
    tries?: number;
    conversions?: number;
    penalties?: number;
    yellowCards?: number;
    redCards?: number;
}

// API Functions
export const publicTournamentApi = {
    getTournaments: async (): Promise<PublicTournamentSummary[]> => {
        const response = await publicApi.get('/tournaments');
        return response.data;
    },

    getTournamentById: async (id: string): Promise<PublicTournamentDetail> => {
        const response = await publicApi.get(`/tournaments/${id}`);
        return response.data;
    },

    getTournamentMatches: async (id: string): Promise<PublicMatchSummary[]> => {
        const response = await publicApi.get(`/tournaments/${id}/matches`);
        return response.data;
    },

    getMatchById: async (matchId: string): Promise<PublicMatchDetail> => {
        const response = await publicApi.get(`/matches/${matchId}`);
        return response.data;
    },
};
