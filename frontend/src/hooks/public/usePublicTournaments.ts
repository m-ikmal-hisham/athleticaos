import { useQuery } from '@tanstack/react-query';
import { publicTournamentApi } from '@/api/public.api';

/**
 * Loads all public tournaments (used by CalendarStrip and the featured fallback).
 */
export function usePublicTournaments() {
    return useQuery({
        queryKey: ['public', 'tournaments'],
        queryFn: () => publicTournamentApi.getTournaments(),
        staleTime: 60_000,
    });
}

/**
 * Loads featured public tournaments.
 */
export function useFeaturedTournaments() {
    return useQuery({
        queryKey: ['public', 'tournaments', 'featured'],
        queryFn: () => publicTournamentApi.getFeaturedTournaments(),
        staleTime: 60_000,
    });
}
