import { useQuery } from '@tanstack/react-query';
import { publicProfileApi } from '@/api/public.api';

export function useTeamFilters() {
    return useQuery({
        queryKey: ['public', 'teams', 'filters'],
        queryFn: () => publicProfileApi.getTeamFilters(),
        staleTime: 5 * 60 * 1000,
    });
}
