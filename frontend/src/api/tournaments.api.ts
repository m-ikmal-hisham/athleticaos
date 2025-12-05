import api from "./axios";

export const fetchTournaments = () => api.get("/tournaments");

export const getTournamentDashboard = (id: string) => api.get(`/tournaments/${id}/dashboard`);

export const exportMatches = (id: string) =>
    api.get(`/tournaments/${id}/export/matches`, { responseType: 'blob' });

export const exportResults = (id: string) =>
    api.get(`/tournaments/${id}/export/results`, { responseType: 'blob' });

