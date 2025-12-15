import api from './axios';

export interface InviteUserRequest {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    organisationId: string;
}

export interface InviteUserResponse {
    userId: string;
    email: string;
    role: string;
    organisationId: string;
    inviteStatus: string;
    message?: string;
}

export interface UserUpdateRequest {
    firstName?: string;
    lastName?: string;
    email?: string;
    roles?: string[];
    organisationId?: string;
    isActive?: boolean;
}

export const usersApi = {
    inviteUser: async (request: InviteUserRequest) => {
        const response = await api.post<InviteUserResponse>('/users/invite', request);
        return response;
    },

    getAllUsers: async () => {
        const response = await api.get('/users');
        return response;
    },

    getUserById: async (id: string) => {
        const response = await api.get(`/users/${id}`);
        return response;
    },

    updateUser: async (id: string, request: UserUpdateRequest) => {
        const response = await api.put(`/users/${id}`, request);
        return response;
    },
};
