import api from "./axios";
import { PlayerCreateRequest, PlayerUpdateRequest } from "../types";

export const fetchPlayers = () =>
    api.get("/players");

export const createPlayer = (payload: PlayerCreateRequest) =>
    api.post("/players", payload);

export const updatePlayer = (id: string, payload: PlayerUpdateRequest) =>
    api.put(`/players/${id}`, payload);

export const togglePlayerStatus = (id: string) =>
    api.patch(`/players/${id}/status`);

export const fetchPlayerById = (id: string) =>
    api.get(`/players/${id}`);

export const fetchPlayerStats = (playerId: string) =>
    api.get(`/stats/players/${playerId}`);

