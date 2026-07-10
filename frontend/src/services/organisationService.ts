import axios from '@/lib/axios';
import { Organisation, OrganisationCreateRequest } from '@/types';

export const organisationService = {
    async getAll(): Promise<Organisation[]> {
        const response = await axios.get<Organisation[]>('/organisations');
        return response.data;
    },

    async getById(id: string): Promise<Organisation> {
        const response = await axios.get<Organisation>(`/organisations/${id}`);
        return response.data;
    },

    async create(data: OrganisationCreateRequest): Promise<Organisation> {
        const response = await axios.post<Organisation>('/organisations', data);
        return response.data;
    },

    async update(id: string, data: Partial<OrganisationCreateRequest>): Promise<Organisation> {
        const response = await axios.put<Organisation>(`/organisations/${id}`, data);
        return response.data;
    },

    async delete(id: string): Promise<void> {
        await axios.delete(`/organisations/${id}`);
    },
};
