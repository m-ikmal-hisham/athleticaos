import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BrandingState {
    primaryColor: string | null;
    secondaryColor: string | null;
    accentColor: string | null;
    logoUrl: string | null;
    coverImageUrl: string | null;
}

interface BrandingStore extends BrandingState {
    setBranding: (branding: Partial<BrandingState>) => void;
    resetBranding: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setBrandingFromOrganisation: (org: any) => void;
}

const DEFAULT_BRANDING: BrandingState = {
    primaryColor: '#3b82f6', // Brand Blue (Primary 500)
    secondaryColor: '#FFCC00', // Malaysia Yellow (Secondary 500)
    accentColor: '#1d4ed8', // Brand Blue 700
    logoUrl: null,
    coverImageUrl: null,
};

// Fallback logic could be handled here or in the component that applies the styles
// For now, we store exactly what the org has, and the UI will fallback if null.

export const useBrandingStore = create<BrandingStore>()(
    persist(
        (set) => ({
            ...DEFAULT_BRANDING,

            setBranding: (branding) => set((state) => ({ ...state, ...branding })),

            resetBranding: () => set(DEFAULT_BRANDING),

            setBrandingFromOrganisation: (org) => {
                if (!org) {
                    set(DEFAULT_BRANDING);
                    return;
                }
                set({
                    primaryColor: org.primaryColor || DEFAULT_BRANDING.primaryColor,
                    secondaryColor: org.secondaryColor || DEFAULT_BRANDING.secondaryColor,
                    accentColor: org.accentColor || DEFAULT_BRANDING.accentColor,
                    logoUrl: org.logoUrl || null,
                    coverImageUrl: org.coverImageUrl || null,
                });
            },
        }),
        {
            name: 'athleticaos-branding',
        }
    )
);
