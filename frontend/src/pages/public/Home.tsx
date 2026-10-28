import { useState, useMemo, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    CalendarBlank,
    MapPin,
    Trophy,
    ArrowRight,
    ArrowSquareOut,
    WarningCircle,
} from '@phosphor-icons/react';
import { PublicMatchFeedItem } from '@/api/public.api';
import { usePublicTournaments, useFeaturedTournaments } from '@/hooks/public/usePublicTournaments';
import { usePublicMatchFeed } from '@/hooks/public/usePublicMatchFeed';
import { GlassCard } from '@/components/GlassCard';
import { SEO } from '@/components/common/SEO';
import { PartnersSection } from '@/components/public/PartnersSection';
import { MatchCard, MatchFeedSkeleton } from '@/components/public/match';
import { TournamentLogo } from '@/components/common/TournamentLogo';
import { formatTournamentLevel, formatCompetitionType, formatKickOff } from '@/utils/formatters';
import { sortForHomeFallback } from '@/utils/tournamentSort';
import { todayInMalaysia, getDateLocale, parseCalendarDate } from '@/utils/malaysiaDate';
import { format } from 'date-fns';

import { CalendarStripSkeleton } from '@/components/public/calendar/CalendarStripSkeleton';

const CalendarStrip = lazy(() => import('@/components/public/calendar/CalendarStrip'));

type MatchView = 'live' | 'today' | 'results' | 'upcoming';
const VALID_VIEWS: MatchView[] = ['live', 'today', 'results', 'upcoming'];

