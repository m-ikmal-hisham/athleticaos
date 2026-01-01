import axios from '@/lib/axios';
import { Tournament, TournamentCreateRequest, Team, Standings, TournamentFormatConfig } from '@/types';

export const tournamentService = {
    async getAll(): Promise<Tournament[]> {
        const response = await axios.get<Tournament[]>('/api/v1/tournaments');
        return response.data;
    },

    async getById(id: string): Promise<Tournament> {
        const response = await axios.get<Tournament>(`/api/v1/tournaments/${id}`);
        return response.data;
    },

    async getDashboard(id: string): Promise<any> {
        const response = await axios.get<any>(`/api/v1/tournaments/${id}/dashboard`);
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

    async getTeams(id: string): Promise<Team[]> {
        const response = await axios.get<Team[]>(`/api/v1/tournaments/${id}/teams`);
        return response.data;
    },

    async addTeams(id: string, teamIds: string[]): Promise<void> {
        await axios.post(`/api/v1/tournaments/${id}/teams`, { teamIds });
    },

    async removeTeam(id: string, teamId: string): Promise<void> {
        await axios.delete(`/api/v1/tournaments/${id}/teams/${teamId}`);
    },



    async getFormatConfig(id: string): Promise<TournamentFormatConfig> {
        const response = await axios.get<TournamentFormatConfig>(`/api/v1/tournaments/${id}/format`);
        return response.data;
    },

    async updateFormatConfig(id: string, config: TournamentFormatConfig): Promise<TournamentFormatConfig> {
        const response = await axios.post<TournamentFormatConfig>(`/api/v1/tournaments/${id}/format`, config);
        return response.data;
    },

    async createMatch(id: string, data: any): Promise<any> {
        const response = await axios.post(`/api/v1/tournaments/${id}/matches`, data);
        return response.data;
    },

    async clearSchedule(id: string, keepStructure: boolean = false): Promise<void> {
        await axios.delete(`/api/v1/tournaments/${id}/matches`, {
            params: { keepStructure }
        });
    },

    async updateStatus(id: string, status: string): Promise<void> {
        await axios.put(`/api/v1/tournaments/${id}/status`, null, {
            params: { status }
        });
    },

    async getStandings(id: string): Promise<Standings[]> {
        const response = await axios.get<Standings[]>(`/api/v1/tournaments/${id}/standings`);
        return response.data;
    },

    async getBracket(id: string): Promise<any> { // Using any for now to match backend response structure flexibility if needed
        const response = await axios.get<any>(`/api/v1/tournaments/${id}/bracket`);
        return response.data;
    },
    async getCategories(id: string): Promise<any[]> {
        const response = await axios.get<any[]>(`/api/v1/tournaments/${id}/categories`);
        return response.data;
    },

    async generateStructure(id: string, numberOfPools: number, categoryId?: string): Promise<any[]> {
        const response = await axios.post<any[]>(`/api/v1/tournaments/${id}/format/structure`, {
            categoryId,
            numberOfPools,
            // Format is currently global but structure generation might need it? 
            // The backend generateStructure takes BracketGenerationRequest which has categoryId and poolCount.
            // Format type is fetched from config usually on backend, or should be passed?
            // The request DTO doesn't have formatType, it assumes saved config. 
            // EXCEPT generateSchedule implementation.
            // Let's check backend controller. generateStructure calls tournamentService.generateStructure.
            // which calls formatService.generateStructure.
            // FormatService uses Tournament entity's format OR config?
            // FormatServiceImpl.generateStructure gets numberOfPools from request.
            // It doesn't seem to check formatType (Round Robin etc) explicitly for structure creation, 
            // assuming Pools if poolCount > 1.
        });
        return response.data;
    },

    async updateTeamPool(id: string, teamId: string, poolNumber: string | null): Promise<void> {
        await axios.patch(`/api/v1/tournaments/${id}/teams/${teamId}/pool`, null, {
            params: { poolNumber }
        });
    },

    // Refactoring generateSchedule to include categoryId if needed
    async generateSchedule(id: string, format: string, numberOfPools?: number, generateTimings?: boolean, useExistingGroups?: boolean, categoryId?: string): Promise<void> {
        await axios.post(`/api/v1/tournaments/${id}/format/generate`, {
            format,
            numberOfPools,
            generateTimings,
            useExistingGroups,
            categoryId
        });
    },
};
