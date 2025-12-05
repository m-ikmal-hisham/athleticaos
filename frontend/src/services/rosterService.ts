import axios from '@/lib/axios';
import {
    TournamentPlayerDTO,
    PlayerSuspensionDTO,
    LineupHintsDTO,
    AddPlayersToRosterRequest
} from '@/types/roster.types';

export const rosterService = {
    // Roster Management
    async getRoster(tournamentId: string, teamId: string): Promise<TournamentPlayerDTO[]> {
        const response = await axios.get<TournamentPlayerDTO[]>(`/api/tournaments/${tournamentId}/roster/${teamId}`);
        return response.data;
    },

    async addPlayersToRoster(tournamentId: string, teamId: string, playerIds: string[]): Promise<TournamentPlayerDTO[]> {
        const request: AddPlayersToRosterRequest = { playerIds };
        const response = await axios.post<TournamentPlayerDTO[]>(`/api/tournaments/${tournamentId}/roster/${teamId}`, request);
        return response.data;
    },

    async removePlayerFromRoster(tournamentId: string, tournamentPlayerId: string): Promise<void> {
        await axios.delete(`/api/tournaments/${tournamentId}/roster/${tournamentPlayerId}`);
    },

    // Suspensions
    async getActiveSuspensions(tournamentId: string): Promise<PlayerSuspensionDTO[]> {
        const response = await axios.get<PlayerSuspensionDTO[]>(`/api/tournaments/${tournamentId}/suspensions`);
        return response.data;
    },

    async getPlayerSuspensions(tournamentId: string, playerId: string): Promise<PlayerSuspensionDTO[]> {
        const response = await axios.get<PlayerSuspensionDTO[]>(`/api/tournaments/${tournamentId}/suspensions/player/${playerId}`);
        return response.data;
    },

    // Lineup Hints
    async getLineupHints(matchId: string): Promise<LineupHintsDTO> {
        const response = await axios.get<LineupHintsDTO>(`/api/matches/${matchId}/lineup-hints`);
        return response.data;
    }
};
