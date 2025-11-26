import { create } from 'zustand';
import { fetchPlayers } from '@/api/players.api';
import toast from 'react-hot-toast';

interface Player {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    club: string;
    status: 'Active' | 'Inactive';
}

interface PlayersState {
    players: Player[];
    loading: boolean;
    error: string | null;
    fetchPlayers: () => Promise<void>;
}

export const usePlayersStore = create<PlayersState>((set) => ({
    players: [],
    loading: false,
    error: null,
    fetchPlayers: async () => {
        set({ loading: true, error: null });
        try {
            const response = await fetchPlayers();
            set({ players: response.data, loading: false });
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Failed to load players';
            set({ error: errorMessage, loading: false });
            toast.error(errorMessage);
        }
    },
}));
