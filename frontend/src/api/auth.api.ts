import api from './axios';

export const authApi = {
    login: async (credentials: { email: string; password: string }) => {
        const response = await api.post('/auth/login', credentials);
        return response;
    },

    // Unauthenticated: verifies email + current password server-side, then sets the session cookie
    changePassword: async (data: { email: string; currentPassword: string; newPassword: string }) => {
        const response = await api.post('/auth/change-password', data);
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

    getFeatures: async () => {
        const response = await api.get<{ accountEmails: boolean }>('/auth/features');
        return response;
    },

    getInviteDetails: async (token: string) => {
        const response = await api.get<{ email: string; firstName: string; organisationName?: string }>('/auth/invite', {
            params: { token },
        });
        return response;
    },

    acceptInvite: async (data: { token: string; newPassword: string }) => {
        const response = await api.post<{ message: string }>('/auth/accept-invite', data);
        return response;
    },

    forgotPassword: async (data: { email: string }) => {
        const response = await api.post<{ message: string }>('/auth/forgot-password', data);
        return response;
    },

    resetPassword: async (data: { token: string; newPassword: string }) => {
        const response = await api.post<{ message: string }>('/auth/reset-password', data);
        return response;
    },
};
