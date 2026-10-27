import { useQuery } from '@tanstack/react-query';
import { publicOrganisationApi, PublicOrganisationTreeResponse } from '@/api/public.api';

export function usePublicOrganisationTree() {
    return useQuery<PublicOrganisationTreeResponse>({
        queryKey: ['public', 'organisations', 'tree'],
        queryFn: () => publicOrganisationApi.getTree(),
        staleTime: 5 * 60 * 1000,
    });
}
