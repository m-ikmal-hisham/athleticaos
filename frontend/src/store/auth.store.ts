import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { authApi } from '@/api/auth.api';
import toast from 'react-hot-toast';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;

    // Actions
    login: (credentials: { email: string; password: string }) => Promise<void>;
    setAuth: (user: User, token: string) => void;
    logout: () => void;
    hasRole: (role: string) => boolean;
    hasAnyRole: (roles: string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,

            login: async (credentials) => {
                try {
                    const response = await authApi.login(credentials);
                    const { user, token } = response.data;

                    // Store token as athos_token
                    localStorage.setItem('athos_token', token);
                    set({ user, token, isAuthenticated: true });
                    toast.success('Login successful!');
                } catch (error: any) {
                    const errorMessage = error.response?.data?.message || 'Login failed';
                    toast.error(errorMessage);
                    throw error;
                }
            },

            setAuth: (user: User, token: string) => {
                localStorage.setItem('athos_token', token);
                set({ user, token, isAuthenticated: true });
            },

            logout: () => {
                localStorage.removeItem('athos_token');
                set({ user: null, token: null, isAuthenticated: false });
            },

            hasRole: (role: string) => {
                const { user } = get();
                return user?.roles?.includes(role) || false;
            },

            hasAnyRole: (roles: string[]) => {
                const { user } = get();
                return roles.some(role => user?.roles?.includes(role)) || false;
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);
