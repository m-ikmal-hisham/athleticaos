import axios from '@/lib/axios';
import { Team, TeamCreateRequest } from '@/types';

export const teamService = {
    async getAll(): Promise<Team[]> {
        const response = await axios.get<Team[]>('/api/v1/teams');
        return response.data;
    },

    async getById(id: string): Promise<Team> {
        const response = await axios.get<Team>(`/api/v1/teams/${id}`);
        return response.data;
    },

    async create(data: TeamCreateRequest): Promise<Team> {
        const response = await axios.post<Team>('/api/v1/teams', data);
        return response.data;
    },

    async update(id: string, data: Partial<TeamCreateRequest>): Promise<Team> {
        const response = await axios.put<Team>(`/api/v1/teams/${id}`, data);
        return response.data;
    },

    async delete(id: string): Promise<void> {
        await axios.delete(`/api/v1/teams/${id}`);
    },
};
