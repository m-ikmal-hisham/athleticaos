import axios from 'axios';
import api from './axios';

export type CertificateDesign =
    | 'CLASSIC'
    | 'MODERN'
    | 'ORGANISER_COLOURS'
    | 'PITCH'
    | 'PRINT_SAVER'
    | 'SONGKET_GOLD'
    | 'HIBISCUS_ENERGY'
    | 'PITCH_DYNAMIC'
    | 'STADIUM_LIGHTS'
    | 'BATIK_WAVE'
    | 'CHAMPIONS_RIBBON';

export type CertificateLanguage = 'EN' | 'MS' | 'BOTH';

export interface CertificateSettings {
    tournamentId: string;
    design: CertificateDesign;
    title: string | null;
    language: CertificateLanguage;
    remark: string | null;
    issueDate: string | null;
    signatory1Name: string | null;
    signatory1Title: string | null;
    hasSignature1: boolean;
    signatory2Name: string | null;
    signatory2Title: string | null;
    hasSignature2: boolean;
    showVerification: boolean;
    verificationUrlConfigured: boolean;
    teamAchievements: Record<string, string>;
    tournamentName: string;
    tournamentLogoUrl: string | null;
    organiserName: string | null;
    organiserLogoUrl: string | null;
    organiserPrimaryColor: string | null;
    organiserSecondaryColor: string | null;
}

export interface CertificateSettingsUpdatePayload {
    design: CertificateDesign;
    title: string | null;
    language: CertificateLanguage;
    remark: string | null;
    issueDate: string | null;
    signatory1Name: string | null;
    signatory1Title: string | null;
    signatory2Name: string | null;
    signatory2Title: string | null;
    showVerification: boolean;
    teamAchievements: Record<string, string>;
}

export interface CertificatePlayerItem {
    playerId: string;
    fullName: string;
    certificateId: string | null;
    code: string | null;
    status: 'NOT_ISSUED' | 'VALID' | 'REVOKED';
    issuedAt: string | null;
    revokedAt: string | null;
}

export interface CertificateTeamGroup {
    teamId: string;
    teamName: string;
    achievementText: string | null;
    activePlayerCount: number;
    issuedCount: number;
    revokedCount: number;
    players: CertificatePlayerItem[];
}

export interface CertificateCategoryGroup {
    categoryId: string | null;
    categoryName: string;
    teams: CertificateTeamGroup[];
}

export interface CertificateRoster {
    tournamentId: string;
    totalActivePlayers: number;
    totalIssued: number;
    totalRevoked: number;
    categories: CertificateCategoryGroup[];
}

export interface CertificateIssueResult {
    createdCount: number;
    updatedCount: number;
    skippedRevokedCount: number;
    totalValidCount: number;
}

export interface PublicCertificateVerification {
    code: string;
    status: 'VALID' | 'REVOKED';
    recipientName: string;
    teamName: string;
    categoryName: string | null;
    achievementText: string | null;
    tournamentName: string;
    tournamentStartDate: string | null;
    tournamentEndDate: string | null;
    tournamentVenue: string | null;
    organiserName: string | null;
    issueDate: string | null;
    revokedAt: string | null;
}

const API_URL = import.meta.env.VITE_API_URL || '';
const publicApi = axios.create({
    baseURL: `${API_URL}/api/public`,
    headers: { 'Content-Type': 'application/json' },
});

function extractFilename(contentDisposition: string | undefined, fallback: string): string {
    if (!contentDisposition) return fallback;
    const match = contentDisposition.match(/filename="?([^";]+)"?/i);
    return match?.[1] || fallback;
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const certificatesApi = {
    async getSettings(tournamentId: string): Promise<CertificateSettings> {
        const res = await api.get<CertificateSettings>(`/tournaments/${tournamentId}/certificates/settings`);
        return res.data;
    },

    async updateSettings(
        tournamentId: string,
        payload: CertificateSettingsUpdatePayload
    ): Promise<CertificateSettings> {
        const res = await api.put<CertificateSettings>(`/tournaments/${tournamentId}/certificates/settings`, payload);
        return res.data;
    },

    async uploadSignature(tournamentId: string, slot: 1 | 2, file: File): Promise<CertificateSettings> {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post<CertificateSettings>(
            `/tournaments/${tournamentId}/certificates/signatures/${slot}`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 30000 }
        );
        return res.data;
    },

    async deleteSignature(tournamentId: string, slot: 1 | 2): Promise<CertificateSettings> {
        const res = await api.delete<CertificateSettings>(
            `/tournaments/${tournamentId}/certificates/signatures/${slot}`
        );
        return res.data;
    },

    async fetchSignatureBlob(tournamentId: string, slot: 1 | 2): Promise<Blob> {
        const res = await api.get<Blob>(
            `/tournaments/${tournamentId}/certificates/signatures/${slot}`,
            { responseType: 'blob' }
        );
        return res.data;
    },

    async getRoster(tournamentId: string): Promise<CertificateRoster> {
        const res = await api.get<CertificateRoster>(`/tournaments/${tournamentId}/certificates/roster`);
        return res.data;
    },

    async issue(tournamentId: string, teamId?: string): Promise<CertificateIssueResult> {
        const res = await api.post<CertificateIssueResult>(
            `/tournaments/${tournamentId}/certificates/issue`,
            null,
            { params: teamId ? { teamId } : undefined, timeout: 60000 }
        );
        return res.data;
    },

    async fetchPreviewPdf(tournamentId: string, design?: CertificateDesign): Promise<Blob> {
        const res = await api.get<Blob>(`/tournaments/${tournamentId}/certificates/preview`, {
            params: design ? { design } : undefined,
            responseType: 'blob',
            timeout: 60000,
        });
        return res.data;
    },

    async downloadTournamentZip(tournamentId: string): Promise<{ blob: Blob; filename: string }> {
        const res = await api.get<Blob>(`/tournaments/${tournamentId}/certificates/download/zip`, {
            responseType: 'blob',
            timeout: 600000,
        });
        const filename = extractFilename(res.headers['content-disposition'], 'tournament-certificates.zip');
        return { blob: res.data, filename };
    },

    async downloadTeamZip(tournamentId: string, teamId: string): Promise<{ blob: Blob; filename: string }> {
        const res = await api.get<Blob>(
            `/tournaments/${tournamentId}/certificates/teams/${teamId}/download/zip`,
            { responseType: 'blob', timeout: 300000 }
        );
        const filename = extractFilename(res.headers['content-disposition'], 'team-certificates.zip');
        return { blob: res.data, filename };
    },

    async downloadTeamPdf(tournamentId: string, teamId: string): Promise<{ blob: Blob; filename: string }> {
        const res = await api.get<Blob>(
            `/tournaments/${tournamentId}/certificates/teams/${teamId}/download/pdf`,
            { responseType: 'blob', timeout: 300000 }
        );
        const filename = extractFilename(res.headers['content-disposition'], 'team-certificates.pdf');
        return { blob: res.data, filename };
    },

    async revoke(tournamentId: string, certificateId: string): Promise<void> {
        await api.post(`/tournaments/${tournamentId}/certificates/${certificateId}/revoke`);
    },

    async verifyPublic(code: string): Promise<PublicCertificateVerification> {
        const res = await publicApi.get<PublicCertificateVerification>(`/certificates/${encodeURIComponent(code)}`);
        return res.data;
    },
};
