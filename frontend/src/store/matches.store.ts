
import { create } from "zustand";
import {
    fetchMatches,
    fetchMatchById,
    fetchMatchEvents,
    createMatchEvent,
    deleteMatchEvent,
    updateMatch
} from "../api/matches.api";
import { fetchPlayers } from "../api/players.api";

export type MatchStatus = "SCHEDULED" | "ONGOING" | "COMPLETED" | "CANCELLED";

export interface MatchItem {
    id: string;
    tournamentId: string;
    tournamentName: string;
    homeTeamId: string;
    homeTeamOrgId: string;
    homeTeamName: string;
    awayTeamId: string;
    awayTeamOrgId: string;
    awayTeamName: string;
    matchDate: string;      // ISO date
    kickOffTime: string;    // e.g. "16:30:00"
    venue?: string | null;
    status: MatchStatus;
    phase?: string | null;
    matchCode?: string | null;
    homeScore?: number;
    awayScore?: number;
}

export interface MatchEventItem {
    id: string;
    matchId: string;
    teamId: string;
    teamName: string;
    playerId?: string | null;
    playerName?: string | null;
    eventType: string;  // "TRY", "CONVERSION", etc.
    minute?: number | null;
    notes?: string | null;
}

export interface PlayerItem {
    id: string;
    firstName: string;
    lastName: string;
    clubName?: string;
    organisationId?: string;
}

interface MatchFilter {
    tournamentId?: string;
    status?: MatchStatus | "ALL";
}

interface MatchState {
    filters: MatchFilter;
    matches: MatchItem[];
    selectedMatch: MatchItem | null;
    events: MatchEventItem[];
    players: PlayerItem[];
    loadingList: boolean;
    loadingDetail: boolean;
    error?: string | null;
    setFilters: (partial: Partial<MatchFilter>) => void;
    loadMatches: () => Promise<void>;
    loadMatchDetail: (matchId: string) => Promise<void>;
    addEvent: (matchId: string, event: Omit<MatchEventItem, "id">) => Promise<void>;
    removeEvent: (eventId: string, matchId: string) => Promise<void>;
    cancelMatch: (matchId: string) => Promise<void>;
    loadPlayers: () => Promise<void>;
}

export const useMatchesStore = create<MatchState>((set, get) => ({
    filters: { status: "ALL" },
    matches: [],
    selectedMatch: null,
    events: [],
    players: [],
    loadingList: false,
    loadingDetail: false,
    error: null,

    setFilters: (partial) => {
        set((state) => ({ filters: { ...state.filters, ...partial } }));
        get().loadMatches();
    },

    loadMatches: async () => {
        set({ loadingList: true, error: null });
        try {
            const { filters } = get();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const params: any = {};
            if (filters.tournamentId) params.tournamentId = filters.tournamentId;
            if (filters.status && filters.status !== "ALL") params.status = filters.status;

            const response = await fetchMatches(params);
            set({ matches: response.data });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error("Failed to load matches", error);
            set({ error: "Failed to load matches" });
        } finally {
            set({ loadingList: false });
        }
    },

    loadMatchDetail: async (matchId: string) => {
        set({ loadingDetail: true, error: null, selectedMatch: null, events: [] });
        try {
            const [matchRes, eventsRes] = await Promise.all([
                fetchMatchById(matchId),
                fetchMatchEvents(matchId)
            ]);
            set({ selectedMatch: matchRes.data, events: eventsRes.data });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error("Failed to load match detail", error);
            set({ error: "Failed to load match detail" });
        } finally {
            set({ loadingDetail: false });
        }
    },

    loadPlayers: async () => {
        try {
            const response = await fetchPlayers();
            set({ players: response.data });
        } catch (error) {
            console.error("Failed to load players", error);
        }
    },

    addEvent: async (matchId, event) => {
        try {
            await createMatchEvent(matchId, event);
            // Refresh events
            const eventsRes = await fetchMatchEvents(matchId);
            set({ events: eventsRes.data });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error("Failed to add event", error);
            set({ error: "Failed to add event" });
        }
    },

    removeEvent: async (eventId, matchId) => {
        try {
            await deleteMatchEvent(eventId);
            // Refresh events
            const eventsRes = await fetchMatchEvents(matchId);
            set({ events: eventsRes.data });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error("Failed to remove event", error);
            set({ error: "Failed to remove event" });
        }
    },

    cancelMatch: async (matchId) => {
        try {
            const { selectedMatch } = get();
            if (!selectedMatch) return;

            // Create update payload with CANCELLED status
            const updatePayload = {
                matchDate: selectedMatch.matchDate,
                kickOffTime: selectedMatch.kickOffTime,
                venue: selectedMatch.venue,
                status: 'CANCELLED',
                homeScore: selectedMatch.homeScore,
                awayScore: selectedMatch.awayScore,
                phase: selectedMatch.phase,
                matchCode: selectedMatch.matchCode
            };

            await updateMatch(matchId, updatePayload);

            // Update local state
            set({ selectedMatch: { ...selectedMatch, status: 'CANCELLED' } });

            // Update in list as well
            const { matches } = get();
            const updatedMatches = matches.map(m => m.id === matchId ? { ...m, status: 'CANCELLED' as MatchStatus } : m);
            set({ matches: updatedMatches });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error("Failed to cancel match", error);
            set({ error: "Failed to cancel match" });
        }
    }
}));
