import axios from '@/lib/axios';
import { User } from '@/types';

export const userService = {
    async getAll(): Promise<User[]> {
        const response = await axios.get<User[]>('/users');
        return response.data;
    },

    async getById(id: string): Promise<User> {
        const response = await axios.get<User>(`/users/${id}`);
        return response.data;
    },

    async update(id: string, data: Partial<User>): Promise<User> {
        const response = await axios.put<User>(`/users/${id}`, data);
        return response.data;
    },

    async delete(id: string): Promise<void> {
        await axios.delete(`/users/${id}`);
    },

    async resendInvite(id: string): Promise<{ message?: string; emailSent?: boolean }> {
        const response = await axios.post<{ message?: string; emailSent?: boolean }>(`/users/${id}/resend-invite`);
        return response.data;
    },
};
