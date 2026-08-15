import { useState, useRef, useEffect, useMemo } from 'react';
import { MagnifyingGlass, CaretDown, Check, Trophy } from '@phosphor-icons/react';
import { clsx } from 'clsx';

export interface TournamentFilterOption {
    id: string;
    name: string;
    status?: string; // 'LIVE' | 'PUBLISHED' | 'COMPLETED' | 'DRAFT'
    year?: string;
}

interface CompetitionFilterBarProps {
    tournaments: TournamentFilterOption[];
    selectedTournamentId: string | null;
    onSelect: (tournamentId: string | null) => void;
    allLabel?: string;
    variant?: 'public' | 'admin';
    className?: string;
    /** Maximum number of quick-access pill chips before overflow into searchable dropdown */
    maxChips?: number;
}

/**
 * CompetitionFilterBar (Option 4: Searchable Select + Quick Chips)
 *
 * Adaptive tournament/season filter bar:
 * - When total items ≤ maxChips: Renders as 1-tap horizontal pill buttons
 * - When total items > maxChips: Shows top quick chips + searchable overflow dropdown
 *
 * Used across Public and Admin views for standardised filtering.
 */
export function CompetitionFilterBar({
    tournaments,
    selectedTournamentId,
    onSelect,
    allLabel = 'All-Time Career',
    variant = 'public',
    className,
    maxChips = 3,
}: CompetitionFilterBarProps) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Sort: LIVE first, then PUBLISHED, then most recent, then rest
    const sortedTournaments = useMemo(() => {
        return [...tournaments].sort((a, b) => {
            const statusOrder: Record<string, number> = { LIVE: 0, PUBLISHED: 1, COMPLETED: 2, DRAFT: 3 };
            const sa = statusOrder[a.status || 'COMPLETED'] ?? 2;
            const sb = statusOrder[b.status || 'COMPLETED'] ?? 2;
            if (sa !== sb) return sa - sb;
            return 0; // preserve original order for same status
        });
    }, [tournaments]);

    // Quick-access chips: first N sorted tournaments
    const quickChips = sortedTournaments.slice(0, maxChips);
    const overflowTournaments = sortedTournaments.slice(maxChips);
    const hasOverflow = overflowTournaments.length > 0;

    // If the selected tournament is in overflow, promote it to visible chips
    const selectedInOverflow = selectedTournamentId
        ? overflowTournaments.find(t => t.id === selectedTournamentId)
        : null;

    const visibleChips = selectedInOverflow
        ? [...quickChips.slice(0, maxChips - 1), selectedInOverflow]
        : quickChips;

    // Filter overflow for search
    const filteredOverflow = useMemo(() => {
        if (!searchQuery) return sortedTournaments;
        return sortedTournaments.filter(t =>
            t.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [sortedTournaments, searchQuery]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
                setSearchQuery('');
            }
        };
        if (dropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [dropdownOpen]);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (dropdownOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [dropdownOpen]);

    const isAdmin = variant === 'admin';

    // Pill classes
    const basePill = clsx(
        'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border whitespace-nowrap cursor-pointer select-none',
        'active:scale-95'
    );

    const activePill = isAdmin
        ? 'bg-primary-500 text-white border-primary-500 shadow-md shadow-primary-500/20'
        : 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/25';

    const inactivePill = isAdmin
        ? 'bg-glass-bg border-glass-border text-muted-foreground hover:bg-glass-border/50 hover:text-foreground hover:border-glass-border'
        : 'bg-white/60 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 backdrop-blur-sm';

    const handleSelect = (id: string | null) => {
        onSelect(id);
        setDropdownOpen(false);
        setSearchQuery('');
    };

    return (
        <div className={clsx('relative', className)}>
            <div
                ref={scrollRef}
                className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5"
            >
                {/* All-Time / Global chip */}
                <button
                    onClick={() => handleSelect(null)}
                    className={clsx(basePill, selectedTournamentId === null ? activePill : inactivePill)}
                >
                    <Trophy weight={selectedTournamentId === null ? 'fill' : 'regular'} className="w-3.5 h-3.5" />
                    {allLabel}
                </button>

                {/* Quick-access tournament chips */}
                {visibleChips.map(t => {
                    const isSelected = selectedTournamentId === t.id;
                    const isLive = t.status === 'LIVE';
                    return (
                        <button
                            key={t.id}
                            onClick={() => handleSelect(t.id)}
                            className={clsx(basePill, isSelected ? activePill : inactivePill)}
                        >
                            {isLive && (
                                <span className={clsx(
                                    'w-2 h-2 rounded-full shrink-0 animate-pulse',
                                    isSelected ? 'bg-white' : 'bg-red-500'
                                )} />
                            )}
                            <span className="truncate max-w-[180px]">{t.name}</span>
                        </button>
                    );
                })}

                {/* Overflow: "More Tournaments" dropdown trigger */}
                {hasOverflow && (
                    <div ref={dropdownRef} className="relative">
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className={clsx(
                                basePill,
                                inactivePill,
                                dropdownOpen && (isAdmin
                                    ? 'ring-2 ring-primary-500/30 border-primary-500/50'
                                    : 'ring-2 ring-blue-500/30 border-blue-500/50')
                            )}
                        >
                            <MagnifyingGlass className="w-3.5 h-3.5" />
                            More
                            <CaretDown className={clsx('w-3 h-3 transition-transform', dropdownOpen && 'rotate-180')} />
                        </button>

                        {/* Searchable Dropdown */}
                        {dropdownOpen && (
                            <div className={clsx(
                                'absolute right-0 top-full mt-2 w-72 rounded-xl shadow-xl border z-50 overflow-hidden',
                                isAdmin
                                    ? 'bg-card border-glass-border'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                            )}>
                                {/* Search Input */}
                                <div className={clsx(
                                    'p-2 border-b',
                                    isAdmin ? 'border-glass-border' : 'border-slate-100 dark:border-slate-700'
                                )}>
                                    <div className="relative">
                                        <MagnifyingGlass className={clsx(
                                            'absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4',
                                            isAdmin ? 'text-muted-foreground' : 'text-slate-400'
                                        )} />
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            placeholder="Search tournaments..."
                                            className={clsx(
                                                'w-full pl-8 pr-3 py-2 rounded-lg text-sm outline-none',
                                                isAdmin
                                                    ? 'bg-glass-bg border border-glass-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary-500/20'
                                                    : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20'
                                            )}
                                        />
                                    </div>
                                </div>

                                {/* Options List */}
                                <div className="max-h-60 overflow-y-auto py-1">
                                    {/* All-Time option in dropdown too */}
                                    <button
                                        onClick={() => handleSelect(null)}
                                        className={clsx(
                                            'w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors',
                                            selectedTournamentId === null
                                                ? (isAdmin ? 'bg-primary-500/10 text-primary-500' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400')
                                                : (isAdmin ? 'text-foreground hover:bg-glass-bg' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50')
                                        )}
                                    >
                                        <Trophy weight={selectedTournamentId === null ? 'fill' : 'regular'} className="w-4 h-4 shrink-0" />
                                        <span className="flex-1 truncate">{allLabel}</span>
                                        {selectedTournamentId === null && <Check className="w-4 h-4 shrink-0" weight="bold" />}
                                    </button>

                                    {filteredOverflow.map(t => {
                                        const isSelected = selectedTournamentId === t.id;
                                        const isLive = t.status === 'LIVE';
                                        return (
                                            <button
                                                key={t.id}
                                                onClick={() => handleSelect(t.id)}
                                                className={clsx(
                                                    'w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors',
                                                    isSelected
                                                        ? (isAdmin ? 'bg-primary-500/10 text-primary-500' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400')
                                                        : (isAdmin ? 'text-foreground hover:bg-glass-bg' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50')
                                                )}
                                            >
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    {isLive && (
                                                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                                                    )}
                                                    <span className="truncate">{t.name}</span>
                                                    {t.status && (
                                                        <span className={clsx(
                                                            'text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase shrink-0',
                                                            t.status === 'LIVE' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                                                            t.status === 'COMPLETED' ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400' :
                                                            'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                                        )}>
                                                            {t.status === 'LIVE' ? 'Live' : t.status === 'COMPLETED' ? 'Done' : t.status}
                                                        </span>
                                                    )}
                                                </div>
                                                {isSelected && <Check className="w-4 h-4 shrink-0" weight="bold" />}
                                            </button>
                                        );
                                    })}

                                    {filteredOverflow.length === 0 && (
                                        <div className={clsx(
                                            'px-3 py-6 text-center text-sm',
                                            isAdmin ? 'text-muted-foreground' : 'text-slate-400'
                                        )}>
                                            No tournaments found
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
