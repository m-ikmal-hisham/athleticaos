import axios from '@/lib/axios';
import { Organisation, OrganisationCreateRequest } from '@/types';

export const organisationService = {
    async getAll(): Promise<Organisation[]> {
        const response = await axios.get<Organisation[]>('/api/v1/organisations');
        return response.data;
    },

    async getById(id: string): Promise<Organisation> {
        const response = await axios.get<Organisation>(`/api/v1/organisations/${id}`);
        return response.data;
    },

    async create(data: OrganisationCreateRequest): Promise<Organisation> {
        const response = await axios.post<Organisation>('/api/v1/organisations', data);
        return response.data;
    },

    async update(id: string, data: Partial<OrganisationCreateRequest>): Promise<Organisation> {
        const response = await axios.put<Organisation>(`/api/v1/organisations/${id}`, data);
        return response.data;
    },

    async delete(id: string): Promise<void> {
        await axios.delete(`/api/v1/organisations/${id}`);
    },
};
