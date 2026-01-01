import api from './axios';

export interface SanctioningRequest {
    id: string;
    tournamentId: string;
    tournamentName: string;
    requesterOrgId: string;
    requesterOrgName: string;
    approverOrgId: string;
    approverOrgName: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MORE_INFO_REQUIRED';
    notes?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface OrganisationTreeNode {
    id: string;
    name: string;
    orgLevel: string;
    children?: OrganisationTreeNode[];
}

export const getOrganisationTree = async (rootOrgId: string): Promise<OrganisationTreeNode> => {
    const response = await api.get(`/federation/hierarchy/${rootOrgId}`);
    return response.data;
};

export const requestSanctioning = async (data: { tournamentId: string; approverOrgId: string; notes?: string }): Promise<SanctioningRequest> => {
    const response = await api.post('/federation/sanctioning', data);
    return response.data;
};

export const getIncomingSanctioningRequests = async (approverOrgId: string): Promise<SanctioningRequest[]> => {
    const response = await api.get(`/federation/sanctioning/incoming/${approverOrgId}`);
    return response.data;
};

export const getOutgoingSanctioningRequests = async (requesterOrgId: string): Promise<SanctioningRequest[]> => {
    const response = await api.get(`/federation/sanctioning/outgoing/${requesterOrgId}`);
    return response.data;
};

export const approveSanctioning = async (requestId: string, notes?: string): Promise<SanctioningRequest> => {
    const response = await api.post(`/federation/sanctioning/${requestId}/approve`, null, {
        params: { notes }
    });
    return response.data;
};

export const rejectSanctioning = async (requestId: string, notes?: string): Promise<SanctioningRequest> => {
    const response = await api.post(`/federation/sanctioning/${requestId}/reject`, null, {
        params: { notes }
    });
    return response.data;
};


export interface CompetitionHealthSummary {
    tournamentId: string;
    tournamentName: string;
    totalMatches: number;
    completedMatches: number;
    pendingMatches: number;
    overdueMatches: number;
    completionRate: number;
    activeTeams: number;
    issueCount: number;
}

export interface ComplianceIssue {
    issueType: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    tournamentName: string;
    matchDetails: string;
    teamName?: string;
    referenceId: string;
}

export interface DisciplineSummary {
    teamId: string;
    teamName: string;
    yellowCards: number;
    redCards: number;
    totalInfractions: number;
}

export const getActiveTournamentsHealth = async (): Promise<CompetitionHealthSummary[]> => {
    const response = await api.get('/reporting/competitions/health');
    return response.data;
};

export const getAllComplianceIssues = async (): Promise<ComplianceIssue[]> => {
    const response = await api.get('/reporting/compliance/issues');
    return response.data;
};

export const getTournamentComplianceIssues = async (tournamentId: string): Promise<ComplianceIssue[]> => {
    const response = await api.get(`/reporting/compliance/issues/${tournamentId}`);
    return response.data;
};

export const getDisciplineSummary = async (tournamentId: string): Promise<DisciplineSummary[]> => {
    const response = await api.get(`/reporting/discipline/summary/${tournamentId}`);
    return response.data;
};
