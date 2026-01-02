import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { authApi } from '@/api/auth.api';
import { showToast } from '@/lib/customToast';
import { AxiosError } from 'axios';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isInitialized: boolean;
    primaryRole: string | null;

    // Actions
    login: (credentials: { email: string; password: string }) => Promise<void>;
    setAuth: (user: User) => void;
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
            isInitialized: false,
            primaryRole: null,

            login: async (credentials) => {
                try {
                    // Login call sets the HttpOnly cookie
                    const response = await authApi.login(credentials);
                    const { user } = response.data;

                    // Determine primary role
                    const primaryRole = user.roles && user.roles.length > 0
                        ? user.roles[0].replace('ROLE_', '')
                        : null;

                    set({ user, isAuthenticated: true, primaryRole, isInitialized: true });
                    showToast.success('Login successful!');
                } catch (error: unknown) {
                    const axiosError = error as AxiosError<{ message: string }>;
                    const errorMessage = axiosError.response?.data?.message || 'Login failed';
                    showToast.error(errorMessage);
                    throw error;
                }
            },

            setAuth: (user: User) => {
                // Token is handled via cookies
                const primaryRole = user.roles && user.roles.length > 0
                    ? user.roles[0].replace('ROLE_', '')
                    : null;
                set({ user, isAuthenticated: true, primaryRole, isInitialized: true });
            },

            setUser: (user: User) => {
                const primaryRole = user.roles && user.roles.length > 0
                    ? user.roles[0].replace('ROLE_', '')
                    : null;
                set({ user, primaryRole });
            },

            logout: async () => {
                try {
                    await authApi.logout(); // Call backend to clear cookie
                } catch (e) {
                    console.error("Logout failed on server", e);
                }
                set({ user: null, token: null, isAuthenticated: false, primaryRole: null, isInitialized: true });
                window.location.href = '/login';
            },

            checkTokenValidity: async () => {

                try {
                    // Fetch current user (Boot Check)
                    const response = await authApi.getMe();
                    const user = response.data;

                    const primaryRole = user.roles && user.roles.length > 0
                        ? user.roles[0].replace('ROLE_', '')
                        : null;

                    set({ user, isAuthenticated: true, primaryRole, isInitialized: true });
                } catch (error: unknown) {
                    // Session invalid or expired
                    set({ user: null, isAuthenticated: false, primaryRole: null, isInitialized: true });
                    // We don't call logout() here to avoid redirect loop or double toast, 
                    // just ensure state is clear. AuthGuard will handle redirect.
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
            partialize: () => ({
                // We do NOT persist auth state anymore (user, isAuthenticated)
                // This ensures we rely on the session cookie + Boot Check
            }),
        }
    )
);
