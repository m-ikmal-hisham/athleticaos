import { create } from "zustand";
import { fetchTeams, createTeam } from "../api/teams.api";

export interface Team {
    id: string;
    name: string;
    category: string;
    ageGroup: string;
    division: string;
    state: string;
    status: string;
    organisationId: string;
}

interface TeamsState {
    teams: Team[];
    loading: boolean;
    error: string | null;
    getTeams: () => Promise<void>;
    saveTeam: (payload: any) => Promise<void>;
}

export const useTeamsStore = create<TeamsState>((set, get) => ({
    teams: [],
    loading: false,
    error: null,

    async getTeams() {
        set({ loading: true, error: null });
        try {
            const res = await fetchTeams();
            set({ teams: res.data, loading: false });
        } catch (err) {
            set({ loading: false, error: "Failed to load teams" });
        }
    },

    async saveTeam(payload) {
        // Placeholder for future implementation
        try {
            await createTeam(payload);
            await get().getTeams();
        } catch (err) {
            set({ error: "Failed to save team" });
        }
    }
}));
