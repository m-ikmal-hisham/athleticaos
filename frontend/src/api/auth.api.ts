import api from './axios';

export const authApi = {
    login: async (credentials: { email: string; password: string }) => {
        const response = await api.post('/auth/login', credentials);
        return response;
    },

    register: async (data: { firstName: string; lastName: string; email: string; password: string; roles: string[] }) => {
        const response = await api.post('/auth/register', data);
        return response;
    },

    getMe: async () => {
        const response = await api.get('/auth/me');
        return response;
    },

    verifyToken: async () => {
        // Simple endpoint call to verify token is still valid
        const response = await api.get('/auth/me');
        return response;
    },

    getUserRoles: async () => {
        const response = await api.get('/auth/me/roles');
        return response;
    },

    logout: async () => {
        const response = await api.post('/auth/logout');
        return response;
    },
};
