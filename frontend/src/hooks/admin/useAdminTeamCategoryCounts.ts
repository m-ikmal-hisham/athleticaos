import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchTeamCategoryCounts, TeamCategoryCountsParams } from '@/api/teams.api';

export function useAdminTeamCategoryCounts(params: TeamCategoryCountsParams = {}) {
    return useQuery({
        queryKey: ['admin', 'teams', 'category-counts', params],
        queryFn: () => fetchTeamCategoryCounts(params),
        placeholderData: keepPreviousData,
    });
}
