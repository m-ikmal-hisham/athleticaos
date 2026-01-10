import api from "./axios";

export const fetchTeams = (params?: { organisationId?: string }) => api.get("/teams", { params });

export const fetchTeamsByOrganisation = (organisationId: string) => api.get("/teams", { params: { organisationId } });

export const createTeam = (payload: {
    name: string;
    category: string;
    ageGroup: string;
    division: string;
    state: string;
    organisationId: string;
}) => api.post("/teams", payload);

export const updateTeam = (id: string, payload: {
    name?: string;
    category?: string;
    ageGroup?: string;
    division?: string;
    state?: string;
    status?: string;
}) => api.put(`/teams/${id}`, payload);

export const deleteTeam = (id: string) => api.delete(`/teams/${id}`);

export const fetchTeamById = (id: string) => api.get(`/teams/${id}`);

export const fetchTeamBySlug = (slug: string) => api.get(`/teams/slug/${slug}`);

export const fetchTeamStats = (teamId: string) => api.get(`/stats/teams/${teamId}`);

export const fetchTeamMatches = (teamId: string) => api.get(`/matches`, { params: { teamId } });

export const fetchTeamPlayers = (teamId: string) => api.get(`/teams/${teamId}/players`);
