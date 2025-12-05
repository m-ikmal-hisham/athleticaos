import { create } from "zustand";
import { fetchOrganisations, Organisation } from "../api/organisations.api";

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
            const data = await fetchOrganisations();
            set({ organisations: data, loading: false });
        } catch (err) {
            set({ loading: false, error: "Failed to load organisations" });
        }
    }
}));
