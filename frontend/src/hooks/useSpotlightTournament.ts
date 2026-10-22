import { useEffect, useState, useCallback } from 'react';
import { publicTournamentApi, PublicTournamentSummary } from '@/api/public.api';
import { fetchTournaments } from '@/api/tournaments.api';
import { Tournament } from '@/types';
import { useUIStore } from '@/store/ui.store';

export interface UseSpotlightTournamentOptions {
    isAdmin?: boolean;
}

export function sortTournamentsByProximity(list: PublicTournamentSummary[]): PublicTournamentSummary[] {
    const today = new Date();
    return [...list].sort((a, b) => {
        const dateA = new Date(a.startDate);
        const dateB = new Date(b.startDate);
        const diffA = Math.abs(dateA.getTime() - today.getTime());
        const diffB = Math.abs(dateB.getTime() - today.getTime());
        return diffA - diffB;
    });
}

let publicCache: PublicTournamentSummary[] | null = null;
let publicPromise: Promise<PublicTournamentSummary[]> | null = null;
let lastPublicFetch = 0;

/**
 * Shared hook for spotlight tournament selection.
 * - Admin: reads/writes ui.store activeTournamentId, fetches via fetchTournaments once on mount.
 * - Public: strictly no ui.store writes, uses publicTournamentApi, re-checks on tab visibility (throttled 30s).
 */
export function useSpotlightTournament({ isAdmin = false }: UseSpotlightTournamentOptions = {}) {
    const [tournaments, setTournaments] = useState<PublicTournamentSummary[]>(() => (!isAdmin && publicCache ? publicCache : []));
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(!isAdmin && !!publicCache ? false : true);
    const setActiveTournamentId = useUIStore((s) => s.setActiveTournamentId);

    const loadAdminTournaments = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetchTournaments();
            const mapped: PublicTournamentSummary[] = (res.data || []).map((t: Tournament) => ({
                id: t.id,
                slug: t.slug,
                name: t.name,
                level: t.level,
                seasonName: t.seasonName,
                startDate: t.startDate,
                endDate: t.endDate,
                venue: t.venue,
                live: (t.status as string) === 'LIVE' || (t.status as string) === 'ONGOING',
                completed: (t.status as string) === 'COMPLETED',
                organiserName: t.organiserBranding?.name || '',
                competitionType: t.competitionType,
                organiserBranding: t.organiserBranding,
                logoUrl: t.logoUrl,
                bannerUrl: t.bannerUrl,
                livestreamUrl: t.livestreamUrl,
                livestreamLinks: t.livestreamLinks,
            }));

            if (mapped.length > 0) {
                const sorted = sortTournamentsByProximity(mapped);
                setTournaments(sorted);

                const currentActiveId = useUIStore.getState().activeTournamentId;
                if (currentActiveId) {
                    const existingIdx = sorted.findIndex((t) => t.id === currentActiveId);
                    if (existingIdx !== -1) {
                        setCurrentIndex(existingIdx);
                    } else {
                        setActiveTournamentId(null);
                        setCurrentIndex(0);
                    }
                } else {
                    setCurrentIndex(0);
                }
            } else {
                setTournaments([]);
                setActiveTournamentId(null);
            }
        } catch (error) {
            console.error('Failed to load admin tournaments for spotlight', error);
        } finally {
            setLoading(false);
        }
    }, [setActiveTournamentId]);

    const loadPublicTournaments = useCallback(async (force = false) => {
        const now = Date.now();
        if (!force && publicCache && now - lastPublicFetch < 30000) {
            setTournaments(publicCache);
            setLoading(false);
            return;
        }

        try {
            if (!publicPromise) {
                publicPromise = publicTournamentApi.getTournaments().finally(() => {
                    publicPromise = null;
                });
            }
            setLoading(true);
            const fetched = await publicPromise;
            lastPublicFetch = Date.now();
            if (fetched && fetched.length > 0) {
                // Public accessory only shows a LIVE tournament, so live ones come first; nearest date otherwise
                const sorted = sortTournamentsByProximity(fetched).sort((a, b) => Number(Boolean(b.live)) - Number(Boolean(a.live)));
                publicCache = sorted;
                setTournaments(sorted);
                setCurrentIndex(0);
            } else {
                publicCache = [];
                setTournaments([]);
            }
        } catch (error) {
            console.error('Failed to load public tournaments for spotlight', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        if (isAdmin) {
            loadAdminTournaments();
        } else {
            loadPublicTournaments();
        }
    }, [isAdmin, loadAdminTournaments, loadPublicTournaments]);

    // Admin-only: sync active tournament to ui.store
    useEffect(() => {
        if (!isAdmin) return;
        if (tournaments.length > 0) {
            const activeId = tournaments[currentIndex]?.id ?? null;
            setActiveTournamentId(activeId);
        } else {
            setActiveTournamentId(null);
        }
    }, [isAdmin, currentIndex, tournaments, setActiveTournamentId]);

    // Public-only: re-fetch on visibility change (throttled to 30s)
    useEffect(() => {
        if (isAdmin) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const now = Date.now();
                if (now - lastPublicFetch > 30000) {
                    loadPublicTournaments(true);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isAdmin, loadPublicTournaments]);

    const handlePrevious = useCallback((e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : tournaments.length - 1));
    }, [tournaments.length]);

    const handleNext = useCallback((e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setCurrentIndex((prev) => (prev < tournaments.length - 1 ? prev + 1 : 0));
    }, [tournaments.length]);

    const tournament = tournaments[currentIndex] || null;
    const hasMultipleTournaments = tournaments.length > 1;

    return {
        tournament,
        tournaments,
        currentIndex,
        setCurrentIndex,
        loading,
        hasMultipleTournaments,
        handlePrevious,
        handleNext,
        refetch: isAdmin ? loadAdminTournaments : loadPublicTournaments,
    };
}
