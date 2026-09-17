import api from './axios';

export interface InviteUserRequest {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    organisationId: string;
    /** Initial password; the user must change it at first sign-in. */
    password: string;
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
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postcode?: string;
    state?: string;
    country?: string;
    stateCode?: string;
    countryCode?: string;
    avatarUrl?: string;
}

export const usersApi = {
    inviteUser: async (request: InviteUserRequest) => {
        const response = await api.post<InviteUserResponse>('/users/invite', request);
        return response;
    },

    getAllUsers: async (params?: { organisationId?: string }) => {
        const response = await api.get('/users', { params });
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

    // SUPER_ADMIN: sets a temporary password, forces a change at next sign-in and revokes sessions
    resetPassword: async (id: string, newPassword: string) => {
        const response = await api.post(`/users/${id}/reset-password`, { newPassword });
        return response;
    },

    deleteUser: async (id: string) => {
        const response = await api.delete(`/users/${id}`);
        return response;
    },
};
