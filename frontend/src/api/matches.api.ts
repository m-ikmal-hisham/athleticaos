import api from "./axios";

export const fetchMatches = (params?: {
    tournamentId?: string;
    status?: string;
    organisationId?: string;
}) => {
    return api.get("/matches", { params });
};

export const fetchMatchesByTournament = (tournamentId: string) => {
    return api.get(`/matches/by-tournament/${tournamentId}`);
};

export const fetchMatch = (idOrSlug: string) => {
    return api.get(`/matches/${idOrSlug}`);
};

// Match events
export const fetchMatchEvents = (matchId: string) => {
    return api.get(`/matches/${matchId}/events`);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createMatchEvent = (matchId: string, body: any) => {
    return api.post(`/matches/${matchId}/events`, body);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const updateMatchEvent = (eventId: string, body: any) => {
    return api.put(`/matches/events/${eventId}`, body);
};

export const deleteMatchEvent = (eventId: string) => {
    return api.delete(`/matches/events/${eventId}`);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const updateMatch = (id: string, data: any) => {
    return api.put(`/matches/${id}`, data);
};

// Soft delete (cancel match)
export const cancelMatch = (matchId: string) => {
    // We will use updateMatch in the store to handle the full object update
    return api.put(`/matches/${matchId}/status`, null, { params: { status: 'CANCELLED' } });
};

export const createMatch = (data: {
    tournamentId: string;
    homeTeamId: string;
    awayTeamId: string;
    matchDate: string;
    kickOffTime: string;
    venue: string;
    description?: string;
}) => {
    return api.post("/matches", data);
};

export const updateMatchStatus = (matchId: string, status: string) => {
    return api.put(`/matches/${matchId}/status`, null, { params: { status } });
}
