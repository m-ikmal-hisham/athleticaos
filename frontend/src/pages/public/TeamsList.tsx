import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, Users, Trophy, MapPin, MagnifyingGlass, X, WarningCircle } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { GlassCard } from '@/components/GlassCard';
import { LogoImage } from '@/components/public/LogoImage';
import { ListRow } from '@/components/public/ListRow';
import { FilterSheetButton } from '@/components/public/FilterSheetButton';
import { Select } from '@/components/Select';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { usePublicTeams, useTeamFilters } from '@/hooks/public';

function TeamCardSkeleton({ className }: { className?: string }) {
    return (
        <div
            className={clsx(
                'h-48 rounded-[14px] glass-card-surface p-6 flex flex-col justify-between space-y-4 animate-pulse',
                className
            )}
        >
            <div className="space-y-4">
                <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-700 shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="w-16 h-4 rounded-full bg-slate-200 dark:bg-slate-700" />
                        <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                        <div className="h-3.5 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
                    </div>
                </div>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
        </div>
    );
}

function formatCategory(cat: string, t?: (k: string, opts?: Record<string, unknown>) => string): string {
    const key = cat.toUpperCase();
    if (t) {
        return t(`common:category.${key}`, { defaultValue: cat });
    }
    switch (key) {
        case 'MENS':
            return "Men's";
        case 'WOMENS':
            return "Women's";
        case 'MIXED':
            return 'Mixed';
        case 'BOYS':
            return 'Boys';
        case 'GIRLS':
            return 'Girls';
        default:
            return cat;
    }
}

