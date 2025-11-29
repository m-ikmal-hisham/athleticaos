import { create } from "zustand";
import {
    fetchTournamentSummary,
    fetchTournamentPlayerStats,
    fetchTournamentTeamStats,
    fetchTournamentLeaderboard
} from "../api/stats.api";

interface TournamentSummary {
    tournamentId: string;
    tournamentName: string;
    totalMatches: number;
    completedMatches: number;
    totalTries: number;
    totalPoints: number;
    totalYellowCards: number;
    totalRedCards: number;
}

interface PlayerLeaderboardEntry {
    playerId: string;
    firstName: string;
    lastName: string;
    teamName: string | null;
    tries: number;
    totalPoints: number;
}

interface TeamLeaderboardEntry {
    teamId: string;
    teamName: string;
    organisationName: string | null;
    wins: number;
    triesScored: number;
    tablePoints: number;
}

interface StatsState {
    selectedTournamentId: string | null;
    summary: TournamentSummary | null;
    playerStats: PlayerLeaderboardEntry[];
    teamStats: TeamLeaderboardEntry[];
    loading: boolean;
    error: string | null;
    setSelectedTournamentId: (id: string | null) => void;
    loadStatsForTournament: (id: string) => Promise<void>;
}

export const useStatsStore = create<StatsState>((set) => ({
    selectedTournamentId: null,
    summary: null,
    playerStats: [],
    teamStats: [],
    loading: false,
    error: null,

    setSelectedTournamentId(id) {
        set({ selectedTournamentId: id });
    },

    async loadStatsForTournament(id) {
        set({ loading: true, error: null });
        try {
            const [summaryRes, playersRes, teamsRes, leaderboardRes] = await Promise.all([
                fetchTournamentSummary(id),
                fetchTournamentPlayerStats(id),
                fetchTournamentTeamStats(id),
                fetchTournamentLeaderboard(id)
            ]);

            // Use leaderboard's top lists as primary
            const leaderboard = leaderboardRes.data;

            set({
                selectedTournamentId: id,
                summary: summaryRes.data,
                playerStats: leaderboard.topPlayers ?? playersRes.data ?? [],
                teamStats: leaderboard.topTeams ?? teamsRes.data ?? [],
                loading: false
            });
        } catch (e) {
            set({
                loading: false,
                error: "Failed to load tournament statistics"
            });
        }
    }
}));
