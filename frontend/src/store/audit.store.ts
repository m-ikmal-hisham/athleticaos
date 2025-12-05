import { create } from 'zustand';
import { auditApi } from '../api/audit.api';
import { AuditLogEntry, AuditLogFilter } from '../types/audit.types';

interface AuditState {
    logs: AuditLogEntry[];
    isLoading: boolean;
    error: string | null;
    totalPages: number;
    totalElements: number;
    currentPage: number;
    pageSize: number;

    fetchGlobalLogs: (params?: AuditLogFilter) => Promise<void>;
    fetchOrgLogs: (orgId: string, params?: AuditLogFilter) => Promise<void>;
    fetchUserLogs: (userId: string, params?: AuditLogFilter) => Promise<void>;
    fetchEntityLogs: (entityType: string, entityId: string, params?: AuditLogFilter) => Promise<void>;
    clearLogs: () => void;
}

export const useAuditStore = create<AuditState>((set) => ({
    logs: [],
    isLoading: false,
    error: null,
    totalPages: 0,
    totalElements: 0,
    currentPage: 0,
    pageSize: 20,

    fetchGlobalLogs: async (params) => {
        set({ isLoading: true, error: null });
        try {
            const response = await auditApi.getRecentGlobal(params);
            set({
                logs: response.content,
                totalPages: response.totalPages,
                totalElements: response.totalElements,
                currentPage: response.number,
                pageSize: response.size,
                isLoading: false,
            });
        } catch (error: any) {
            set({ isLoading: false, error: error.message || 'Failed to fetch audit logs' });
        }
    },

    fetchOrgLogs: async (orgId, params) => {
        set({ isLoading: true, error: null });
        try {
            const response = await auditApi.getRecentForOrg(orgId, params);
            set({
                logs: response.content,
                totalPages: response.totalPages,
                totalElements: response.totalElements,
                currentPage: response.number,
                pageSize: response.size,
                isLoading: false,
            });
        } catch (error: any) {
            set({ isLoading: false, error: error.message || 'Failed to fetch audit logs' });
        }
    },

    fetchUserLogs: async (userId, params) => {
        set({ isLoading: true, error: null });
        try {
            const response = await auditApi.getRecentForUser(userId, params);
            set({
                logs: response.content,
                totalPages: response.totalPages,
                totalElements: response.totalElements,
                currentPage: response.number,
                pageSize: response.size,
                isLoading: false,
            });
        } catch (error: any) {
            set({ isLoading: false, error: error.message || 'Failed to fetch audit logs' });
        }
    },

    fetchEntityLogs: async (entityType, entityId, params) => {
        set({ isLoading: true, error: null });
        try {
            const response = await auditApi.getRecentForEntity(entityType, entityId, params);
            set({
                logs: response.content,
                totalPages: response.totalPages,
                totalElements: response.totalElements,
                currentPage: response.number,
                pageSize: response.size,
                isLoading: false,
            });
        } catch (error: any) {
            set({ isLoading: false, error: error.message || 'Failed to fetch audit logs' });
        }
    },

    clearLogs: () => set({ logs: [], totalPages: 0, totalElements: 0, currentPage: 0 }),
}));
