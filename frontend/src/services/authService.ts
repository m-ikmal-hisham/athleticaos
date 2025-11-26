import axios from '@/lib/axios';
import { AuthResponse, LoginRequest, RegisterRequest } from '@/types';

export const authService = {
    async login(credentials: LoginRequest): Promise<AuthResponse> {
        const response = await axios.post<AuthResponse>('/api/v1/auth/login', credentials);
        return response.data;
    },

    async register(data: RegisterRequest): Promise<AuthResponse> {
        const response = await axios.post<AuthResponse>('/api/v1/auth/register', data);
        return response.data;
    },
};
