import { useQuery } from '@tanstack/react-query';
import { publicMatchApi, type GetPublicMatchDaysParams } from '@/api/public.api';

export function usePublicMatchDays(params: GetPublicMatchDaysParams) {
    return useQuery({
        queryKey: ['public', 'matches', 'days', params],
        queryFn: () => publicMatchApi.getDays(params),
        staleTime: 60_000,
        enabled: Boolean(params.from && params.to),
    });
}
