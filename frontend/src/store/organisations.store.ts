import { create } from 'zustand';
import { fetchOrganisations } from '@/api/organisations.api';
import toast from 'react-hot-toast';

interface Organisation {
    id: string;
    name: string;
    category: 'Union' | 'State' | 'Club';
    status: 'Active' | 'Inactive';
}

interface OrganisationsState {
    organisations: Organisation[];
    loading: boolean;
    error: string | null;
    fetchOrganisations: () => Promise<void>;
}

export const useOrganisationsStore = create<OrganisationsState>((set) => ({
    organisations: [],
    loading: false,
    error: null,
    fetchOrganisations: async () => {
        set({ loading: true, error: null });
        try {
            const response = await fetchOrganisations();
            set({ organisations: response.data, loading: false });
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Failed to load organisations';
            set({ error: errorMessage, loading: false });
            toast.error(errorMessage);
        }
    },
}));
