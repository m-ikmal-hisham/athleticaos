import { create } from "zustand";
import {
    fetchPlayers,
    createPlayer,
    updatePlayer,
    togglePlayerStatus
} from "../api/players.api";

export interface Player {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role?: string;
    status?: string;
    clubName?: string | null;
}

interface PlayersState {
    players: Player[];
    loading: boolean;
    error: string | null;
    isModalOpen: boolean;
    mode: "create" | "edit";
    selectedPlayer: Player | null;
    getPlayers: () => Promise<void>;
    openCreateModal: () => void;
    openEditModal: (p: Player) => void;
    closeModal: () => void;
    savePlayer: (payload: {
        id?: number;
        firstName: string;
        lastName: string;
        email: string;
    }) => Promise<void>;
    toggleStatus: (id: number) => Promise<void>;
}

export const usePlayersStore = create<PlayersState>((set, get) => ({
    players: [],
    loading: false,
    error: null,
    isModalOpen: false,
    mode: "create",
    selectedPlayer: null,

    async getPlayers() {
        set({ loading: true, error: null });
        try {
            const res = await fetchPlayers();
            set({ players: res.data, loading: false });
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
    }
}));
