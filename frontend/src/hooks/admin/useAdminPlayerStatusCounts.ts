import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchPlayerStatusCounts, PlayerStatusCountsParams } from '@/api/players.api';

export function useAdminPlayerStatusCounts(params: PlayerStatusCountsParams = {}) {
    return useQuery({
        queryKey: ['admin', 'players', 'status-counts', params],
        queryFn: () => fetchPlayerStatusCounts(params),
        placeholderData: keepPreviousData,
    });
}
