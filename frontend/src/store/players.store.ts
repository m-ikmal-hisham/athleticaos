import { create } from "zustand";
import {
    fetchPlayers,
    createPlayer,
    updatePlayer,
    togglePlayerStatus
} from "../api/players.api";
import { Player } from "../types";

interface PlayersState {
    players: Player[];
    filteredPlayers: Player[];
    loading: boolean;
    error: string | null;
    isModalOpen: boolean;
    mode: "create" | "edit";
    selectedPlayer: Player | null;
    // Drawer state
    selectedPlayerId: string | null;
    isDrawerOpen: boolean;
    // Filter state
    organisationFilter: string;
    teamFilter: string;
    statusFilter: string;
    searchQuery: string;
    // Actions
    getPlayers: () => Promise<void>;
    openCreateModal: () => void;
    openEditModal: (p: Player) => void;
    closeModal: () => void;
    savePlayer: (payload: any) => Promise<void>;
    toggleStatus: (id: string) => Promise<void>;
    // Drawer actions
    openPlayerDrawer: (playerId: string) => void;
    closePlayerDrawer: () => void;
    // Filter actions
    setOrganisationFilter: (org: string) => void;
    setTeamFilter: (team: string) => void;
    setStatusFilter: (status: string) => void;
    setSearchQuery: (query: string) => void;
    applyFilters: () => void;
}

export const usePlayersStore = create<PlayersState>((set, get) => ({
    players: [],
    filteredPlayers: [],
    loading: false,
    error: null,
    isModalOpen: false,
    mode: "create",
    selectedPlayer: null,
    selectedPlayerId: null,
    isDrawerOpen: false,
    organisationFilter: '',
    teamFilter: '',
    statusFilter: 'ALL',
    searchQuery: '',

    async getPlayers() {
        set({ loading: true, error: null });
        try {
            const res = await fetchPlayers();
            set({ players: res.data, filteredPlayers: res.data, loading: false });
            get().applyFilters();
        } catch (err) {
            set({ loading: false, error: "Failed to load players" });
        }
    },

    openCreateModal() {
        set({ isModalOpen: true, mode: "create", selectedPlayer: null });
    },

    openEditModal(player) {
        set({ isModalOpen: true, mode: "edit", selectedPlayer: player });
    },

    closeModal() {
        set({ isModalOpen: false, selectedPlayer: null });
    },

    async savePlayer(payload) {
        const { getPlayers, mode, selectedPlayer } = get();
        try {
            if (mode === "edit" && selectedPlayer?.id) {
                await updatePlayer(selectedPlayer.id, payload);
            } else {
                await createPlayer(payload);
            }
            await getPlayers();
            set({ isModalOpen: false, selectedPlayer: null });
        } catch (err) {
            set({ error: "Failed to save player" });
        }
    },

    async toggleStatus(id) {
        try {
            await togglePlayerStatus(id);
            await get().getPlayers();
        } catch {
            set({ error: "Failed to toggle status" });
        }
    },

    openPlayerDrawer(playerId) {
        set({ selectedPlayerId: playerId, isDrawerOpen: true });
    },

    closePlayerDrawer() {
        set({ selectedPlayerId: null, isDrawerOpen: false });
    },

    setOrganisationFilter(org) {
        set({ organisationFilter: org });
        get().applyFilters();
    },

    setTeamFilter(team) {
        set({ teamFilter: team });
        get().applyFilters();
    },

    setStatusFilter(status) {
        set({ statusFilter: status });
        get().applyFilters();
    },

    setSearchQuery(query) {
        set({ searchQuery: query });
        get().applyFilters();
    },

    applyFilters() {
        const { players, statusFilter, searchQuery } = get();
        let filtered = [...players];

        if (statusFilter && statusFilter !== 'ALL') {
            filtered = filtered.filter(p => p.status === statusFilter);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.firstName.toLowerCase().includes(query) ||
                p.lastName.toLowerCase().includes(query) ||
                (p.email && p.email.toLowerCase().includes(query))
            );
        }

        set({ filteredPlayers: filtered });
    }
}));

