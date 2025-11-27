import api from "./axios";

export const fetchTournaments = () => api.get("/tournaments");
