import api from './axios';

export const authApi = {
    login: async (credentials: { email: string; password: string }) => {
        const response = await api.post('/auth/login', credentials);
        return response;
    },

    register: async (data: any) => {
        const response = await api.post('/auth/register', data);
        return response;
    },

    getMe: async () => {
        const response = await api.get('/auth/me');
        return response;
    },
};
