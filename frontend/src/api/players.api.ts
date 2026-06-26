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


export const fetchPlayerStats = (playerId: string) =>
    api.get(`/stats/players/${playerId}`);

export const deletePlayer = (id: string) =>
    api.delete(`/players/${id}`);

