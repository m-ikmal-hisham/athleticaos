import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { User, Shield, Trophy, MapPin, MagnifyingGlass, X, WarningCircle } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { GlassCard } from '@/components/GlassCard';
import { Select } from '@/components/Select';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { usePublicPlayers, usePlayerFilters } from '@/hooks/public';

function PlayerCardSkeleton({ className }: { className?: string }) {
    return (
        <div
            className={clsx(
                'h-64 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-5 flex flex-col justify-between space-y-4 animate-pulse',
                className
            )}
        >
            <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                    <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <div className="w-16 h-6 rounded-full bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className="space-y-2">
                    <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
        </div>
    );
}

export default function PlayersList() {
    const [searchParams, setSearchParams] = useSearchParams();

    const urlSearch = searchParams.get('search') || '';
    const urlPosition = searchParams.get('position') || '';
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

    // Fetch filters from /players/filters endpoint
    const { data: filtersData } = usePlayerFilters();

    const positionOptions = useMemo(() => {
        const availablePositions = filtersData?.positions ?? [];
        const list = [{ value: 'all', label: 'All Positions' }];
        const set = new Set(availablePositions);
        if (urlPosition && urlPosition !== 'all' && !set.has(urlPosition)) {
            list.push({ value: urlPosition, label: urlPosition });
        }
        availablePositions.forEach((pos) => {
            list.push({ value: pos, label: pos });
        });
        return list;
    }, [filtersData?.positions, urlPosition]);

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
            position: urlPosition && urlPosition !== 'all' ? urlPosition : undefined,
            state: urlState && urlState !== 'all' ? urlState : undefined,
            size: 24,
        }),
        [urlSearch, urlPosition, urlState]
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
    } = usePublicPlayers(queryParams);

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

    const allPlayers = useMemo(() => {
        return data?.pages.flatMap((page) => page.items) ?? [];
    }, [data]);

    const totalPlayers = data?.pages[0]?.totalItems ?? 0;

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

    const handlePositionChange = (pos: string) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (pos && pos !== 'all') {
                next.set('position', pos);
            } else {
                next.delete('position');
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
                    Players Directory
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                    Discover rugby players, squad members, and athlete profiles
                </p>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                {/* Search Input */}
                <div className="flex-1 relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black/60 dark:text-white/60" />
                    <input
                        type="text"
                        placeholder="Search players by name, team, or position..."
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

                {/* Position Dropdown */}
                <div className="relative w-full md:w-48">
                    <Select
                        value={urlPosition || 'all'}
                        onChange={(val) => handlePositionChange(String(val))}
                        aria-label="Filter by position"
                        options={positionOptions}
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
                    <span>Loading players…</span>
                ) : (
                    <span>
                        Showing {allPlayers.length.toLocaleString()} of {totalPlayers.toLocaleString()} players
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <PlayerCardSkeleton
                                key={i}
                                className={i >= 6 ? 'hidden sm:flex' : 'flex'}
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
                    title="Couldn't load players"
                    description="Check your connection and try again."
                    actionLabel="Try again"
                    onAction={() => refetch()}
                />
            ) : allPlayers.length === 0 ? (
                <EmptyState
                    icon={User}
                    title="No players match your search."
                    description="Try adjusting your search query or filters"
                    actionLabel="Clear filters"
                    onAction={clearFilters}
                />
            ) : (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {allPlayers.map((player) => (
                            <Link
                                key={player.id}
                                to={`/players/${player.slug || player.id}`}
                                className="block group"
                            >
                                <GlassCard className="h-full relative overflow-hidden hover:border-blue-500/50 transition-all hover:shadow-xl hover:shadow-blue-500/10 p-5 flex flex-col justify-between space-y-4">
                                    <div className="space-y-3.5">
                                        {/* Avatar & Jersey Number */}
                                        <div className="flex items-center justify-between">
                                            <div className="relative">
                                                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 p-0.5 shadow-md border border-slate-200/80 dark:border-slate-700/80 overflow-hidden flex items-center justify-center">
                                                    {player.profilePictureUrl ? (
                                                        <img
                                                            src={player.profilePictureUrl}
                                                            alt={player.firstName}
                                                            className="w-full h-full object-cover rounded-full"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                                            }}
                                                        />
                                                    ) : null}
                                                    <div
                                                        className={`w-full h-full rounded-full flex items-center justify-center text-slate-400 font-bold text-lg ${
                                                            player.profilePictureUrl ? 'hidden' : ''
                                                        }`}
                                                    >
                                                        {player.firstName.charAt(0)}
                                                        {player.lastName.charAt(0)}
                                                    </div>
                                                </div>
                                                {player.jerseyNumber && (
                                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-navy text-white text-[11px] font-black flex items-center justify-center shadow-md ring-2 ring-white dark:ring-slate-800">
                                                        {player.jerseyNumber}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Position Badge */}
                                            {player.position && (
                                                <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-blue-500/10 dark:bg-blue-500/20 text-navy dark:text-navy-tint">
                                                    {player.position}
                                                </span>
                                            )}
                                        </div>

                                        {/* Name & Team */}
                                        <div>
                                            <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-navy dark:group-hover:text-navy-tint transition-colors truncate">
                                                {player.firstName} {player.lastName}
                                            </h3>
                                            {player.currentTeamName ? (
                                                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium mt-1 truncate">
                                                    <Shield className="w-4 h-4 text-navy dark:text-navy-tint shrink-0" />
                                                    <span className="truncate">{player.currentTeamName}</span>
                                                </div>
                                            ) : player.organisationName ? (
                                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                                                    {player.organisationName}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                                    Independent Player
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Footer info */}
                                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                        {player.tournamentCount > 0 ? (
                                            <div className="flex items-center gap-1">
                                                <Trophy className="w-4 h-4" />
                                                <span>
                                                    {player.tournamentCount}{' '}
                                                    {player.tournamentCount === 1 ? 'Tournament' : 'Tournaments'}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400">AthleticaOS</span>
                                        )}
                                        {player.state && (
                                            <div className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" weight="bold" />
                                                <span>{player.state}</span>
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
