import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

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
    categories: PublicCategorySummary[];
}

export interface PublicCategorySummary {
    id: string;
    name: string;
    description?: string;
}

export interface PublicTeamSummary {
    id: string;
    name: string;
    slug: string;
    shortName?: string;
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
    /** NORMAL, WALKOVER or BYE. Absent means a normally played match. */
    resultType?: 'NORMAL' | 'WALKOVER' | 'BYE';
    stage?: string;
    /** Stage type (PLATE, BOWL, SHIELD, ...), used to group the bracket the same way the admin view does. */
    stageType?: string;
    stageDisplayOrder?: number;
    round?: string;
    officials?: { id?: string, officialName?: string, assignedRole?: string, officialRoleName?: string }[];
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
    matchDuration?: number;
    isOneWayMatch?: boolean;
}

export interface PublicMatchEvent {
    minute?: number;
    teamName: string;
    playerName?: string;
    eventType: string;
    points?: number;
    notes?: string; // Added for substitutions validation
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
    poolId?: string; // Phase?
    categoryId?: string;
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

export interface PublicPlayerStatEntry {
    playerId: string;
    name: string;
    teamName: string;
    tries: number;
    conversions: number;
    penalties: number;
    dropGoals: number;
    totalPoints: number;
    yellowCards: number;
    redCards: number;
}

export interface PublicTeamStatEntry {
    teamId: string;
    teamName: string;
    organisationName: string;
    wins: number;
    triesScored: number;
    pointsFor: number;
    pointsDifference: number;
    tablePoints: number;
}

export interface PublicTournamentStats {
    topScorers: PublicPlayerStatEntry[];
    topOffenders: PublicPlayerStatEntry[];
    topTeams: PublicTeamStatEntry[];
    topTryScorers?: PublicPlayerStatEntry[];
    totalMatches?: number;
    totalTries?: number;
    totalConversions?: number;
    totalPenalties?: number;
    totalYellowCards?: number;
    totalRedCards?: number;
    totalPoints?: number;
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

    getTournamentMatches: async (id: string, categoryId?: string): Promise<PublicMatchSummary[]> => {
        const response = await publicApi.get(`/tournaments/${id}/matches`, {
            params: { categoryId }
        });
        return response.data;
    },

    getTournamentStandings: async (id: string, categoryId?: string): Promise<PublicStanding[]> => {
        const response = await publicApi.get(`/tournaments/${id}/standings`, {
            params: { categoryId }
        });
        return response.data;
    },

    getTournamentStats: async (id: string, categoryId?: string): Promise<PublicTournamentStats> => {
        const response = await publicApi.get(`/tournaments/${id}/stats`, {
            params: { categoryId }
        });
        return response.data;
    },

    getMatch: async (idOrSlug: string): Promise<PublicMatchDetail> => {
        const response = await publicApi.get(`/matches/${idOrSlug}`);
        return response.data;
    },

    getMatchLineups: async (matchId: string): Promise<PublicMatchLineups> => {
        const response = await publicApi.get(`/matches/${matchId}/lineups`);
        return response.data;
    },
};

export interface PublicLineupEntry {
    playerName: string;
    jerseyNumber?: number;
    captain: boolean;
    role: string; // 'STARTER' | 'BENCH' | 'RESERVE'
    orderIndex?: number;
    positionDisplay?: string;
}

export interface PublicMatchLineups {
    homeTeamName: string;
    awayTeamName: string;
    homeLineup: PublicLineupEntry[];
    awayLineup: PublicLineupEntry[];
}
export interface PublicPlayerSummary {
    id: string;
    firstName: string;
    lastName: string;
    idType: string;
    idNumber: string;
    dateOfBirth?: string;
    position?: string;
    position2?: string;
    jerseyNumber?: number;
    profilePictureUrl?: string;
    tries?: number;
    conversions?: number;
    penalties?: number;
    dropGoals?: number;
    yellowCards?: number;
    redCards?: number;
    appearances?: number;
}

export interface PublicTeamDetailResponse {
    id: string;
    name: string;
    shortName?: string;
    slug: string;
    logoUrl?: string;
    category: string;
    ageGroup: string;
    division?: string;
    state?: string;
    organisationName?: string;
    players: PublicPlayerSummary[];
    tournaments?: { id: string; name: string }[];
}

export interface PublicPlayerDetailResponse {
    id: string;
    firstName: string;
    lastName: string;
    idType: string;
    idNumber: string;
    dateOfBirth?: string;
    gender?: string;
    country?: string;
    state?: string;
    city?: string;
    bloodGroup?: string;
    emergencyContactName?: string;
    emergencyContactNumber?: string;
    emergencyContactRelationship?: string;
    position?: string;
    position2?: string;
    jerseyNumber?: number;
    organisationName?: string;
    profilePictureUrl?: string;
    currentTeamName?: string;
    currentTeamId?: string;
}

export const publicProfileApi = {
    getTeam: async (idOrSlug: string, tournamentId?: string): Promise<PublicTeamDetailResponse> => {
        const response = await publicApi.get(`/teams/${idOrSlug}`, {
            params: { tournamentId }
        });
        return response.data;
    },
    getPlayer: async (idOrSlug: string): Promise<PublicPlayerDetailResponse> => {
        const response = await publicApi.get(`/players/${idOrSlug}`);
        return response.data;
    },
    getPlayerStats: async (idOrSlug: string): Promise<any> => {
        const response = await publicApi.get(`/players/${idOrSlug}/stats`);
        return response.data;
    },
    getTeamStats: async (idOrSlug: string, tournamentId?: string): Promise<any> => {
        const response = await publicApi.get(`/teams/${idOrSlug}/stats`, {
            params: { tournamentId }
        });
        return response.data;
    }
};
