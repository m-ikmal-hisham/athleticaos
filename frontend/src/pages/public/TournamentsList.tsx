import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarBlank, MapPin, Trophy, MagnifyingGlass, ListBullets } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { publicTournamentApi, PublicTournamentSummary } from '../../api/public.api';
import { LogoImage } from '@/components/public/LogoImage';
import { GlassCard } from '@/components/GlassCard';
import { SmartFilterPills } from '@/components/SmartFilterPills';
import { formatCompetitionType, formatTournamentLevel } from '@/utils/formatters';
import { sortTournamentsForList } from '@/utils/tournamentSort';
import { todayInMalaysia, formatIsoYearMonth, formatCalendarDate, getDateLocale } from '@/utils/malaysiaDate';
import { TournamentCalendarSkeleton } from '@/components/public/calendar/TournamentCalendarSkeleton';

const TournamentCalendar = lazy(() => import('@/components/public/calendar/TournamentCalendar'));

const STORAGE_VIEW_KEY = 'athos_tournaments_view';

export default function TournamentsList() {
    const { t, i18n } = useTranslation(['tournament', 'calendar', 'common']);
    const [searchParams, setSearchParams] = useSearchParams();

    // Determine initial view: URL ?view=... -> localStorage -> default 'list'
    const viewParam = searchParams.get('view');
    const [activeView, setActiveView] = useState<'list' | 'calendar'>(() => {
        if (viewParam === 'calendar' || viewParam === 'list') {
            return viewParam;
        }
        try {
            const saved = localStorage.getItem(STORAGE_VIEW_KEY);
            if (saved === 'calendar' || saved === 'list') {
                return saved;
            }
        } catch {
            // localStorage unavailable
        }
        return 'list';
    });

    const [tournaments, setTournaments] = useState<PublicTournamentSummary[]>([]);
    const [filteredTournaments, setFilteredTournaments] = useState<PublicTournamentSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'live' | 'upcoming' | 'completed' | null>(null);

    // Sync activeView with URL changes
    useEffect(() => {
        if (viewParam === 'calendar' || viewParam === 'list') {
            setActiveView(viewParam);
        }
    }, [viewParam]);

    useEffect(() => {
        loadTournaments();
    }, []);

    const filterTournaments = useCallback(() => {
        let filtered = [...tournaments];

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(tr =>
                tr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tr.venue.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Status filter
        if (statusFilter) {
            filtered = filtered.filter(tr => {
                if (statusFilter === 'live') return tr.live;
                if (statusFilter === 'upcoming') return !tr.live && !tr.completed;
                if (statusFilter === 'completed') return tr.completed;
                return true;
            });
        }

        const sorted = sortTournamentsForList(filtered);
        setFilteredTournaments(sorted);
    }, [tournaments, searchQuery, statusFilter]);

    useEffect(() => {
        filterTournaments();
    }, [filterTournaments]);

    const loadTournaments = async () => {
        try {
            const data = await publicTournamentApi.getTournaments();
            setTournaments(data);
        } catch (error) {
            console.error('Failed to load tournaments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewChange = (newView: 'list' | 'calendar') => {
        setActiveView(newView);
        try {
            localStorage.setItem(STORAGE_VIEW_KEY, newView);
        } catch {
            // localStorage unavailable
        }

        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (newView === 'calendar') {
                next.set('view', 'calendar');
                if (!next.get('month')) {
                    next.set('month', formatIsoYearMonth(todayInMalaysia()));
                }
            } else {
                next.delete('view');
                next.delete('month');
            }
            return next;
        }, { replace: true });
    };

    const dateLocale = getDateLocale(i18n.language);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="font-score text-3xl font-bold text-slate-900 dark:text-white">
                        {t('tournament:list.title')}
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        {t('tournament:list.subtitle')}
                    </p>
                </div>

                {/* View Switch Segmented Control */}
                <div
                    role="tablist"
                    aria-label={t('tournament:list.viewAriaLabel')}
                    className="inline-flex p-1 rounded-[12px] bg-surface-sunken border border-line-subtle shadow-2xs self-start sm:self-auto"
                >
                    <button
                        type="button"
                        role="tab"
                        id="view-list-tab"
                        aria-selected={activeView === 'list'}
                        aria-controls="view-list-panel"
                        onClick={() => handleViewChange('list')}
                        className={`min-h-[44px] px-3.5 rounded-[8px] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                            activeView === 'list'
                                ? 'bg-surface-card text-content-primary shadow-xs'
                                : 'text-content-secondary hover:text-content-primary'
                        }`}
                    >
                        <ListBullets size={16} />
                        <span>{t('calendar:viewList')}</span>
                    </button>
                    <button
                        type="button"
                        role="tab"
                        id="view-calendar-tab"
                        aria-selected={activeView === 'calendar'}
                        aria-controls="view-calendar-panel"
                        onClick={() => handleViewChange('calendar')}
                        className={`min-h-[44px] px-3.5 rounded-[8px] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                            activeView === 'calendar'
                                ? 'bg-surface-card text-content-primary shadow-xs'
                                : 'text-content-secondary hover:text-content-primary'
                        }`}
                    >
                        <CalendarBlank size={16} />
                        <span>{t('calendar:viewCalendar')}</span>
                    </button>
                </div>
            </div>

            {/* View Panels */}
            {activeView === 'calendar' ? (
                <div role="tabpanel" id="view-calendar-panel" aria-labelledby="view-calendar-tab">
                    <Suspense fallback={<TournamentCalendarSkeleton />}>
                        <TournamentCalendar tournaments={tournaments} />
                    </Suspense>
                </div>
            ) : (
                <div role="tabpanel" id="view-list-panel" aria-labelledby="view-list-tab" className="space-y-6">
                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black/60 dark:text-white/60 pointer-events-none" />
                            <input
                                type="text"
                                placeholder={t('tournament:list.searchPlaceholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-lg bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-navy dark:focus:ring-navy-tint text-slate-900 dark:text-white placeholder-slate-400 text-sm"
                            />
                        </div>

                        {/* Status Filter */}
                        <SmartFilterPills
                            options={[
                                { id: 'live', label: t('tournament:list.filterLive') },
                                { id: 'upcoming', label: t('tournament:list.filterUpcoming') },
                                { id: 'completed', label: t('tournament:list.filterCompleted') },
                            ]}
                            allLabel={t('common:filter.all')}
                            selectedId={statusFilter}
                            onSelect={(id) => setStatusFilter(id as 'live' | 'upcoming' | 'completed' | null)}
                        />
                    </div>

                    {/* Results Count */}
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                        {t('tournament:list.showingCount', { count: filteredTournaments.length, total: tournaments.length })}
                    </div>

                    {/* Tournaments Grid */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div
                                    key={i}
                                    className="h-56 rounded-[14px] glass-card-surface animate-pulse"
                                />
                            ))}
                        </div>
                    ) : filteredTournaments.length === 0 ? (
                        <div className="text-center py-16 rounded-[14px] glass-card-surface">
                            <Trophy className="w-16 h-16 mx-auto text-black/60 dark:text-white/60 mb-4" />
                            <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                                {t('tournament:list.emptyTitle')}
                            </p>
                            <p className="text-slate-600 dark:text-slate-400">
                                {t('tournament:list.emptyDescription')}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredTournaments.map(tournament => (
                                <Link
                                    key={tournament.id}
                                    to={`/tournaments/${tournament.slug || tournament.id}`}
                                    className="block group"
                                >
                                    <GlassCard surface="glass" hover className="h-full relative overflow-hidden">
                                        <div className="p-6 space-y-4 relative z-10">
                                            {/* Status Badge */}
                                            <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
                                                {tournament.live && (
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-crimson text-white text-xs font-bold uppercase tracking-wider shadow-sm">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                        {t('common:status.live')}
                                                    </div>
                                                )}
                                                {tournament.completed && (
                                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-glass-bg backdrop-blur-2xl border border-glass-border shadow-lg text-foreground text-xs font-medium">
                                                        {t('common:status.completed')}
                                                    </div>
                                                )}
                                                {!tournament.live && !tournament.completed && (
                                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-glass-bg backdrop-blur-2xl border border-glass-border shadow-lg text-foreground text-xs font-medium">
                                                        {t('common:status.upcoming')}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Tournament Info & Logo */}
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-navy dark:group-hover:text-navy-tint transition-colors line-clamp-2">
                                                        {tournament.name}
                                                    </h3>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                        {formatTournamentLevel(tournament.level, t)}
                                                        {tournament.competitionType && ` • ${formatCompetitionType(tournament.competitionType, t)}`}
                                                    </p>
                                                    {tournament.seasonName && (
                                                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                                                            {tournament.seasonName}
                                                        </p>
                                                    )}
                                                </div>
                                                {(tournament.logoUrl || tournament.organiserBranding?.logoUrl) && (
                                                    <div className="w-12 h-12 flex-shrink-0 bg-white dark:bg-slate-700/50 rounded-lg p-1 border border-slate-200 dark:border-slate-700 overflow-hidden">
                                                        <LogoImage
                                                            src={tournament.logoUrl || tournament.organiserBranding?.logoUrl}
                                                            name={tournament.name}
                                                            size="md"
                                                            className="w-full h-full object-contain"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Details */}
                                            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                                <div className="flex items-center gap-2">
                                                    <CalendarBlank className="w-4 h-4 flex-shrink-0" />
                                                    <span className="truncate">
                                                        {formatCalendarDate(tournament.startDate, 'd MMM yyyy', { locale: dateLocale })} -{' '}
                                                        {formatCalendarDate(tournament.endDate, 'd MMM yyyy', { locale: dateLocale })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-4 h-4 flex-shrink-0" />
                                                    <span className="truncate">{tournament.venue}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Hover Effect */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-600/0 group-hover:from-blue-500/5 group-hover:to-blue-600/10 transition-all pointer-events-none" />
                                    </GlassCard>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
