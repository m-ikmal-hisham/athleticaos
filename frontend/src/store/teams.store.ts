import { create } from "zustand";
import { fetchTeams, createTeam } from "../api/teams.api";
import { Team } from "../types";

interface TeamsState {
    teams: Team[];
    filteredTeams: Team[];
    loading: boolean;
    error: string | null;
    selectedTeam: Team | null;
    // Filter state
    organisationFilter: string;
    categoryFilter: string;
    ageGroupFilter: string;
    stateFilter: string;
    // Actions
    getTeams: () => Promise<void>;
    getTeamById: (id: string) => Promise<void>;
    saveTeam: (payload: any) => Promise<void>;
    // Filter actions
    setOrganisationFilter: (org: string) => void;
    setCategoryFilter: (category: string) => void;
    setAgeGroupFilter: (ageGroup: string) => void;
    setStateFilter: (state: string) => void;
    applyFilters: () => void;
}

export const useTeamsStore = create<TeamsState>((set, get) => ({
    teams: [],
    filteredTeams: [],
    loading: false,
    error: null,
    selectedTeam: null,
    organisationFilter: '',
    categoryFilter: '',
    ageGroupFilter: '',
    stateFilter: '',

    async getTeams() {
        set({ loading: true, error: null });
        try {
            const res = await fetchTeams();
            set({ teams: res.data, filteredTeams: res.data, loading: false });
            get().applyFilters();
        } catch (err) {
            set({ loading: false, error: "Failed to load teams" });
        }
    },

    async getTeamById(id: string) {
        try {
            const res = await fetchTeams();
            const team = res.data.find((t: Team) => t.id === id);
            set({ selectedTeam: team || null });
        } catch (err) {
            set({ error: "Failed to load team" });
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
    },

    setOrganisationFilter(org) {
        set({ organisationFilter: org });
        get().applyFilters();
    },

    setCategoryFilter(category) {
        set({ categoryFilter: category });
        get().applyFilters();
    },

    setAgeGroupFilter(ageGroup) {
        set({ ageGroupFilter: ageGroup });
        get().applyFilters();
    },

    setStateFilter(state) {
        set({ stateFilter: state });
        get().applyFilters();
    },

    applyFilters() {
        const { teams, organisationFilter, categoryFilter, ageGroupFilter, stateFilter } = get();
        let filtered = [...teams];

        if (organisationFilter) {
            filtered = filtered.filter(t => t.organisationName === organisationFilter);
        }

        if (categoryFilter) {
            filtered = filtered.filter(t => t.category === categoryFilter);
        }

        if (ageGroupFilter) {
            filtered = filtered.filter(t => t.ageGroup === ageGroupFilter);
        }

        if (stateFilter) {
            filtered = filtered.filter(t => t.state === stateFilter);
        }

        set({ filteredTeams: filtered });
    }
}));