export default function Home() {
    const { t, i18n } = useTranslation(['home', 'common', 'calendar']);
    const [searchParams, setSearchParams] = useSearchParams();
    const matchesRef = useRef<HTMLDivElement>(null);
    const locale = getDateLocale(i18n.language);

    // 1. Tournaments Queries (2 queries per requirement 1)
    const { data: allTournaments = [], isLoading: allTournamentsLoading } = usePublicTournaments();
    const { data: featuredTournaments = [] } = useFeaturedTournaments();

    // Featured section list (featured if exists, else fallback to all tournaments sorted)
    const displayTournaments = useMemo(() => {
        if (featuredTournaments.length > 0) {
            return featuredTournaments.slice(0, 6);
        }
        return sortForHomeFallback(allTournaments).slice(0, 6);
    }, [featuredTournaments, allTournaments]);

    const isFallbackTournaments = featuredTournaments.length === 0;

    // 2. Matches View State (?view=live|today|results|upcoming)
    const rawView = searchParams.get('view') as MatchView | null;
    const isUrlExplicit = Boolean(rawView && VALID_VIEWS.includes(rawView as MatchView));
    const [resolvedView, setResolvedView] = useState<MatchView | null>(() => (isUrlExplicit ? (rawView as MatchView) : null));
    const [isViewKnown, setIsViewKnown] = useState(() => isUrlExplicit);
    const viewResolvedRef = useRef(isUrlExplicit);

    // Keep state in sync with back/forward browser navigation
    useEffect(() => {
        if (rawView && VALID_VIEWS.includes(rawView as MatchView)) {
            setResolvedView(rawView as MatchView);
            setIsViewKnown(true);
            viewResolvedRef.current = true;
        }
    }, [rawView]);

    const currentView: MatchView = resolvedView || (isUrlExplicit ? (rawView as MatchView) : 'today');

    // 1.5s cap for Live now coordination: after 1.5s, feed renders without waiting for live feed
    const [liveNowCapExpired, setLiveNowCapExpired] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => {
            setLiveNowCapExpired(true);
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    // Synchronous 4/6 cap for phones (< 768px) and desktop (>= 768px)
    const [isDesktop, setIsDesktop] = useState(
        () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
    );
    useEffect(() => {
        const mql = window.matchMedia('(min-width: 768px)');
        const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, []);
    const matchCap = isDesktop ? 6 : 4;

    // Matches pagination and expansion
    const [page, setPage] = useState(0);
    const [accumulatedMatches, setAccumulatedMatches] = useState<PublicMatchFeedItem[]>([]);
    const [isFeedExpanded, setIsFeedExpanded] = useState(false);
    const [isLiveExpanded, setIsLiveExpanded] = useState(false);
    const liveNowEligibleRef = useRef<boolean | null>(null);

    // Reset page and accumulated list when view changes
    const prevViewRef = useRef(currentView);
    useEffect(() => {
        if (prevViewRef.current !== currentView) {
            prevViewRef.current = currentView;
            setPage(0);
            setAccumulatedMatches([]);
            liveNowEligibleRef.current = null;
            setIsFeedExpanded(false);
        }
    }, [currentView]);

    // Feed query for the current selected view
    const {
        data: feedData,
        isLoading: feedLoading,
        isError: feedError,
        refetch: refetchFeed,
    } = usePublicMatchFeed({
        view: currentView,
        page,
        size: 20,
    });

    // Feed query specifically for Live (shares cache key with live tab when on page 0)
    const {
        data: liveFeedData,
        isLoading: liveFeedLoading,
    } = usePublicMatchFeed(
        { view: 'live', page: 0, size: 20 },
        { enabled: currentView !== 'live' }
    );

    // Counts source: from current feedData or liveFeedData
    const counts = feedData?.counts || liveFeedData?.counts;
    const liveCount = counts?.live ?? 0;

    // Resolve view helper: once resolved, never auto-switches again during this visit
    const resolveView = useCallback(
        (targetView: MatchView, updateUrl = true) => {
            if (viewResolvedRef.current) return;
            viewResolvedRef.current = true;
            setResolvedView(targetView);
            setIsViewKnown(true);
            if (updateUrl) {
                setSearchParams(
                    prev => {
                        const next = new URLSearchParams(prev);
                        next.set('view', targetView);
                        return next;
                    },
                    { replace: true }
                );
            }
        },
        [setSearchParams]
    );

    // 1.5s timeout: if counts not answered, fallback to 'today' default
    useEffect(() => {
        if (viewResolvedRef.current) return;

        const timer = setTimeout(() => {
            if (!viewResolvedRef.current) {
                resolveView('today', true);
            }
        }, 1500);

        return () => clearTimeout(timer);
    }, [resolveView]);

    // Auto-pick default tab on initial load once counts are answered
    useEffect(() => {
        if (viewResolvedRef.current || !counts) return;

        let autoPick: MatchView = 'results';
        if (counts.live > 0) {
            autoPick = 'live';
        } else if (counts.today > 0) {
            autoPick = 'today';
        } else if (counts.upcoming > 0) {
            autoPick = 'upcoming';
        }

        resolveView(autoPick, true);
    }, [counts, resolveView]);

    // Accumulate matches on page change (only when view is known)
    useEffect(() => {
        if (feedData?.items && isViewKnown) {
            setAccumulatedMatches(prev => {
                if (page === 0) return feedData.items;
                const existingIds = new Set(prev.map(m => m.id));
                const newItems = feedData.items.filter(m => !existingIds.has(m.id));
                return [...prev, ...newItems];
            });
        }
    }, [feedData, page, isViewKnown]);

    // Live now coordination: feed and Live now render in the SAME pass
    const isFeedQueryLoading = feedLoading && page === 0;
    const isWaitingForLiveNow = currentView !== 'live' && liveCount > 0 && liveFeedLoading && !liveNowCapExpired;
    const isListLoading = !isViewKnown || isFeedQueryLoading || isWaitingForLiveNow;

    // Record whether Live Now was ready in the same pass the feed became ready
    if (!isListLoading && liveNowEligibleRef.current === null) {
        const liveNowReady =
            currentView !== 'live' &&
            liveCount > 0 &&
            Boolean(liveFeedData?.items && liveFeedData.items.length > 0);
        liveNowEligibleRef.current = liveNowReady;
    }

    // Feed capping on page 0
    const isFeedCapped = page === 0 && !isFeedExpanded && accumulatedMatches.length > matchCap;
    const displayedMatches = useMemo(() => {
        if (isFeedCapped) {
            return accumulatedMatches.slice(0, matchCap);
        }
        return accumulatedMatches;
    }, [accumulatedMatches, isFeedCapped, matchCap]);

    // Group displayed matches by tournament
    const groupedMatches = useMemo(() => {
        const groups: {
            tournamentId: string;
            tournamentName: string;
            tournamentSlug?: string;
            tournamentLogoUrl?: string;
            categoryName?: string | null;
            matches: PublicMatchFeedItem[];
        }[] = [];

        const groupMap = new Map<string, (typeof groups)[0]>();

        displayedMatches.forEach(match => {
            const groupKey = `${match.tournamentId}-${match.categoryName || ''}`;
            let group = groupMap.get(groupKey);
            if (!group) {
                group = {
                    tournamentId: match.tournamentId,
                    tournamentName: match.tournamentName,
                    tournamentSlug: match.tournamentSlug,
                    tournamentLogoUrl: match.tournamentLogoUrl,
                    categoryName: match.categoryName,
                    matches: [],
                };
                groupMap.set(groupKey, group);
                groups.push(group);
            }
            group.matches.push(match);
        });

        return groups;
    }, [displayedMatches]);

    // Total count for current feed view
    const totalFeedCount = feedData?.totalItems ?? (counts ? counts[currentView] : accumulatedMatches.length);

    // Live Now matches for the Live Now section (capped at 4/6 on initial render)
    const allLiveItems = useMemo(() => {
        return liveFeedData?.items || (currentView === 'live' ? feedData?.items : []);
    }, [liveFeedData, currentView, feedData]);
    const totalLiveCount = liveCount > 0 ? liveCount : (liveFeedData?.totalItems ?? (allLiveItems?.length || 0));
    const isLiveCapped = !isLiveExpanded && (allLiveItems?.length || 0) > matchCap;
    const liveNowMatches = useMemo(() => {
        const items = allLiveItems || [];
        if (!isLiveExpanded) {
            return items.slice(0, matchCap);
        }
        return items;
    }, [allLiveItems, isLiveExpanded, matchCap]);

    const showLiveNowSection =
        currentView !== 'live' &&
        liveCount > 0 &&
        liveNowEligibleRef.current === true &&
        liveNowMatches.length > 0;

    const handleTabChange = (view: MatchView) => {
        viewResolvedRef.current = true;
        setIsViewKnown(true);
        setResolvedView(view);
        setPage(0);
        setAccumulatedMatches([]);
        liveNowEligibleRef.current = null;
        setIsFeedExpanded(false);
        setSearchParams(
            prev => {
                const next = new URLSearchParams(prev);
                next.set('view', view);
                return next;
            },
            { replace: false }
        );
    };

    const handleSeeAllLive = () => {
        handleTabChange('live');
        matchesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Date in Malaysia time for Masthead
    const today = useMemo(() => todayInMalaysia(), []);
    const formattedDate = format(today, 'EEE, d MMM yyyy', { locale });

    const updatedTimeStr = feedData?.lastUpdated
        ? formatKickOff(feedData.lastUpdated, i18n.language)
        : null;

    return (
        <div className="space-y-8 md:space-y-12">
            <SEO
                title={t('home:title', { defaultValue: 'AthleticaOS Rugby' })}
                description={t('home:masthead.tagline', { defaultValue: 'Live scores, fixtures and results from Malaysian rugby.' })}
            />

            {/* 1. Masthead (max ~140px on phone, ~180px on desktop) */}
            <header className="py-2 md:py-4 border-b border-line-subtle/50 text-left">
                <div className="flex flex-col gap-1 md:gap-1.5">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-3xl md:text-5xl font-score font-bold tracking-tight text-content-primary leading-none">
                            {t('home:masthead.title', { defaultValue: 'Matchday' })}
                        </h1>
                        <span className="text-xs md:text-sm font-semibold text-content-secondary px-2.5 py-0.5 rounded-full bg-surface-sunken border border-line-subtle">
                            {formattedDate}
                        </span>
                    </div>
                    <p className="text-xs md:text-sm text-content-secondary line-clamp-2">
                        {t('home:masthead.tagline', { defaultValue: 'Live scores, fixtures and results from Malaysian rugby.' })}
                    </p>
                </div>
            </header>

            {/* 2. Live Now Section (Shown only when counts.live > 0 AND currentView !== 'live') */}
            {showLiveNowSection && (
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-crimson motion-safe:animate-pulse" aria-hidden="true" />
                            <h2 className="text-lg md:text-xl font-bold text-content-primary">
                                {t('home:liveNow.title', { defaultValue: 'Live now' })}
                                <span className="ml-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-crimson/10 text-accent-text">
                                    {liveCount}
                                </span>
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={handleSeeAllLive}
                            className="text-xs font-semibold text-brand hover:text-brand-hover hover:underline transition-colors flex items-center gap-1 min-h-[36px]"
                        >
                            <span>{t('home:liveNow.seeAllLive', { defaultValue: 'See all live' })}</span>
                            <ArrowRight size={14} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {liveNowMatches.map(match => (
                            <MatchCard key={match.id} match={match} />
                        ))}
                    </div>

                    {isLiveCapped && (
                        <div className="pt-2 text-center">
                            <button
                                type="button"
                                onClick={() => setIsLiveExpanded(true)}
                                className="px-6 py-2.5 min-h-[44px] rounded-[10px] bg-surface-card border border-line-subtle text-content-primary hover:bg-surface-sunken text-xs font-semibold transition-colors shadow-xs"
                            >
                                {t('home:showAllMatches', { count: totalLiveCount })}
                            </button>
                        </div>
                    )}
                </section>
            )}

            {/* 3. Matches Block */}
            <section ref={matchesRef} className="space-y-4">
                {/* Switcher & Updated Time */}
                <div className="space-y-2">
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none border-b border-line-subtle">
                        {(['live', 'today', 'results', 'upcoming'] as MatchView[]).map(tab => {
                            const count = counts ? counts[tab] : undefined;
                            const isActive = isViewKnown && currentView === tab;

                            return (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => handleTabChange(tab)}
                                    className={`relative py-2.5 px-4 rounded-[10px] text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 min-h-[44px] ${
                                        isActive
                                            ? 'bg-brand text-white shadow-xs'
                                            : 'text-content-secondary hover:text-content-primary hover:bg-surface-sunken'
                                    }`}
                                >
                                    {tab === 'live' && (
                                        <span
                                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                isActive ? 'bg-white motion-safe:animate-pulse' : 'bg-crimson motion-safe:animate-pulse'
                                            }`}
                                        />
                                    )}
                                    <span>{t(`home:tabs.${tab}`, { defaultValue: tab.charAt(0).toUpperCase() + tab.slice(1) })}</span>
                                    {count !== undefined && count > 0 && (
                                        <span
                                            className={`text-[11px] font-bold font-mono px-1.5 py-0.5 rounded-full ${
                                                isActive ? 'bg-white/20 text-white' : 'bg-surface-sunken text-content-secondary'
                                            }`}
                                        >
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Updated Time (Live / Today) */}
                    {isViewKnown && (currentView === 'live' || currentView === 'today') && updatedTimeStr && (
                        <div className="text-xs text-content-tertiary">
                            {t('home:updated', { time: updatedTimeStr, defaultValue: `Updated ${updatedTimeStr}` })}
                        </div>
                    )}
                </div>

                {/* Content States: CSS Grid stack with invisible reference skeleton establishing natural min-height */}
                <div className="grid grid-cols-1">
                    {/* Invisible reference skeleton */}
                    <div className="col-start-1 row-start-1 invisible pointer-events-none select-none" aria-hidden="true">
                        <MatchFeedSkeleton />
                    </div>

                    {/* Active Content: Skeleton / Error / Empty / Loaded list */}
                    <div className="col-start-1 row-start-1 min-w-0">
                        {isListLoading ? (
                            <MatchFeedSkeleton />
                        ) : feedError ? (
                            <div className="h-full flex flex-col justify-center text-center py-12 rounded-[14px] glass-card-surface space-y-3 p-6">
                                <WarningCircle className="w-10 h-10 mx-auto text-accent-text" />
                                <p className="text-sm font-semibold text-content-primary">
                                    {t('home:error.failed', { defaultValue: 'Failed to load matches.' })}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => refetchFeed()}
                                    className="px-4 py-2 min-h-[44px] text-xs font-semibold rounded-[10px] bg-brand text-white hover:bg-brand-hover transition-colors inline-block mx-auto"
                                >
                                    {t('home:error.tryAgain', { defaultValue: 'Try again' })}
                                </button>
                            </div>
                        ) : accumulatedMatches.length === 0 ? (
                            <div className="h-full flex flex-col justify-center text-center py-12 rounded-[14px] glass-card-surface space-y-3 p-6">
                                <Trophy className="w-10 h-10 mx-auto text-content-tertiary" />
                                <p className="text-sm font-semibold text-content-secondary max-w-sm mx-auto">
                                    {t(`home:empty.${currentView}`, { defaultValue: 'No matches found.' })}
                                </p>
                                {currentView === 'live' && (
                                    <div className="flex items-center justify-center gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => handleTabChange('today')}
                                            className="px-3 py-2 min-h-[44px] text-xs font-semibold rounded-[10px] bg-brand text-white hover:bg-brand-hover transition-colors"
                                        >
                                            {t('home:empty.goToToday', { defaultValue: 'Go to today' })}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleTabChange('upcoming')}
                                            className="px-3 py-2 min-h-[44px] text-xs font-semibold rounded-[10px] bg-surface-sunken text-content-primary border border-line-subtle hover:bg-line-subtle transition-colors"
                                        >
                                            {t('home:empty.goToUpcoming', { defaultValue: 'Go to upcoming' })}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {groupedMatches.map(group => (
                                    <div key={`${group.tournamentId}-${group.categoryName || ''}`} className="space-y-2.5">
                                        {/* Tournament Group Header */}
                                        <Link
                                            to={`/tournaments/${group.tournamentSlug || group.tournamentId}`}
                                            className="group inline-flex items-center gap-2 text-content-primary hover:text-brand transition-colors"
                                        >
                                            <div className="w-6 h-6 rounded-md bg-surface-sunken border border-line-subtle shrink-0 flex items-center justify-center overflow-hidden">
                                                {group.tournamentLogoUrl ? (
                                                    <TournamentLogo
                                                        tournamentId={group.tournamentId}
                                                        logoUrl={group.tournamentLogoUrl}
                                                        className="w-full h-full object-contain"
                                                    />
                                                ) : (
                                                    <Trophy size={13} className="text-brand" />
                                                )}
                                            </div>
                                            <span className="text-xs md:text-sm font-bold truncate group-hover:underline">
                                                {group.tournamentName}
                                                {group.categoryName && ` • ${group.categoryName}`}
                                            </span>
                                            <ArrowSquareOut size={14} className="opacity-60 group-hover:opacity-100" />
                                        </Link>

                                        {/* Match Cards in this Tournament */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                                            {group.matches.map(match => (
                                                <MatchCard key={match.id} match={match} />
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {/* Show all matches (n) when capped on page 0 */}
                                {isFeedCapped && (
                                    <div className="pt-2 text-center">
                                        <button
                                            type="button"
                                            onClick={() => setIsFeedExpanded(true)}
                                            className="px-6 py-2.5 min-h-[44px] rounded-[10px] bg-surface-card border border-line-subtle text-content-primary hover:bg-surface-sunken text-xs font-semibold transition-colors shadow-xs"
                                        >
                                            {t('home:showAllMatches', { count: totalFeedCount })}
                                        </button>
                                    </div>
                                )}

                                {/* Show More Pagination Button beyond page 0 / when expanded */}
                                {!isFeedCapped && feedData?.hasNext && (
                                    <div className="pt-2 text-center">
                                        <button
                                            type="button"
                                            onClick={() => setPage(p => p + 1)}
                                            disabled={feedLoading}
                                            className="px-6 py-2.5 min-h-[44px] rounded-[10px] bg-surface-card border border-line-subtle text-content-primary hover:bg-surface-sunken text-xs font-semibold transition-colors disabled:opacity-50 shadow-xs"
                                        >
                                            {feedLoading ? '...' : t('home:showMore', { defaultValue: 'Show more' })}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* 4. This Month Calendar Strip (Lazy loaded, gets allTournaments) */}
            <Suspense fallback={<CalendarStripSkeleton />}>
                <CalendarStrip tournaments={allTournaments} />
            </Suspense>

            {/* 5. Featured Tournaments */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl md:text-2xl font-bold text-content-primary">
                        {isFallbackTournaments
                            ? t('home:section.liveAndUpcoming', { defaultValue: 'Live and upcoming tournaments' })
                            : t('home:section.featured', { defaultValue: 'Featured tournaments' })}
                    </h2>
                    <Link
                        to="/tournaments"
                        className="text-xs md:text-sm font-semibold text-brand hover:text-brand-hover hover:underline transition-colors flex items-center gap-1"
                    >
                        <span>{t('home:section.viewAll', { defaultValue: 'View all →' })}</span>
                    </Link>
                </div>

                {allTournamentsLoading && displayTournaments.length === 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-44 rounded-[14px] glass-card-surface animate-pulse" />
                        ))}
                    </div>
                ) : displayTournaments.length === 0 ? (
                    <div className="text-center py-12 rounded-[14px] glass-card-surface">
                        <Trophy className="w-10 h-10 mx-auto text-content-tertiary mb-3" />
                        <p className="text-sm text-content-secondary">
                            {t('home:empty.noActive', { defaultValue: 'No active tournaments at the moment' })}
                        </p>
                    </div>
                ) : (
                    <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-2 scrollbar-none sm:grid sm:grid-cols-2 lg:grid-cols-3">
                        {displayTournaments.map(tournament => {
                            const startDateObj = parseCalendarDate(tournament.startDate);
                            const endDateObj = parseCalendarDate(tournament.endDate);
                            const formattedDates = startDateObj && endDateObj
                                ? `${format(startDateObj, 'd MMM', { locale })} - ${format(endDateObj, 'd MMM yyyy', { locale })}`
                                : '';

                            return (
                                <Link
                                    key={tournament.id}
                                    to={`/tournaments/${tournament.slug || tournament.id}`}
                                    className="block group min-w-[280px] sm:min-w-0 snap-start text-content-primary no-underline outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-[14px]"
                                >
                                    <GlassCard surface="glass" hover className="h-full p-4 relative flex flex-col justify-between gap-3">
                                        {/* Status Badge */}
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-surface-sunken border border-line-subtle p-1 shrink-0 flex items-center justify-center overflow-hidden">
                                                {tournament.logoUrl || tournament.organiserBranding?.logoUrl ? (
                                                    <TournamentLogo
                                                        tournamentId={tournament.id}
                                                        logoUrl={tournament.logoUrl || tournament.organiserBranding?.logoUrl}
                                                        className="w-full h-full object-contain"
                                                    />
                                                ) : (
                                                    <Trophy size={18} className="text-brand" />
                                                )}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                {tournament.live && (
                                                    <span className="mb-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-crimson text-white text-[11px] font-bold uppercase tracking-wider shadow-xs select-none">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-white motion-safe:animate-pulse" aria-hidden="true" />
                                                        {t('common:status.liveNow', { defaultValue: 'LIVE NOW' })}
                                                    </span>
                                                )}
                                                <h3 className="text-sm font-bold text-content-primary group-hover:text-brand transition-colors line-clamp-2 leading-tight">
                                                    {tournament.name}
                                                </h3>
                                                <p className="text-xs text-content-secondary mt-0.5 line-clamp-1">
                                                    {formatTournamentLevel(tournament.level, t)}
                                                    {tournament.competitionType && ` • ${formatCompetitionType(tournament.competitionType, t)}`}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-1 text-xs text-content-secondary pt-2 border-t border-line-subtle/50">
                                            {formattedDates && (
                                                <div className="flex items-center gap-1.5">
                                                    <CalendarBlank size={13} className="shrink-0 text-content-tertiary" />
                                                    <span className="truncate">{formattedDates}</span>
                                                </div>
                                            )}
                                            {tournament.venue && (
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin size={13} className="shrink-0 text-content-tertiary" />
                                                    <span className="truncate">{tournament.venue}</span>
                                                </div>
                                            )}
                                        </div>
                                    </GlassCard>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* 6. Organisers link */}
            <div className="text-center pt-2">
                <Link
                    to="/contact?subject=ORGANISATION_REGISTRATION"
                    className="text-xs text-content-secondary hover:text-brand hover:underline transition-colors min-h-[44px] inline-flex items-center"
                >
                    {t('home:organisersLink', { defaultValue: 'Organisers: register your interest' })}
                </Link>
            </div>

            {/* 7. Partners Section (compact) */}
            <PartnersSection variant="compact" />
        </div>
    );
}
