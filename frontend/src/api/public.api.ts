import axios from 'axios';
import type { LivestreamLink } from '@/types';

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
    bannerUrl?: string;
    livestreamUrl?: string;
    livestreamLinks?: LivestreamLink[];
    featured?: boolean;
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
    categoryId?: string | null;
    categoryName?: string | null;
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
    matchNumber?: number;
    hasMultipleVenues?: boolean;
}

export type PublicMatchFeedItem = PublicMatchSummary & {
    tournamentId: string;
    tournamentName: string;
    tournamentSlug?: string;
    tournamentLogoUrl?: string;
    tournamentStatus: string;
    categoryName?: string | null;
    homeTeamSlug?: string | null;
    awayTeamSlug?: string | null;
    livestreamUrl?: string | null;
    updatedAt?: string | null;
};

export interface PublicMatchFeedCounts {
    live: number;
    today: number;
    results: number;
    upcoming: number;
}

export interface PublicMatchFeed {
    items: PublicMatchFeedItem[];
    page: number;
    size: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    counts?: PublicMatchFeedCounts | null;
    lastUpdated?: string | null;
}

export interface PublicMatchDay {
    date: string;
    total: number;
    live: number;
    completed: number;
    cancelled: number;
}

export interface GetPublicMatchFeedParams {
    view: 'live' | 'today' | 'results' | 'upcoming' | 'range';
    tournamentId?: string;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
}

export interface GetPublicMatchDaysParams {
    from: string;
    to: string;
    tournamentId?: string;
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
    /** The match's own stream if it has one, otherwise the tournament's links. */
    livestreams?: LivestreamLink[];
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
    totalDoubleYellowRedCards?: number;
    totalStraightRedCards?: number;
    totalPoints?: number;
}

