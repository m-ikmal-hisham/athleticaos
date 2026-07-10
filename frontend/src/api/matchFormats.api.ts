import api from "./axios";

export interface MatchFormatTemplate {
    formatCode: string;
    label: string;
    startingPlayers: number;
    substitutes: number;
    periods: number;
    periodDuration: number;
}

export const fetchMatchFormatTemplates = () => api.get<MatchFormatTemplate[]>("/match-formats/templates");
