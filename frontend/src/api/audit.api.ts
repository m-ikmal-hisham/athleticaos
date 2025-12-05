import api from './axios';
import { AuditLogResponse, AuditLogFilter } from '../types/audit.types';

export const auditApi = {
    getRecentGlobal: async (params?: AuditLogFilter): Promise<AuditLogResponse> => {
        const response = await api.get('/audit/recent/global', { params });
        return response.data;
    },

    getRecentForOrg: async (orgId: string, params?: AuditLogFilter): Promise<AuditLogResponse> => {
        const response = await api.get(`/audit/recent/org/${orgId}`, { params });
        return response.data;
    },

    getRecentForUser: async (userId: string, params?: AuditLogFilter): Promise<AuditLogResponse> => {
        const response = await api.get(`/audit/recent/user/${userId}`, { params });
        return response.data;
    },

    getRecentForEntity: async (entityType: string, entityId: string, params?: AuditLogFilter): Promise<AuditLogResponse> => {
        const response = await api.get('/audit/recent/entity', {
            params: { ...params, entityType, entityId },
        });
        return response.data;
    },
};
