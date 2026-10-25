import { useQuery } from '@tanstack/react-query';
import { publicOrganisationApi, PublicOrganisationDetailResponse } from '@/api/public.api';

export function usePublicOrganisation(idOrSlug: string | undefined) {
    return useQuery<PublicOrganisationDetailResponse>({
        queryKey: ['public', 'organisations', idOrSlug],
        queryFn: () => {
            if (!idOrSlug) throw new Error('Organisation identifier required');
            return publicOrganisationApi.getOrganisation(idOrSlug);
        },
        enabled: Boolean(idOrSlug),
        staleTime: 5 * 60 * 1000,
    });
}
