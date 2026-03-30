import api from './axios';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';
const publicApi = axios.create({
    baseURL: `${API_URL}/api/public`,
    headers: { 'Content-Type': 'application/json' },
});

// ─── Types ──────────────────────────────────────────────────────────

export interface StaffRole {
    id: number;
    name: string;
    description: string;
}

export interface TeamStaffDTO {
    id: string;
    personId: string;
    firstName: string;
    lastName: string;
    staffRoleId: number;
    staffRoleName: string;
    staffRoleDescription: string;
    joinedAt: string;
    isWorldRugbyCertified: boolean;
}

// ─── Public API ─────────────────────────────────────────────────────

export const getStaffRoles = async (): Promise<StaffRole[]> => {
    const response = await publicApi.get('/staff-roles');
    return response.data;
};

// ─── Authenticated API ──────────────────────────────────────────────

export const getTeamStaff = async (teamId: string): Promise<TeamStaffDTO[]> => {
    const response = await api.get(`/teams/${teamId}/staff`);
    return response.data;
};

export const addTeamStaff = async (teamId: string, data: {
    personId: string;
    staffRoleId: number;
    isWorldRugbyCertified?: boolean;
}): Promise<TeamStaffDTO> => {
    const response = await api.post(`/teams/${teamId}/staff`, data);
    return response.data;
};

export const removeTeamStaff = async (teamId: string, staffAssignmentId: string): Promise<void> => {
    await api.delete(`/teams/${teamId}/staff/${staffAssignmentId}`);
};

// ─── Person Lookup (Org-Scoped) ─────────────────────────────────────

export interface PersonSummaryDTO {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
}

export const getAvailablePersonsForStaff = async (teamId: string): Promise<PersonSummaryDTO[]> => {
    const response = await api.get(`/teams/${teamId}/available-staff`);
    return response.data;
};
