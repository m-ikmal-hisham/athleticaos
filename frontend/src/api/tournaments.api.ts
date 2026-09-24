import api from "./axios";

export const fetchTournaments = () => api.get("/tournaments");

export const getTournament = (idOrSlug: string) => api.get(`/tournaments/${idOrSlug}`);

export const createTournament = (data: any) => api.post("/tournaments", data);

export const getTournamentDashboard = (idOrSlug: string) => api.get(`/tournaments/${idOrSlug}/dashboard`);

export const exportMatches = (idOrSlug: string) =>
    api.get(`/tournaments/${idOrSlug}/export/matches`, { responseType: 'blob' });

export const exportResults = (idOrSlug: string) =>
    api.get(`/tournaments/${idOrSlug}/export/results`, { responseType: 'blob' });

export const deleteTournament = (id: string) => api.delete(`/tournaments/${id}`);


export const updateTournament = (id: string, data: any) => api.put(`/tournaments/${id}`, data);

export const getTournamentTeams = (idOrSlug: string) => api.get(`/tournaments/${idOrSlug}/teams`);

export const getTournamentBracket = (idOrSlug: string) => api.get(`/tournaments/${idOrSlug}/bracket`);

export const renumberMatches = (idOrSlug: string, request: { dryRun: boolean }) =>
    api.post<import('@/types').MatchRenumberResponse>(`/tournaments/${idOrSlug}/matches/renumber`, request);

export const getTournamentVenues = (idOrSlug: string) =>
    api.get<import('@/types').TournamentVenue[]>(`/tournaments/${idOrSlug}/venues`);

export const createTournamentVenue = (idOrSlug: string, data: import('@/types').CreateVenueRequest) =>
    api.post<import('@/types').TournamentVenue>(`/tournaments/${idOrSlug}/venues`, data);

export const updateTournamentVenue = (idOrSlug: string, venueId: string, data: import('@/types').UpdateVenueRequest) =>
    api.put<import('@/types').TournamentVenue>(`/tournaments/${idOrSlug}/venues/${venueId}`, data);

export const deleteTournamentVenue = (idOrSlug: string, venueId: string) =>
    api.delete(`/tournaments/${idOrSlug}/venues/${venueId}`);
