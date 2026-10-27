import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { publicMatchApi, type GetPublicMatchFeedParams } from '@/api/public.api';

export function usePublicMatchFeed(params: GetPublicMatchFeedParams, options?: { enabled?: boolean }) {
    return useQuery({
        enabled: options?.enabled ?? true,
        queryKey: ['public', 'matches', params],
        queryFn: () => publicMatchApi.getFeed(params),
        refetchInterval: () =>
            params.view === 'live' && typeof document !== 'undefined' && !document.hidden
                ? 15_000
                : false,
        refetchIntervalInBackground: false,
        placeholderData: keepPreviousData,
    });
}