export default function TeamsList() {
    const { t } = useTranslation(['teams', 'common']);
    const [searchParams, setSearchParams] = useSearchParams();

    const urlSearch = searchParams.get('search') || '';
    const urlCategory = searchParams.get('category') || '';
    const urlState = searchParams.get('state') || '';

    const [searchInput, setSearchInput] = useState(urlSearch);
    const [showSlowLoading, setShowSlowLoading] = useState(false);

    // Sync search input if URL changes externally (back/forward navigation, clear filters)
    useEffect(() => {
        setSearchInput(urlSearch);
    }, [urlSearch]);

    // Debounce search input (300 ms) and update URL with replace: true
    useEffect(() => {
        if (searchInput.trim() === urlSearch.trim()) return;

        const timer = setTimeout(() => {
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    const trimmed = searchInput.trim();
                    if (trimmed) {
                        next.set('search', trimmed);
                    } else {
                        next.delete('search');
                    }
                    return next;
                },
                { replace: true }
            );
        }, 300);

        return () => clearTimeout(timer);
    }, [searchInput, urlSearch, setSearchParams]);

    // Fetch filters from /teams/filters endpoint
    const { data: filtersData } = useTeamFilters();

    const categoryOptions = useMemo(() => {
        const availableCategories = filtersData?.categories ?? [];
        const list = [{ value: 'all', label: t('teams:list.categoryFilter', 'All Categories') }];
        const set = new Set(availableCategories.map((c) => c.toUpperCase()));
        if (urlCategory && urlCategory !== 'all' && !set.has(urlCategory.toUpperCase())) {
            list.push({ value: urlCategory, label: formatCategory(urlCategory, t) });
        }
        availableCategories.forEach((cat) => {
            list.push({ value: cat, label: formatCategory(cat, t) });
        });
        return list;
    }, [filtersData?.categories, urlCategory, t]);

    const stateOptions = useMemo(() => {
        const availableStates = filtersData?.states ?? [];
        const list = [{ value: 'all', label: t('teams:list.stateFilter', 'All States') }];
        const set = new Set(availableStates);
        if (urlState && urlState !== 'all' && !set.has(urlState)) {
            list.push({ value: urlState, label: urlState });
        }
        availableStates.forEach((st) => {
            list.push({ value: st, label: st });
        });
        return list;
    }, [filtersData?.states, urlState, t]);

    const queryParams = useMemo(
        () => ({
            search: urlSearch.trim() || undefined,
            category: urlCategory && urlCategory !== 'all' ? urlCategory : undefined,
            state: urlState && urlState !== 'all' ? urlState : undefined,
            size: 24,
        }),
        [urlSearch, urlCategory, urlState]
    );

    // Mobile sheet draft filter state
    const [draftCategory, setDraftCategory] = useState(urlCategory || 'all');
    const [draftState, setDraftState] = useState(urlState || 'all');

    useEffect(() => {
        setDraftCategory(urlCategory || 'all');
    }, [urlCategory]);

    useEffect(() => {
        setDraftState(urlState || 'all');
    }, [urlState]);

    const activeFilterCount =
        (urlCategory && urlCategory !== 'all' ? 1 : 0) +
        (urlState && urlState !== 'all' ? 1 : 0);

    const applyDraftFilters = () => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (draftCategory && draftCategory !== 'all') {
                next.set('category', draftCategory);
            } else {
                next.delete('category');
            }
            if (draftState && draftState !== 'all') {
                next.set('state', draftState);
            } else {
                next.delete('state');
            }
            return next;
        });
    };

    const clearDraftFilters = () => {
        setDraftCategory('all');
        setDraftState('all');
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete('category');
            next.delete('state');
            return next;
        });
    };

    const {
        data,
        isLoading,
        isFetching,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
        isError,
        refetch,
    } = usePublicTeams(queryParams);

    // After 8s of initial loading, display "Still loading..."
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (isLoading) {
            timer = setTimeout(() => {
                setShowSlowLoading(true);
            }, 8000);
        } else {
            setShowSlowLoading(false);
        }
        return () => clearTimeout(timer);
    }, [isLoading]);

    const allTeams = useMemo(() => {
        return data?.pages.flatMap((page) => page.items) ?? [];
    }, [data]);

    const totalTeams = data?.pages[0]?.totalItems ?? 0;

    const handleClearSearch = () => {
        setSearchInput('');
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.delete('search');
                return next;
            },
            { replace: true }
        );
    };

    const handleCategoryChange = (categoryVal: string) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (categoryVal && categoryVal !== 'all') {
                next.set('category', categoryVal);
            } else {
                next.delete('category');
            }
            return next;
        });
    };

    const handleStateChange = (st: string) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (st && st !== 'all') {
                next.set('state', st);
            } else {
                next.delete('state');
            }
            return next;
        });
    };

    const clearFilters = () => {
        setSearchInput('');
        setSearchParams(new URLSearchParams());
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="font-score text-3xl font-bold text-slate-900 dark:text-white">
                    {t('teams:list.title', { defaultValue: 'Teams & Clubs' })}
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                    {t('teams:list.subtitle', { defaultValue: 'Explore rugby teams, clubs, and academies across Malaysia' })}
                </p>
            </div>

            {/* Search & Filters */}
            <div className="flex items-center gap-2 md:gap-4">
                {/* Search Input */}
                <div className="flex-1 relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black/60 dark:text-white/60 pointer-events-none" />
                    <input
                        type="text"
                        placeholder={t('teams:list.searchPlaceholder', { defaultValue: 'Search teams by name, short name, club, or state...' })}
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full min-h-[44px] pl-10 pr-10 py-2.5 rounded-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-navy dark:focus:ring-navy-tint text-slate-900 dark:text-white placeholder-slate-400 text-sm"
                    />
                    {searchInput && (
                        <button
                            type="button"
                            aria-label={t('teams:list.clearSearch', { defaultValue: 'Clear search' })}
                            onClick={handleClearSearch}
                            className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Mobile Filter Sheet Button (< md) */}
                <div className="md:hidden shrink-0">
                    <FilterSheetButton
                        activeCount={activeFilterCount}
                        onApply={applyDraftFilters}
                        onClear={clearDraftFilters}
                    >
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-content-secondary mb-1.5 uppercase tracking-wider">
                                    {t('common:filter.category')}
                                </label>
                                <Select
                                    value={draftCategory}
                                    onChange={(val) => setDraftCategory(String(val))}
                                    options={categoryOptions}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-content-secondary mb-1.5 uppercase tracking-wider">
                                    {t('common:filter.state')}
                                </label>
                                <Select
                                    value={draftState}
                                    onChange={(val) => setDraftState(String(val))}
                                    options={stateOptions}
                                />
                            </div>
                        </div>
                    </FilterSheetButton>
                </div>

                {/* Category Dropdown (>= md) */}
                <div className="hidden md:block relative w-48">
                    <Select
                        value={urlCategory || 'all'}
                        onChange={(val) => handleCategoryChange(String(val))}
                        aria-label={t('teams:list.categoryFilter', { defaultValue: 'All Categories' })}
                        options={categoryOptions}
                    />
                </div>

                {/* State Dropdown (>= md) */}
                <div className="hidden md:block relative w-44">
                    <Select
                        value={urlState || 'all'}
                        onChange={(val) => handleStateChange(String(val))}
                        aria-label={t('teams:list.stateFilter', { defaultValue: 'All States' })}
                        options={stateOptions}
                    />
                </div>
            </div>

            {/* Results Count & Subtle Updating Indicator */}
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 min-h-[24px]">
                {isLoading ? (
                    <span>{t('teams:list.loading', { defaultValue: 'Loading teams…' })}</span>
                ) : (
                    <span>
                        {t('teams:list.showingCount', {
                            shown: allTeams.length.toLocaleString(),
                            total: totalTeams.toLocaleString(),
                            defaultValue: `Showing ${allTeams.length.toLocaleString()} of ${totalTeams.toLocaleString()} teams`,
                        })}
                    </span>
                )}
                {isFetching && !isLoading && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-navy dark:text-navy-tint font-medium animate-pulse ml-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-navy dark:bg-navy-tint animate-ping" />
                        {t('teams:list.updating', { defaultValue: 'Updating…' })}
                    </span>
                )}
            </div>

            {/* Content Area: Skeletons / Error / Empty / Grid */}
            {isLoading ? (
                <div>
                    {/* Phone Skeletons (< md) */}
                    <div className="md:hidden space-y-2">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div
                                key={i}
                                className="min-h-[52px] h-[52px] rounded-xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse"
                            />
                        ))}
                    </div>

                    {/* Tablet/Desktop Skeletons (>= md) */}
                    <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <TeamCardSkeleton
                                key={i}
                                className={i >= 6 ? 'hidden md:flex' : 'flex'}
                            />
                        ))}
                    </div>
                    {showSlowLoading && (
                        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6 animate-pulse">
                            {t('teams:list.stillLoading', { defaultValue: 'Still loading…' })}
                        </p>
                    )}
                </div>
            ) : isError ? (
                <EmptyState
                    icon={WarningCircle}
                    title={t('teams:list.errorTitle', { defaultValue: "Couldn't load teams" })}
                    description={t('teams:list.errorDesc', { defaultValue: 'Check your connection and try again.' })}
                    actionLabel={t('teams:list.tryAgain', { defaultValue: 'Try again' })}
                    onAction={() => refetch()}
                />
            ) : allTeams.length === 0 ? (
                <EmptyState
                    icon={Shield}
                    title={t('teams:list.empty', { defaultValue: 'No teams match your search.' })}
                    description={t('teams:list.emptyHint', { defaultValue: 'Try adjusting your search query or filters' })}
                    actionLabel={t('teams:list.clearFilters', { defaultValue: 'Clear filters' })}
                    onAction={clearFilters}
                />
            ) : (
                <div className="space-y-8">
                    {/* Phone List (< md) */}
                    <div className="md:hidden space-y-2">
                        {allTeams.map((team) => {
                            const metaParts = [
                                team.category ? formatCategory(team.category, t) : '',
                                team.division || team.ageGroup,
                                team.state,
                            ].filter(Boolean);

                            return (
                                <ListRow
                                    key={team.id}
                                    to={`/teams/${team.slug || team.id}`}
                                    title={team.name}
                                    logoUrl={team.logoUrl}
                                    icon={<Shield className="w-5 h-5 text-slate-400" />}
                                    meta={metaParts.join(' · ')}
                                />
                            );
                        })}
                    </div>

                    {/* Tablet & Desktop Grid (>= md: 2-col on 768-1023, 3-col on >= 1024) */}
                    <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {allTeams.map((team) => (
                            <Link
                                key={team.id}
                                to={`/teams/${team.slug || team.id}`}
                                className="block group"
                            >
                                <GlassCard surface="glass" hover className="h-full relative overflow-hidden p-6 flex flex-col justify-between space-y-4">
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-4">
                                            {/* Logo */}
                                            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 p-2 shadow-md border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                <LogoImage
                                                    src={team.logoUrl}
                                                    name={team.name}
                                                    className="w-full h-full object-contain"
                                                    icon={<Shield className="w-8 h-8 text-slate-400" />}
                                                />
                                            </div>

                                            {/* Name & Badges */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                                    {team.category && (
                                                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase bg-blue-500/10 dark:bg-blue-500/20 text-navy dark:text-navy-tint">
                                                            {formatCategory(team.category, t)}
                                                        </span>
                                                    )}
                                                    {team.division && (
                                                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase bg-violet-500/10 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300">
                                                            {team.division}
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-navy dark:group-hover:text-navy-tint transition-colors truncate">
                                                    {team.name}
                                                </h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                    {team.organisationName || team.shortName || t('teams:list.independent', { defaultValue: 'Independent Team' })}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Tournaments Tags */}
                                        {team.tournaments && team.tournaments.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                {team.tournaments.slice(0, 2).map((tr) => (
                                                    <span
                                                        key={tr.id}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 truncate max-w-[200px]"
                                                    >
                                                        <Trophy className="w-3 h-3 shrink-0" weight="bold" />
                                                        <span className="truncate">{tr.name}</span>
                                                    </span>
                                                ))}
                                                {team.tournaments.length > 2 && (
                                                    <span className="text-xs text-slate-400 font-medium self-center">
                                                        {t('teams:list.moreTournaments', { count: team.tournaments.length - 2, defaultValue: `+${team.tournaments.length - 2} more` })}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Footer */}
                                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                        <div className="flex items-center gap-1.5">
                                            <Users className="w-4 h-4 text-navy dark:text-navy-tint" />
                                            <span>
                                                {t('teams:list.playersCount', { count: team.playerCount, defaultValue: `${team.playerCount} Players` })}
                                            </span>
                                        </div>
                                        {team.state && (
                                            <div className="flex items-center gap-1">
                                                <MapPin className="w-4 h-4" />
                                                <span>{team.state}</span>
                                            </div>
                                        )}
                                    </div>
                                </GlassCard>
                            </Link>
                        ))}
                    </div>

                    {/* Show more button */}
                    {hasNextPage && (
                        <div className="flex justify-center pt-4">
                            <Button
                                variant="secondary"
                                onClick={() => fetchNextPage()}
                                isLoading={isFetchingNextPage}
                            >
                                {t('teams:list.showMore', { defaultValue: 'Show more' })}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
