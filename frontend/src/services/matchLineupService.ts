import axios from '@/lib/axios';
import { MatchLineupEntry } from '@/types'; // Need to update types

export const matchLineupService = {
    async getLineup(matchId: string, teamId: string): Promise<MatchLineupEntry[]> {
        const response = await axios.get<MatchLineupEntry[]>(`/api/matches/${matchId}/lineup`, {
            params: { teamId }
        });
        return response.data;
    },

    async updateLineup(matchId: string, teamId: string, entries: MatchLineupEntry[]): Promise<MatchLineupEntry[]> {
        const response = await axios.put<MatchLineupEntry[]>(`/api/matches/${matchId}/lineup`, {
            teamId,
            entries
        });
        return response.data;
    },

    async getHints(matchId: string): Promise<any> {
        const response = await axios.get(`/api/matches/${matchId}/lineup/hints`);
        return response.data;
    }
};
