import axios from '@/lib/axios';
import { Tournament, TournamentCreateRequest } from '@/types';

export const tournamentService = {
    async getAll(): Promise<Tournament[]> {
        const response = await axios.get<Tournament[]>('/api/v1/tournaments');
        return response.data;
    },

    async getById(id: string): Promise<Tournament> {
        const response = await axios.get<Tournament>(`/api/v1/tournaments/${id}`);
        return response.data;
    },

    async create(data: TournamentCreateRequest): Promise<Tournament> {
        const response = await axios.post<Tournament>('/api/v1/tournaments', data);
        return response.data;
    },

    async update(id: string, data: Partial<TournamentCreateRequest>): Promise<Tournament> {
        const response = await axios.put<Tournament>(`/api/v1/tournaments/${id}`, data);
        return response.data;
    },

    async delete(id: string): Promise<void> {
        await axios.delete(`/api/v1/tournaments/${id}`);
    },
};
