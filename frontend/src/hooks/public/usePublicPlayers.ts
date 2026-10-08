import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { publicProfileApi, GetPublicPlayersPageParams } from '@/api/public.api';

export type UsePublicPlayersParams = Omit<GetPublicPlayersPageParams, 'page'>;

export function usePublicPlayers(params: UsePublicPlayersParams = {}) {
    return useInfiniteQuery({
        queryKey: ['public', 'players', params],
        queryFn: ({ pageParam = 0 }) =>
            publicProfileApi.getPlayersPage({
                ...params,
                page: pageParam,
            }),
        initialPageParam: 0,
        getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
        placeholderData: keepPreviousData,
    });
}
