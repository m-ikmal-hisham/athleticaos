import api from './axios';

export interface MediaAsset {
    id: string;
    matchId: string;
    url: string;
    type: 'PHOTO' | 'VIDEO';
    description: string;
    uploadedAt: string;
}

export const getMatchMedia = async (matchId: string): Promise<MediaAsset[]> => {
    const response = await api.get(`/external/matches/${matchId}/media`);
    return response.data;
};

// Admin only
export const uploadMatchMedia = async (matchId: string, url: string, type: string, description?: string): Promise<MediaAsset> => {
    const params = new URLSearchParams();
    params.append('url', url);
    params.append('type', type);
    if (description) params.append('description', description);

    const response = await api.post(`/external/matches/${matchId}/media`, null, { params });
    return response.data;
};
