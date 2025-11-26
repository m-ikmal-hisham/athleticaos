import axios from '@/lib/axios';
import { User } from '@/types';

export const userService = {
    async getAll(): Promise<User[]> {
        const response = await axios.get<User[]>('/api/v1/users');
        return response.data;
    },

    async getById(id: string): Promise<User> {
        const response = await axios.get<User>(`/api/v1/users/${id}`);
        return response.data;
    },

    async update(id: string, data: Partial<User>): Promise<User> {
        const response = await axios.put<User>(`/api/v1/users/${id}`, data);
        return response.data;
    },

    async delete(id: string): Promise<void> {
        await axios.delete(`/api/v1/users/${id}`);
    },
};
