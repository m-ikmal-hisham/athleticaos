import api from "./axios";
import { PlayerCreateRequest, PlayerUpdateRequest } from "../types";

export const fetchPlayers = (params?: { teamId?: string; organisationId?: string }) =>
    api.get("/players", { params });

export const fetchPlayersByOrganisation = (organisationId: string) =>
    api.get("/players", { params: { organisationId } });

export const createPlayer = (payload: PlayerCreateRequest) =>
    api.post("/players", payload);

export const createBulkPlayers = (payload: PlayerCreateRequest[]) =>
    api.post("/players/bulk", payload);

export const createBatchPlayers = (teamId: string, payload: any[]) =>
    api.post(`/teams/${teamId}/players/batch`, payload);

export const updatePlayer = (id: string, payload: PlayerUpdateRequest) =>
    api.put(`/players/${id}`, payload);

export const togglePlayerStatus = (id: string) =>
    api.patch(`/players/${id}/status`);

export const fetchPlayerById = (id: string) =>
    api.get(`/players/${id}`);

export const fetchCurrentPlayer = () =>
    api.get(`/players/me`);


export const fetchPlayerStats = (playerId: string, tournamentId?: string) =>
    api.get(`/stats/players/${playerId}`, { params: { tournamentId } });

export const deletePlayer = (id: string) =>
    api.delete(`/players/${id}`);

export interface GetAdminPlayersPageParams {
    page?: number;
    size?: number;
    search?: string;
    status?: string;
    organisationId?: string;
    teamId?: string;
    sort?: 'recent' | 'name' | string;
}

export interface PlayerStatusCountsParams {
    search?: string;
    organisationId?: string;
    teamId?: string;
}

export const fetchPlayersPage = (params: GetAdminPlayersPageParams = {}): Promise<import("../types").PageResponse<import("../types").Player>> =>
    api.get("/players", { params }).then(res => res.data);

export const fetchPlayerStatusCounts = (params?: PlayerStatusCountsParams): Promise<Record<string, number>> =>
    api.get("/players/status-counts", { params }).then(res => res.data);

