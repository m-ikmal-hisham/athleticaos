import axios from '@/lib/axios';
import { Team, TeamCreateRequest, TeamPlayer } from '@/types';

export const teamService = {
    async getAll(): Promise<Team[]> {
        const response = await axios.get<Team[]>('/teams');
        return response.data;
    },

    async getById(id: string): Promise<Team> {
        const response = await axios.get<Team>(`/teams/${id}`);
        return response.data;
    },

    async create(data: TeamCreateRequest): Promise<Team> {
        const response = await axios.post<Team>('/teams', data);
        return response.data;
    },

    async update(id: string, data: Partial<TeamCreateRequest>): Promise<Team> {
        const response = await axios.put<Team>(`/teams/${id}`, data);
        return response.data;
    },

    async delete(id: string): Promise<void> {
        await axios.delete(`/teams/${id}`);
    },

    async getPlayers(id: string): Promise<TeamPlayer[]> {
        const response = await axios.get<TeamPlayer[]>(`/teams/${id}/players`);
        return response.data;
    },
};
