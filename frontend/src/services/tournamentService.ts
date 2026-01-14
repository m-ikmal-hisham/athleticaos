import axios from '@/lib/axios';
import { Tournament, TournamentCreateRequest, Team, Standings, TournamentFormatConfig } from '@/types';

export const tournamentService = {
    async getAll(): Promise<Tournament[]> {
        const response = await axios.get<Tournament[]>('/tournaments');
        return response.data;
    },

    async getById(id: string): Promise<Tournament> {
        const response = await axios.get<Tournament>(`/tournaments/${id}`);
        return response.data;
    },

    async getDashboard(id: string): Promise<any> {
        const response = await axios.get<any>(`/tournaments/${id}/dashboard`);
        return response.data;
    },

    async create(data: TournamentCreateRequest): Promise<Tournament> {
        const response = await axios.post<Tournament>('/tournaments', data);
        return response.data;
    },

    async update(id: string, data: Partial<TournamentCreateRequest>): Promise<Tournament> {
        const response = await axios.put<Tournament>(`/tournaments/${id}`, data);
        return response.data;
    },

    async delete(id: string): Promise<void> {
        await axios.delete(`/tournaments/${id}`);
    },

    async getTeams(id: string): Promise<Team[]> {
        const response = await axios.get<Team[]>(`/tournaments/${id}/teams`);
        return response.data;
    },

    async addTeams(id: string, teamIds: string[]): Promise<void> {
        await axios.post(`/tournaments/${id}/teams`, { teamIds });
    },

    async removeTeam(id: string, teamId: string): Promise<void> {
        await axios.delete(`/tournaments/${id}/teams/${teamId}`);
    },

    async removeTeams(id: string, teamIds: string[]): Promise<void> {
        await axios.post(`/tournaments/${id}/teams/remove`, { teamIds });
    },

    async getFormatConfig(id: string, categoryId?: string): Promise<TournamentFormatConfig> {
        const response = await axios.get<TournamentFormatConfig>(`/tournaments/${id}/format`, {
            params: { categoryId }
        });
        return response.data;
    },

    async updateFormatConfig(id: string, config: TournamentFormatConfig): Promise<TournamentFormatConfig> {
        const response = await axios.post<TournamentFormatConfig>(`/tournaments/${id}/format`, config);
        return response.data;
    },

    async createMatch(id: string, data: any): Promise<any> {
        const response = await axios.post(`/tournaments/${id}/matches`, data);
        return response.data;
    },

    async clearSchedule(id: string, keepStructure: boolean = false): Promise<void> {
        await axios.delete(`/tournaments/${id}/matches`, {
            params: { keepStructure }
        });
    },

    async updateStatus(id: string, status: string): Promise<void> {
        await axios.put(`/tournaments/${id}/status`, null, {
            params: { status }
        });
    },

    async getStandings(id: string): Promise<Standings[]> {
        const response = await axios.get<Standings[]>(`/tournaments/${id}/standings`);
        return response.data;
    },

    async getBracket(id: string): Promise<any> { // Using any for now to match backend response structure flexibility if needed
        const response = await axios.get<any>(`/tournaments/${id}/bracket`);
        return response.data;
    },
    async getCategories(id: string): Promise<any[]> {
        const response = await axios.get<any[]>(`/tournaments/${id}/categories`);
        return response.data;
    },

    async generateStructure(id: string, numberOfPools: number, categoryId?: string): Promise<any[]> {
        const response = await axios.post<any[]>(`/tournaments/${id}/format/structure`, {
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
        await axios.patch(`/tournaments/${id}/teams/${teamId}/pool`, null, {
            params: { poolNumber }
        });
    },

    async updateStage(id: string, stageId: string, data: { name: string }): Promise<void> {
        await axios.put(`/tournaments/${id}/stages/${stageId}`, data);
    },

    // Refactoring generateSchedule to include categoryId if needed
    async generateSchedule(id: string, format: string, numberOfPools?: number, generateTimings?: boolean, useExistingGroups?: boolean, categoryId?: string, includePlacementStages?: boolean, teamIds?: string[]): Promise<void> {
        await axios.post(`/tournaments/${id}/format/generate`, {
            format,
            numberOfPools,
            generateTimings,
            useExistingGroups,
            categoryId,
            includePlacementStages,
            teamIds
        });
    },
};
