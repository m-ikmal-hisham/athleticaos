import axios from '@/lib/axios';
import { Player, PlayerCreateRequest } from '@/types';

export const playerService = {
    async getAll(): Promise<Player[]> {
        const response = await axios.get<Player[]>('/api/v1/players');
        return response.data;
    },

    async getById(id: string): Promise<Player> {
        const response = await axios.get<Player>(`/api/v1/players/${id}`);
        return response.data;
    },

    async create(data: PlayerCreateRequest): Promise<Player> {
        const response = await axios.post<Player>('/api/v1/players', data);
        return response.data;
    },

    async update(id: string, data: Partial<PlayerCreateRequest>): Promise<Player> {
        const response = await axios.put<Player>(`/api/v1/players/${id}`, data);
        return response.data;
    },

    async delete(id: string): Promise<void> {
        await axios.delete(`/api/v1/players/${id}`);
    },
};
