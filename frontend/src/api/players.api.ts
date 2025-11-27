import api from "./axios";

export const fetchPlayers = () =>
    api.get("/users", { params: { role: "PLAYER" } });

export const createPlayer = (payload: {
    firstName: string;
    lastName: string;
    email: string;
}) => api.post("/users", payload);

export const updatePlayer = (id: number, payload: {
    firstName: string;
    lastName: string;
    email: string;
    status?: string;
}) => api.put(`/users/${id}`, payload);

export const togglePlayerStatus = (id: number) =>
    api.patch(`/users/${id}/status`);
