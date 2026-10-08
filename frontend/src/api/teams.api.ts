import api from "./axios";

export interface TeamOption {
    id: string;
    name: string;
    shortName?: string | null;
    organisationId: string;
    category: string;
}

export const fetchTeams = (params?: { organisationId?: string }) => api.get("/teams", { params });

export const fetchTeamOptions = (organisationId?: string) =>
    api.get<TeamOption[]>("/teams/options", { params: organisationId ? { organisationId } : undefined }).then(res => res.data);

export const fetchTeamsByOrganisation = (organisationId: string) => api.get("/teams", { params: { organisationId } });

export const createTeam = (payload: {
    name: string;
    category: string;
    ageGroup: string;
    division: string;
    state: string;
    organisationId: string;
}) => api.post("/teams", payload);

export const createBulkTeams = (payload: any[]) => api.post("/teams/bulk", payload);

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

export const fetchTeamStats = (teamId: string, tournamentId?: string) => api.get(`/stats/teams/${teamId}`, { params: { tournamentId } });

export const fetchTeamMatches = (teamId: string) => api.get(`/matches`, { params: { teamId } });

export const fetchTeamPlayers = (teamId: string, tournamentId?: string) => api.get(`/teams/${teamId}/players`, { params: { tournamentId } });

export interface AdminTeamFiltersResponse {
    organisations: Array<{ id: string; name: string }>;
    categories: string[];
    ageGroups: string[];
    states: string[];
}

export interface GetAdminTeamsPageParams {
    page?: number;
    size?: number;
    search?: string;
    organisationId?: string;
    category?: string;
    ageGroup?: string;
    state?: string;
    sort?: 'name' | string;
}

export interface TeamCategoryCountsParams {
    search?: string;
    organisationId?: string;
    ageGroup?: string;
    state?: string;
}

export const fetchTeamsPage = (params: GetAdminTeamsPageParams = {}): Promise<import("../types").PageResponse<import("../types").Team>> =>
    api.get("/teams", { params }).then(res => res.data);

export const fetchTeamFilters = (): Promise<AdminTeamFiltersResponse> =>
    api.get<AdminTeamFiltersResponse>("/teams/filters").then(res => res.data);

export const fetchTeamCategoryCounts = (params?: TeamCategoryCountsParams): Promise<Record<string, number>> =>
    api.get<Record<string, number>>("/teams/category-counts", { params }).then(res => res.data);
