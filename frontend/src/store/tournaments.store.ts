import { create } from 'zustand';
import { fetchTournaments } from '@/api/tournaments.api';
import toast from 'react-hot-toast';

interface Tournament {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: 'Upcoming' | 'Ongoing' | 'Completed';
    location: string;
}

interface TournamentsState {
    tournaments: Tournament[];
    loading: boolean;
    error: string | null;
    fetchTournaments: () => Promise<void>;
}

export const useTournamentsStore = create<TournamentsState>((set) => ({
    tournaments: [],
    loading: false,
    error: null,
    fetchTournaments: async () => {
        set({ loading: true, error: null });
        try {
            const response = await fetchTournaments();
            set({ tournaments: response.data, loading: false });
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Failed to load tournaments';
            set({ error: errorMessage, loading: false });
            toast.error(errorMessage);
        }
    },
}));
