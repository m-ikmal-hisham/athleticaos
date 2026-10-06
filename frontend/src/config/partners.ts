export interface Partner {
    id: string;
    name: string;
    role: string;
    logoSrc: string;
    logoSrcDark?: string;
    url?: string;
}

export const PARTNERS: Partner[] = [
    { id: 'ragbi-online', name: 'Ragbi Online', role: 'Partner', logoSrc: '/partners/ragbi-online.svg' },
];
