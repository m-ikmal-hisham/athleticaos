import api from './axios';

export interface SponsorPackage {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    features: string;
    active: boolean;
}

export interface SubscriptionTier {
    id: string;
    name: string;
    maxTeams: number | null;
    featuresEnabled: string;
    monthlyPrice: number;
    active: boolean;
}

export const getSponsorPackages = async (activeOnly = true): Promise<SponsorPackage[]> => {
    const response = await api.get('/monetization/sponsor-packages', { params: { activeOnly } });
    return response.data;
};

export const createSponsorPackage = async (data: Omit<SponsorPackage, 'id'>): Promise<SponsorPackage> => {
    const response = await api.post('/monetization/sponsor-packages', data);
    return response.data;
};

export const updateSponsorPackage = async (id: string, data: Partial<SponsorPackage>): Promise<SponsorPackage> => {
    const response = await api.put(`/monetization/sponsor-packages/${id}`, data);
    return response.data;
};

export const deleteSponsorPackage = async (id: string): Promise<void> => {
    await api.delete(`/monetization/sponsor-packages/${id}`);
};

export const getSubscriptionTiers = async (activeOnly = true): Promise<SubscriptionTier[]> => {
    const response = await api.get('/monetization/subscription-tiers', { params: { activeOnly } });
    return response.data;
};
