import api from "./axios";

export const fetchTeams = () => api.get("/teams");

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
