import { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
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
import { MatchCard } from '@/components/public/match';
import { TournamentLogo } from '@/components/common/TournamentLogo';
import { formatTournamentLevel, formatCompetitionType, formatKickOff } from '@/utils/formatters';
import { sortForHomeFallback } from '@/utils/tournamentSort';
import { todayInMalaysia, getDateLocale, parseCalendarDate } from '@/utils/malaysiaDate';
import { format } from 'date-fns';

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
    const currentView: MatchView = VALID_VIEWS.includes(rawView as MatchView) ? (rawView as MatchView) : 'today';
    const [hasExplicitView, setHasExplicitView] = useState(() => Boolean(rawView && VALID_VIEWS.includes(rawView as MatchView)));

    // Matches pagination
    const [page, setPage] = useState(0);
    const [accumulatedMatches, setAccumulatedMatches] = useState<PublicMatchFeedItem[]>([]);

    // Reset page and accumulated list when view changes
    const prevViewRef = useRef(currentView);
    useEffect(() => {
        if (prevViewRef.current !== currentView) {
            prevViewRef.current = currentView;
            setPage(0);
            setAccumulatedMatches([]);
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
    const { data: liveFeedData } = usePublicMatchFeed(
        { view: 'live', page: 0, size: 20 },
        { enabled: currentView !== 'live' }
    );

    // Counts source: from current feedData or liveFeedData
    const counts = feedData?.counts || liveFeedData?.counts;

    // Accumulate matches on page change
    useEffect(() => {
        if (feedData?.items) {
            setAccumulatedMatches(prev => {
                if (page === 0) return feedData.items;
                const existingIds = new Set(prev.map(m => m.id));
                const newItems = feedData.items.filter(m => !existingIds.has(m.id));
                return [...prev, ...newItems];
            });
        }
    }, [feedData, page]);

    // Auto-pick default tab on initial load if no URL view was specified
    useEffect(() => {
        if (hasExplicitView || !counts) return;

        let autoPick: MatchView = 'results';
        if (counts.live > 0) {
            autoPick = 'live';
        } else if (counts.today > 0) {
            autoPick = 'today';
        } else if (counts.upcoming > 0) {
            autoPick = 'upcoming';
        }

        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('view', autoPick);
            return next;
        }, { replace: true });
        setHasExplicitView(true);
    }, [counts, hasExplicitView, setSearchParams]);

    const handleTabChange = (view: MatchView) => {
        setHasExplicitView(true);
        setPage(0);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('view', view);
            return next;
        }, { replace: false });
    };

    const handleSeeAllLive = () => {
        handleTabChange('live');
        matchesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Group accumulated matches by tournament
    const groupedMatches = useMemo(() => {
        const groups: {
            tournamentId: string;
            tournamentName: string;
            tournamentSlug?: string;
            tournamentLogoUrl?: string;
            categoryName?: string | null;
            matches: PublicMatchFeedItem[];
        }[] = [];

        const groupMap = new Map<string, typeof groups[0]>();

        accumulatedMatches.forEach(match => {
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
    }, [accumulatedMatches]);

    // Live Now matches for the Live Now section (first 4)
    const liveNowMatches = useMemo(() => {
        const items = liveFeedData?.items || (currentView === 'live' ? feedData?.items : []);
        return (items || []).slice(0, 4);
    }, [liveFeedData, currentView, feedData]);

    const liveCount = counts?.live ?? 0;
    const showLiveNowSection = currentView !== 'live' && liveCount > 0 && liveNowMatches.length > 0;

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
                </section>
            )}

            {/* 3. Matches Block */}
            <section ref={matchesRef} className="space-y-4">
                {/* Switcher & Updated Time */}
                <div className="space-y-2">
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none border-b border-line-subtle">
                        {(['live', 'today', 'results', 'upcoming'] as MatchView[]).map(tab => {
                            const count = counts ? counts[tab] : undefined;
                            const isActive = currentView === tab;

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
                    {(currentView === 'live' || currentView === 'today') && updatedTimeStr && (
                        <div className="text-xs text-content-tertiary">
                            {t('home:updated', { time: updatedTimeStr, defaultValue: `Updated ${updatedTimeStr}` })}
                        </div>
                    )}
                </div>

                {/* Content States */}
                {feedLoading && page === 0 ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-24 rounded-[14px] glass-card-surface animate-pulse" />
                        ))}
                    </div>
                ) : feedError ? (
                    <div className="text-center py-12 rounded-[14px] glass-card-surface space-y-3">
                        <WarningCircle className="w-10 h-10 mx-auto text-accent-text" />
                        <p className="text-sm font-semibold text-content-primary">
                            {t('home:error.failed', { defaultValue: 'Failed to load matches.' })}
                        </p>
                        <button
                            type="button"
                            onClick={() => refetchFeed()}
                            className="px-4 py-2 min-h-[44px] text-xs font-semibold rounded-[10px] bg-brand text-white hover:bg-brand-hover transition-colors"
                        >
                            {t('home:error.tryAgain', { defaultValue: 'Try again' })}
                        </button>
                    </div>
                ) : accumulatedMatches.length === 0 ? (
                    <div className="text-center py-12 rounded-[14px] glass-card-surface space-y-3 p-6">
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

                        {/* Show More Pagination Button */}
                        {feedData?.hasNext && (
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
            </section>

            {/* 4. This Month Calendar Strip (Lazy loaded, gets allTournaments) */}
            <Suspense
                fallback={
                    <div className="h-48 rounded-[14px] glass-card-surface animate-pulse" />
                }
            >
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
