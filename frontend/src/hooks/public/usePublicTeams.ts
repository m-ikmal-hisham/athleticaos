import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { publicProfileApi, GetPublicTeamsPageParams } from '@/api/public.api';

export type UsePublicTeamsParams = Omit<GetPublicTeamsPageParams, 'page'>;

export function usePublicTeams(params: UsePublicTeamsParams = {}) {
    return useInfiniteQuery({
        queryKey: ['public', 'teams', params],
        queryFn: ({ pageParam = 0 }) =>
            publicProfileApi.getTeamsPage({
                ...params,
                page: pageParam,
            }),
        initialPageParam: 0,
        getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
        placeholderData: keepPreviousData,
    });
}
