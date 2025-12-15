import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { authApi } from '@/api/auth.api';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    primaryRole: string | null;

    // Actions
    login: (credentials: { email: string; password: string }) => Promise<void>;
    setAuth: (user: User, token: string) => void;
    setUser: (user: User) => void;
    logout: () => void;
    checkTokenValidity: () => Promise<void>;
    hasRole: (role: string) => boolean;
    hasAnyRole: (roles: string[]) => boolean;
    getDefaultRoute: () => string;
    getPrimaryRole: () => string | null;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            primaryRole: null,

            login: async (credentials) => {
                try {
                    const response = await authApi.login(credentials);
                    const { user, token } = response.data;

                    // Store token as athos_token
                    localStorage.setItem('athos_token', token);

                    // Determine primary role
                    const primaryRole = user.roles && user.roles.length > 0
                        ? user.roles[0].replace('ROLE_', '')
                        : null;

                    set({ user, token, isAuthenticated: true, primaryRole });
                    toast.success('Login successful!');
                } catch (error: unknown) {
                    const axiosError = error as AxiosError<{ message: string }>;
                    const errorMessage = axiosError.response?.data?.message || 'Login failed';
                    toast.error(errorMessage);
                    throw error;
                }
            },

            setAuth: (user: User, token: string) => {
                localStorage.setItem('athos_token', token);
                const primaryRole = user.roles && user.roles.length > 0
                    ? user.roles[0].replace('ROLE_', '')
                    : null;
                set({ user, token, isAuthenticated: true, primaryRole });
            },

            setUser: (user: User) => {
                const primaryRole = user.roles && user.roles.length > 0
                    ? user.roles[0].replace('ROLE_', '')
                    : null;
                set({ user, primaryRole });
            },

            logout: () => {
                localStorage.removeItem('athos_token');
                set({ user: null, token: null, isAuthenticated: false, primaryRole: null });
            },

            checkTokenValidity: async () => {
                const { token, logout } = get();
                if (!token) return;

                try {
                    // Make a simple API call to check if token is still valid
                    await authApi.verifyToken();
                } catch (error: unknown) {
                    const axiosError = error as AxiosError;
                    if (axiosError.response?.status === 401) {
                        // Token is invalid (likely due to server restart)
                        logout();
                        toast.error('Session expired. Please login again.');
                    }
                }
            },

            hasRole: (role: string) => {
                const { user } = get();
                return user?.roles?.includes(role) || false;
            },

            hasAnyRole: (roles: string[]) => {
                const { user } = get();
                return roles.some(role => user?.roles?.includes(role)) || false;
            },

            getPrimaryRole: () => {
                const { user } = get();
                if (!user || !user.roles || user.roles.length === 0) return null;
                return user.roles[0].replace('ROLE_', '');
            },

            getDefaultRoute: () => {
                const { user } = get();
                if (!user || !user.roles || user.roles.length === 0) {
                    return '/dashboard';
                }

                // Get primary role (first role, stripped of ROLE_ prefix)
                const primaryRole = user.roles[0].replace('ROLE_', '');

                // Role-based routing
                switch (primaryRole) {
                    case 'SUPER_ADMIN':
                        return '/dashboard/organisations';
                    case 'ORG_ADMIN':
                        return '/dashboard/teams';
                    case 'CLUB_ADMIN':
                        return '/dashboard/players';
                    case 'COACH':
                        return '/dashboard/matches';
                    case 'PLAYER':
                        return '/dashboard/profile';
                    default:
                        return '/dashboard';
                }
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated,
                primaryRole: state.primaryRole,
            }),
        }
    )
);
