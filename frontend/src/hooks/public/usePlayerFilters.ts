import { useQuery } from '@tanstack/react-query';
import { publicProfileApi } from '@/api/public.api';

export function usePlayerFilters() {
    return useQuery({
        queryKey: ['public', 'players', 'filters'],
        queryFn: () => publicProfileApi.getPlayerFilters(),
        staleTime: 5 * 60 * 1000,
    });
}
