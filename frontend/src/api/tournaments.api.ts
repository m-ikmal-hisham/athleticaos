import api from "./axios";

export const fetchTournaments = () => api.get("/tournaments");

export const createTournament = (data: any) => api.post("/tournaments", data);

export const getTournamentDashboard = (id: string) => api.get(`/tournaments/${id}/dashboard`);

export const exportMatches = (id: string) =>
    api.get(`/tournaments/${id}/export/matches`, { responseType: 'blob' });

export const exportResults = (id: string) =>
    api.get(`/tournaments/${id}/export/results`, { responseType: 'blob' });

export const deleteTournament = (id: string) => api.delete(`/tournaments/${id}`);

export const updateTournament = (id: string, data: any) => api.put(`/tournaments/${id}`, data);

