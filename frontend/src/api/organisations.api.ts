import api from "./axios";

export const fetchOrganisations = () => api.get("/organisations");
