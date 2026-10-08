import { useQuery } from '@tanstack/react-query';
import { fetchTeamFilters } from '@/api/teams.api';

export function useAdminTeamFilters() {
    return useQuery({
        queryKey: ['admin', 'teams', 'filters'],
        queryFn: () => fetchTeamFilters(),
        staleTime: 5 * 60 * 1000,
    });
}
