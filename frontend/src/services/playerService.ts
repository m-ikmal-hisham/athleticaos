import axios from '@/lib/axios';
import { Player, PlayerCreateRequest } from '@/types';

export const playerService = {
    async getAll(): Promise<Player[]> {
        const response = await axios.get<Player[]>('/players');
        return response.data;
    },

    async getById(id: string): Promise<Player> {
        const response = await axios.get<Player>(`/players/${id}`);
        return response.data;
    },

    async create(data: PlayerCreateRequest): Promise<Player> {
        const response = await axios.post<Player>('/players', data);
        return response.data;
    },

    async update(id: string, data: Partial<PlayerCreateRequest>): Promise<Player> {
        const response = await axios.put<Player>(`/players/${id}`, data);
        return response.data;
    },

    async delete(id: string): Promise<void> {
        await axios.delete(`/players/${id}`);
    },
};
