import api from '../api/axios';
import { User, MatchResponse } from '@/types';

export interface OfficialRegistry {
    id: string;
    user: User;
    accreditationLevel: string;
    primaryRole: string;
    badgeNumber: string;
    accreditationExpiryDate: string;
    isActive: boolean;
}

export interface MatchOfficial {
    id: string;
    matchId: string;
    official: OfficialRegistry;
    assignedRole: string;
    isConfirmed: boolean;
    match?: MatchResponse;
}

export const getAllOfficials = async (): Promise<OfficialRegistry[]> => {
    const response = await api.get('/officials');
    return response.data;
};

export const registerOfficial = async (data: {
    userId: string;
    accreditationLevel: string;
    primaryRole: string;
    badgeNumber: string;
    expiryDate: string;
}): Promise<OfficialRegistry> => {
    const response = await api.post('/officials/register', null, {
        params: data
    });
    return response.data;
};

export const getMatchOfficials = async (matchId: string): Promise<MatchOfficial[]> => {
    const response = await api.get(`/officials/assignments/${matchId}`);
    return response.data;
};

export const assignOfficial = async (matchId: string, officialId: string, role: string): Promise<MatchOfficial> => {
    const response = await api.post('/officials/assignments', null, {
        params: { matchId, officialId, role }
    });
    return response.data;
};

export const removeOfficial = async (assignmentId: string): Promise<void> => {
    await api.delete(`/officials/assignments/${assignmentId}`);
};

export const getOfficialHistory = async (officialId: string): Promise<MatchOfficial[]> => {
    const response = await api.get(`/officials/${officialId}/history`);
    return response.data;
};
