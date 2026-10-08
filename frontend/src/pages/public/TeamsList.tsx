import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Shield, Users, Trophy, MapPin, MagnifyingGlass, X, WarningCircle } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { GlassCard } from '@/components/GlassCard';
import { Select } from '@/components/Select';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { usePublicTeams, useTeamFilters } from '@/hooks/public';

function TeamCardSkeleton({ className }: { className?: string }) {
    return (
        <div
            className={clsx(
                'h-48 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-6 flex flex-col justify-between space-y-4 animate-pulse',
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

function formatCategory(cat: string): string {
    switch (cat.toUpperCase()) {
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
        const list = [{ value: 'all', label: 'All Categories' }];
        const set = new Set(availableCategories.map((c) => c.toUpperCase()));
        if (urlCategory && urlCategory !== 'all' && !set.has(urlCategory.toUpperCase())) {
            list.push({ value: urlCategory, label: formatCategory(urlCategory) });
        }
        availableCategories.forEach((cat) => {
            list.push({ value: cat, label: formatCategory(cat) });
        });
        return list;
    }, [filtersData?.categories, urlCategory]);

    const stateOptions = useMemo(() => {
        const availableStates = filtersData?.states ?? [];
        const list = [{ value: 'all', label: 'All States' }];
        const set = new Set(availableStates);
        if (urlState && urlState !== 'all' && !set.has(urlState)) {
            list.push({ value: urlState, label: urlState });
        }
        availableStates.forEach((st) => {
            list.push({ value: st, label: st });
        });
        return list;
    }, [filtersData?.states, urlState]);

    const queryParams = useMemo(
        () => ({
            search: urlSearch.trim() || undefined,
            category: urlCategory && urlCategory !== 'all' ? urlCategory : undefined,
            state: urlState && urlState !== 'all' ? urlState : undefined,
            size: 24,
        }),
        [urlSearch, urlCategory, urlState]
    );

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
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Teams & Clubs
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                    Explore rugby teams, clubs, and academies across Malaysia
                </p>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                {/* Search Input */}
                <div className="flex-1 relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black/60 dark:text-white/60" />
                    <input
                        type="text"
                        placeholder="Search teams by name, short name, club, or state..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-900 dark:text-white placeholder-slate-400 text-sm"
                    />
                    {searchInput && (
                        <button
                            type="button"
                            aria-label="Clear search"
                            onClick={handleClearSearch}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Category Dropdown */}
                <div className="relative w-full md:w-48">
                    <Select
                        value={urlCategory || 'all'}
                        onChange={(val) => handleCategoryChange(String(val))}
                        aria-label="Filter by category"
                        options={categoryOptions}
                    />
                </div>

                {/* State Dropdown */}
                <div className="relative w-full md:w-44">
                    <Select
                        value={urlState || 'all'}
                        onChange={(val) => handleStateChange(String(val))}
                        aria-label="Filter by state"
                        options={stateOptions}
                    />
                </div>
            </div>

            {/* Results Count & Subtle Updating Indicator */}
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 min-h-[24px]">
                {isLoading ? (
                    <span>Loading teams…</span>
                ) : (
                    <span>
                        Showing {allTeams.length.toLocaleString()} of {totalTeams.toLocaleString()} teams
                    </span>
                )}
                {isFetching && !isLoading && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-navy dark:text-navy-tint font-medium animate-pulse ml-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-navy dark:bg-navy-tint animate-ping" />
                        Updating…
                    </span>
                )}
            </div>

            {/* Content Area: Skeletons / Error / Empty / Grid */}
            {isLoading ? (
                <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <TeamCardSkeleton
                                key={i}
                                className={i >= 6 ? 'hidden md:flex' : 'flex'}
                            />
                        ))}
                    </div>
                    {showSlowLoading && (
                        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6 animate-pulse">
                            Still loading…
                        </p>
                    )}
                </div>
            ) : isError ? (
                <EmptyState
                    icon={WarningCircle}
                    title="Couldn't load teams"
                    description="Check your connection and try again."
                    actionLabel="Try again"
                    onAction={() => refetch()}
                />
            ) : allTeams.length === 0 ? (
                <EmptyState
                    icon={Shield}
                    title="No teams match your search."
                    description="Try adjusting your search query or filters"
                    actionLabel="Clear filters"
                    onAction={clearFilters}
                />
            ) : (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {allTeams.map((team) => (
                            <Link
                                key={team.id}
                                to={`/teams/${team.slug || team.id}`}
                                className="block group"
                            >
                                <GlassCard className="h-full relative overflow-hidden hover:border-blue-500/50 transition-all hover:shadow-xl hover:shadow-blue-500/10 p-6 flex flex-col justify-between space-y-4">
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-4">
                                            {/* Logo */}
                                            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 p-2 shadow-md border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                {team.logoUrl ? (
                                                    <img
                                                        src={team.logoUrl}
                                                        alt={team.name}
                                                        className="w-full h-full object-contain"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                                        }}
                                                    />
                                                ) : null}
                                                <div
                                                    className={`w-full h-full flex items-center justify-center text-slate-400 ${
                                                        team.logoUrl ? 'hidden' : ''
                                                    }`}
                                                >
                                                    <Shield className="w-8 h-8" />
                                                </div>
                                            </div>

                                            {/* Name & Badges */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                                    {team.category && (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/10 dark:bg-blue-500/20 text-navy dark:text-navy-tint">
                                                            {team.category}
                                                        </span>
                                                    )}
                                                    {team.division && (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-violet-500/10 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300">
                                                            {team.division}
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-navy dark:group-hover:text-navy-tint transition-colors truncate">
                                                    {team.name}
                                                </h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                    {team.organisationName || team.shortName || 'Independent Team'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Tournaments Tags */}
                                        {team.tournaments && team.tournaments.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                {team.tournaments.slice(0, 2).map((t) => (
                                                    <span
                                                        key={t.id}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 truncate max-w-[200px]"
                                                    >
                                                        <Trophy className="w-3 h-3 shrink-0" weight="bold" />
                                                        <span className="truncate">{t.name}</span>
                                                    </span>
                                                ))}
                                                {team.tournaments.length > 2 && (
                                                    <span className="text-[11px] text-slate-400 font-medium self-center">
                                                        +{team.tournaments.length - 2} more
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Footer */}
                                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                        <div className="flex items-center gap-1.5">
                                            <Users className="w-4 h-4 text-navy dark:text-navy-tint" />
                                            <span>{team.playerCount} Players</span>
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
                                Show more
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
