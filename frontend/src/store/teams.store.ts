import { create } from 'zustand';
import { fetchTeams } from '@/api/teams.api';
import toast from 'react-hot-toast';

interface Team {
    id: string;
    name: string;
    division: string;
    state: string;
    status: 'Active' | 'Inactive';
}

interface TeamsState {
    teams: Team[];
    loading: boolean;
    error: string | null;
    fetchTeams: () => Promise<void>;
}

export const useTeamsStore = create<TeamsState>((set) => ({
    teams: [],
    loading: false,
    error: null,
    fetchTeams: async () => {
        set({ loading: true, error: null });
        try {
            const response = await fetchTeams();
            set({ teams: response.data, loading: false });
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Failed to load teams';
            set({ error: errorMessage, loading: false });
            toast.error(errorMessage);
        }
    },
}));
