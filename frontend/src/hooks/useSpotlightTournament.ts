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

let adminCache: PublicTournamentSummary[] | null = null;
let adminPromise: Promise<PublicTournamentSummary[]> | null = null;
let lastAdminFetch = 0;

/**
 * Shared hook for spotlight tournament selection.
 * - Admin: ui.store activeTournamentId is the selection. Shared module-level cache
 *   with in-flight promise de-duplication.
 * - Public: strictly no ui.store writes, uses publicTournamentApi, re-checks on tab visibility (throttled 30s).
 */
export function useSpotlightTournament({ isAdmin = false }: UseSpotlightTournamentOptions = {}) {
    const activeTournamentId = useUIStore((s) => s.activeTournamentId);
    const setActiveTournamentId = useUIStore((s) => s.setActiveTournamentId);

    const [tournaments, setTournaments] = useState<PublicTournamentSummary[]>(() => {
        if (isAdmin) return adminCache ?? [];
        return publicCache ?? [];
    });
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(() => {
        if (isAdmin) return !adminCache;
        return !publicCache;
    });

    const loadAdminTournaments = useCallback(async (force = false) => {
        const now = Date.now();
        if (!force && adminCache && now - lastAdminFetch < 30000) {
            setTournaments(adminCache);
            setLoading(false);
            return;
        }

        try {
            if (!adminPromise) {
                adminPromise = fetchTournaments().then((res) => {
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
                    const sorted = sortTournamentsByProximity(mapped);
                    adminCache = sorted;
                    lastAdminFetch = Date.now();
                    return sorted;
                }).finally(() => {
                    adminPromise = null;
                });
            }

            setLoading(true);
            const sorted = await adminPromise;
            setTournaments(sorted);

            if (sorted.length > 0) {
                const currentId = useUIStore.getState().activeTournamentId;
                const existing = currentId ? sorted.find((t) => t.id === currentId) : null;
                if (!existing) {
                    // Pick one: live first, else nearest date (first in proximity sorted list)
                    const picked = sorted.find((t) => t.live) ?? sorted[0];
                    setActiveTournamentId(picked.id);
                }
            } else {
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

    // Public-only prev/next handlers (admin no longer uses prev/next buttons)
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

    const tournament = isAdmin
        ? (tournaments.find((t) => t.id === activeTournamentId) ?? null)
        : (tournaments[currentIndex] ?? null);

    const hasMultipleTournaments = tournaments.length > 1;
    // Public: every live tournament (live ones are sorted first), so the pill can offer all of them
    const liveTournaments = isAdmin ? [] : tournaments.filter((t) => t.live);

    return {
        tournament,
        tournaments,
        liveTournaments,
        currentIndex,
        setCurrentIndex,
        loading,
        hasMultipleTournaments,
        handlePrevious,
        handleNext,
        refetch: isAdmin ? () => loadAdminTournaments(true) : () => loadPublicTournaments(true),
    };
}
