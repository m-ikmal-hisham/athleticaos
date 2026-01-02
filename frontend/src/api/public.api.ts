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
    slug?: string;
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
    organiserBranding?: {
        primaryColor?: string;
        secondaryColor?: string;
        accentColor?: string;
        logoUrl?: string;
        coverImageUrl?: string;
    };
    logoUrl?: string;
    livestreamUrl?: string;
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
    homeTeamLogoUrl?: string;
    awayTeamLogoUrl?: string;
    homeTeamShortName?: string;
    awayTeamShortName?: string;
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
    organiserBranding?: {
        primaryColor?: string;
        secondaryColor?: string;
        accentColor?: string;
        logoUrl?: string;
        coverImageUrl?: string;
    };
    tournamentId?: string;
    tournamentSlug?: string;
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

export interface PublicStanding {
    poolName: string;
    teamId: string;
    teamName: string;
    teamLogoUrl?: string;
    teamShortName?: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    pointsFor: number;
    pointsAgainst: number;
    pointsDiff: number;
    points: number;
}

// API Functions
export const publicTournamentApi = {
    getTournaments: async (): Promise<PublicTournamentSummary[]> => {
        const response = await publicApi.get('/tournaments');
        return response.data;
    },

    getTournament: async (idOrSlug: string): Promise<PublicTournamentDetail> => {
        const response = await publicApi.get(`/tournaments/${idOrSlug}`);
        return response.data;
    },

    getTournamentMatches: async (id: string): Promise<PublicMatchSummary[]> => {
        const response = await publicApi.get(`/tournaments/${id}/matches`);
        return response.data;
    },

    getTournamentStandings: async (id: string): Promise<PublicStanding[]> => {
        const response = await publicApi.get(`/tournaments/${id}/standings`);
        return response.data;
    },

    getMatch: async (idOrSlug: string): Promise<PublicMatchDetail> => {
        const response = await publicApi.get(`/matches/${idOrSlug}`);
        return response.data;
    },
};
