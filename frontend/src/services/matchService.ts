import axios from '@/lib/axios';
import { Match, MatchCreateRequest } from '@/types';

export const matchService = {
    async getAll(): Promise<Match[]> {
        const response = await axios.get<Match[]>('/api/v1/matches');
        return response.data;
    },

    async getById(id: string): Promise<Match> {
        const response = await axios.get<Match>(`/api/v1/matches/${id}`);
        return response.data;
    },

    async create(data: MatchCreateRequest): Promise<Match> {
        const response = await axios.post<Match>('/api/v1/matches', data);
        return response.data;
    },

    async update(id: string, data: Partial<MatchCreateRequest>): Promise<Match> {
        const response = await axios.put<Match>(`/api/v1/matches/${id}`, data);
        return response.data;
    },

    async delete(id: string): Promise<void> {
        await axios.delete(`/api/v1/matches/${id}`);
    },
};
