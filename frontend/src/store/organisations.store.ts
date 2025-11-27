import { create } from "zustand";
import { fetchOrganisations } from "../api/organisations.api";

export interface Organisation {
    id: string;
    name: string;
    type: string;
    state: string;
    status: string;
    primaryColor: string;
    secondaryColor: string;
    logoUrl?: string;
}

interface OrganisationsState {
    organisations: Organisation[];
    loading: boolean;
    error: string | null;
    getOrganisations: () => Promise<void>;
}

export const useOrganisationsStore = create<OrganisationsState>((set) => ({
    organisations: [],
    loading: false,
    error: null,

    async getOrganisations() {
        set({ loading: true, error: null });
        try {
            const res = await fetchOrganisations();
            set({ organisations: res.data, loading: false });
        } catch (err) {
            set({ loading: false, error: "Failed to load organisations" });
        }
    }
}));