// API Functions
export const publicTournamentApi = {
    getTournaments: async (): Promise<PublicTournamentSummary[]> => {
        const response = await publicApi.get('/tournaments');
        return response.data;
    },

    // fresh = true is for the admin panel: the public response is cached by browsers for 30 s
    // (plus stale-while-revalidate) for home-page visitors, so admins add a unique query string to
    // see their change at once. A query parameter avoids a CORS preflight that a request header would cause.
    getFeaturedTournaments: async (fresh = false): Promise<PublicTournamentSummary[]> => {
        const response = await publicApi.get('/tournaments/featured', fresh ? { params: { fresh: Date.now() } } : undefined);
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

export const publicMatchApi = {
    getFeed: async (params: GetPublicMatchFeedParams): Promise<PublicMatchFeed> => {
        const response = await publicApi.get('/matches', { params });
        return response.data;
    },

    getDays: async (params: GetPublicMatchDaysParams): Promise<PublicMatchDay[]> => {
        const response = await publicApi.get('/matches/days', { params });
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

export interface PublicOrganisationRef {
    id: string;
    slug?: string | null;
    name: string;
    level: string;
    logoUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
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
    organisation?: PublicOrganisationRef | null;
    affiliation?: PublicOrganisationRef[];
    players: PublicPlayerSummary[];
    tournaments?: { id: string; name: string; status?: string }[];
}

export interface PublicPlayerDetailResponse {
    id: string;
    firstName: string;
    lastName: string;
    age?: number | null;
    ageGroup?: string | null;
    gender?: string;
    country?: string;
    state?: string;
    city?: string;
    position?: string;
    position2?: string;
    jerseyNumber?: number;
    organisationName?: string;
    organisation?: PublicOrganisationRef | null;
    affiliation?: PublicOrganisationRef[];
    profilePictureUrl?: string;
    currentTeamName?: string;
    currentTeamId?: string;
    tournaments?: {
        id: string;
        name: string;
        status?: string;
    }[];
}

export interface PublicTeamDirectoryItem {
    id: string;
    name: string;
    shortName?: string;
    slug?: string;
    logoUrl?: string;
    category?: string;
    ageGroup?: string;
    division?: string;
    state?: string;
    organisationName?: string;
    playerCount: number;
    tournaments?: {
        id: string;
        name: string;
        status?: string;
    }[];
}

export interface PublicPlayerDirectoryItem {
    id: string;
    firstName: string;
    lastName: string;
    slug?: string;
    position?: string;
    jerseyNumber?: number;
    currentTeamName?: string;
    currentTeamId?: string;
    organisationName?: string;
    profilePictureUrl?: string;
    state?: string;
    gender?: string;
    tournamentCount: number;
}

export interface PublicPageResponse<T> {
    items: T[];
    page: number;
    size: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
}

export interface PublicPlayerFilters {
    states: string[];
    positions: string[];
}

export interface PublicTeamFilters {
    states: string[];
    categories: string[];
}

export interface GetPublicPlayersPageParams {
    page?: number;
    size?: number;
    search?: string;
    state?: string;
    position?: string;
    teamId?: string;
    tournamentId?: string;
    sort?: 'name' | 'recent' | string;
}

export interface GetPublicTeamsPageParams {
    page?: number;
    size?: number;
    search?: string;
    category?: string;
    state?: string;
    tournamentId?: string;
    sort?: string;
}

export const publicProfileApi = {
    getTeams: async (params?: {
        search?: string;
        tournamentId?: string;
        category?: string;
        state?: string;
    }): Promise<PublicTeamDirectoryItem[]> => {
        const response = await publicApi.get('/teams', { params });
        return response.data;
    },
    getTeamsPage: async (params?: GetPublicTeamsPageParams): Promise<PublicPageResponse<PublicTeamDirectoryItem>> => {
        const response = await publicApi.get('/teams', { params });
        return response.data;
    },
    getPlayers: async (params?: {
        search?: string;
        tournamentId?: string;
        teamId?: string;
        position?: string;
        state?: string;
        limit?: number;
    }): Promise<PublicPlayerDirectoryItem[]> => {
        const response = await publicApi.get('/players', { params });
        return response.data;
    },
    getPlayersPage: async (params?: GetPublicPlayersPageParams): Promise<PublicPageResponse<PublicPlayerDirectoryItem>> => {
        const response = await publicApi.get('/players', { params });
        return response.data;
    },
    getPlayerFilters: async (): Promise<PublicPlayerFilters> => {
        const response = await publicApi.get('/players/filters');
        return response.data;
    },
    getTeamFilters: async (): Promise<PublicTeamFilters> => {
        const response = await publicApi.get('/teams/filters');
        return response.data;
    },
    getTeam: async (idOrSlug: string, tournamentId?: string): Promise<PublicTeamDetailResponse> => {
        const response = await publicApi.get(`/teams/${idOrSlug}`, {
            params: { tournamentId }
        });
        return response.data;
    },
    getPlayer: async (idOrSlug: string, tournamentId?: string): Promise<PublicPlayerDetailResponse> => {
        const response = await publicApi.get(`/players/${idOrSlug}`, {
            params: { tournamentId }
        });
        return response.data;
    },
    getPlayerStats: async (idOrSlug: string, tournamentId?: string): Promise<any> => {
        const response = await publicApi.get(`/players/${idOrSlug}/stats`, {
            params: { tournamentId }
        });
        return response.data;
    },
    getTeamStats: async (idOrSlug: string, tournamentId?: string): Promise<any> => {
        const response = await publicApi.get(`/teams/${idOrSlug}/stats`, {
            params: { tournamentId }
        });
        return response.data;
    }
};

export type ContactSubjectValue =
    | 'GENERAL'
    | 'PARTNERSHIP'
    | 'ORGANISATION_REGISTRATION'
    | 'MEDIA'
    | 'TOURNAMENT_SUPPORT'
    | 'PRIVACY_REQUEST';

export interface ContactPayload {
    name: string;
    email: string;
    organisation?: string;
    subject: ContactSubjectValue;
    message: string;
    website?: string;
}

export interface ContactResponse {
    status: string;
}

export const submitContact = async (payload: ContactPayload) => {
    return publicApi.post<ContactResponse>('/contact', payload);
};

export interface PublicStatsSummary {
    tournaments: number;
    teams: number;
    players: number;
    matchesPlayed: number;
}

export const getPublicStatsSummary = async (): Promise<PublicStatsSummary> => {
    const response = await publicApi.get<PublicStatsSummary>('/stats/summary');
    return response.data;
};

// ─── Organisations Directory & Detail ────────────────────────────────────────

export interface PublicOrganisationTreeNode {
    id: string;
    slug?: string | null;
    name: string;
    level: string;
    state?: string | null;
    logoUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    parentId?: string | null;
    teamCount: number;
    childCount: number;
}

export interface PublicOrganisationTreeTeam {
    id: string;
    slug?: string | null;
    name: string;
    organisationId: string;
    category?: string | null;
    ageGroup?: string | null;
    division?: string | null;
    playerCount: number;
    logoUrl?: string | null;
}

export interface PublicOrganisationTreeResponse {
    organisations: PublicOrganisationTreeNode[];
    teams: PublicOrganisationTreeTeam[];
}

export interface PublicOrganisationChildRef {
    id: string;
    slug?: string | null;
    name: string;
    level: string;
    logoUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    teamCount: number;
    childCount: number;
}

export interface PublicOrganisationTournamentItem {
    id: string;
    slug?: string | null;
    name: string;
    status?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    logoUrl?: string | null;
}

export interface PublicOrganisationCounts {
    affiliatedOrganisations: number;
    teams: number;
    players: number;
    tournaments: number;
}

export interface PublicOrganisationDetailResponse {
    id: string;
    slug?: string | null;
    name: string;
    level: string;
    state?: string | null;
    logoUrl?: string | null;
    coverImageUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
    parentChain: PublicOrganisationRef[];
    children: PublicOrganisationChildRef[];
    teams: PublicOrganisationTreeTeam[];
    tournaments: PublicOrganisationTournamentItem[];
    counts: PublicOrganisationCounts;
}

export const publicOrganisationApi = {
    getTree: async (): Promise<PublicOrganisationTreeResponse> => {
        const response = await publicApi.get<PublicOrganisationTreeResponse>('/organisations/tree');
        return response.data;
    },
    getOrganisation: async (idOrSlug: string): Promise<PublicOrganisationDetailResponse> => {
        const response = await publicApi.get<PublicOrganisationDetailResponse>(`/organisations/${idOrSlug}`);
        return response.data;
    },
};


