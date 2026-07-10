import api from '../api/axios';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';
const publicApi = axios.create({
    baseURL: `${API_URL}/api/public`,
    headers: { 'Content-Type': 'application/json' },
});

// ─── Types (matching new DTO-based backend) ─────────────────────────

export interface OfficialRoleDTO {
    id: number;
    name: string;
    description: string;
}

export interface OfficialRegistryDTO {
    id: string;
    userId: string | null;
    personId: string | null;
    firstName: string;
    lastName: string;
    accreditationLevel: string;
    primaryRole: string;
    badgeNumber: string;
    isActive: boolean;
    active: boolean;
    isWorldRugbyCertified: boolean;
}

export interface MatchOfficialDTO {
    id: string;
    officialId: string;
    officialName: string;
    assignedRole: string;
    officialRoleId: number | null;
    officialRoleName: string | null;
    isConfirmed: boolean;
}

export interface TournamentOfficialDTO {
    id: string;
    officialId: string;
    officialName: string;
    accreditationLevel: string;
    badgeNumber: string;
    officialRoleId: number | null;
    officialRoleName: string | null;
    isActive: boolean;
}

// ─── Public API ─────────────────────────────────────────────────────

export const getOfficialRoles = async (): Promise<OfficialRoleDTO[]> => {
    const response = await publicApi.get('/official-roles');
    return response.data;
};

// ─── Registry ───────────────────────────────────────────────────────

export const getAllOfficials = async (): Promise<OfficialRegistryDTO[]> => {
    const response = await api.get('/officials');
    return response.data;
};

export const getOfficialById = async (officialId: string): Promise<OfficialRegistryDTO> => {
    const response = await api.get(`/officials/${officialId}`);
    return response.data;
};

export const registerOfficial = async (data: {
    personId?: string;
    userId?: string;
    organisationId?: string;
    accreditationLevel: string;
    primaryRole: string;
    badgeNumber: string;
    expiryDate?: string;
    isWorldRugbyCertified?: boolean;
}): Promise<OfficialRegistryDTO> => {
    const response = await api.post('/officials/register', data);
    return response.data;
};

// ─── Match Assignments ──────────────────────────────────────────────

export const getMatchOfficials = async (matchId: string): Promise<MatchOfficialDTO[]> => {
    const response = await api.get(`/officials/assignments/${matchId}`);
    return response.data;
};

export const assignOfficial = async (matchId: string, data: {
    officialId: string;
    officialRoleId?: number;
    assignedRole?: string;
}): Promise<MatchOfficialDTO> => {
    const response = await api.post(`/officials/assignments/${matchId}`, data);
    return response.data;
};

export const removeOfficial = async (assignmentId: string): Promise<void> => {
    await api.delete(`/officials/assignments/${assignmentId}`);
};

// ─── Tournament Officials Panel ─────────────────────────────────────

export const getTournamentOfficials = async (tournamentId: string): Promise<TournamentOfficialDTO[]> => {
    const response = await api.get(`/officials/tournaments/${tournamentId}`);
    return response.data;
};

export const addOfficialToTournament = async (tournamentId: string, data: {
    officialId: string;
    officialRoleId?: number;
}): Promise<TournamentOfficialDTO> => {
    const response = await api.post(`/officials/tournaments/${tournamentId}`, data);
    return response.data;
};

export const removeOfficialFromTournament = async (tournamentOfficialId: string): Promise<void> => {
    await api.delete(`/officials/tournaments/panel/${tournamentOfficialId}`);
};
