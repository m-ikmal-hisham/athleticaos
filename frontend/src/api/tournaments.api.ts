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
