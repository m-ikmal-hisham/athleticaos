import axios from '@/lib/axios';
import { Match, MatchCreateRequest } from '@/types';

export const matchService = {
    async getAll(): Promise<Match[]> {
        const response = await axios.get<Match[]>('/matches');
        return response.data;
    },

    async getById(id: string): Promise<Match> {
        const response = await axios.get<Match>(`/matches/${id}`);
        return response.data;
    },

    async create(data: MatchCreateRequest): Promise<Match> {
        const response = await axios.post<Match>('/matches', data);
        return response.data;
    },

    async update(id: string, data: Partial<MatchCreateRequest>): Promise<Match> {
        const response = await axios.put<Match>(`/matches/${id}`, data);
        return response.data;
    },

    async delete(id: string): Promise<void> {
        await axios.delete(`/matches/${id}`);
    },

    async getByTournament(tournamentId: string): Promise<Match[]> {
        const response = await axios.get<Match[]>(`/tournaments/${tournamentId}/matches`);
        return response.data;
    },
};
