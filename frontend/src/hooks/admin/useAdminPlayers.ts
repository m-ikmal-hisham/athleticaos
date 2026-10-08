import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchPlayersPage, GetAdminPlayersPageParams } from '@/api/players.api';

export type UseAdminPlayersParams = Omit<GetAdminPlayersPageParams, 'page'>;

export function useAdminPlayers(params: UseAdminPlayersParams = {}) {
    return useInfiniteQuery({
        queryKey: ['admin', 'players', params],
        queryFn: ({ pageParam = 0 }) =>
            fetchPlayersPage({
                ...params,
                page: pageParam,
            }),
        initialPageParam: 0,
        getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
        placeholderData: keepPreviousData,
    });
}
