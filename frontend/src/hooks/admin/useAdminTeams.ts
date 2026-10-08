import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchTeamsPage, GetAdminTeamsPageParams } from '@/api/teams.api';

export type UseAdminTeamsParams = Omit<GetAdminTeamsPageParams, 'page'>;

export function useAdminTeams(params: UseAdminTeamsParams = {}) {
    return useInfiniteQuery({
        queryKey: ['admin', 'teams', params],
        queryFn: ({ pageParam = 0 }) =>
            fetchTeamsPage({
                ...params,
                page: pageParam,
            }),
        initialPageParam: 0,
        getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
        placeholderData: keepPreviousData,
    });
}
