import { create } from "zustand";
import { fetchTournaments } from "../api/tournaments.api";
import { Tournament } from "../types";

interface TournamentsState {
    tournaments: Tournament[];
    loading: boolean;
    error: string | null;
    getTournaments: () => Promise<void>;
}

export const useTournamentsStore = create<TournamentsState>((set) => ({
    tournaments: [],
    loading: false,
    error: null,

    async getTournaments() {
        set({ loading: true, error: null });
        try {
            const res = await fetchTournaments();
            set({ tournaments: res.data, loading: false });
        } catch (err) {
            set({ loading: false, error: "Failed to load tournaments" });
        }
    }
}));
