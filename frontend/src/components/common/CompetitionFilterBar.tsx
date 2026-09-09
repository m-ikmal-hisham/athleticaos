import { useMemo } from 'react';
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
}

/** Native tournament dropdown shared by Public and Admin views. */
export function CompetitionFilterBar({
    tournaments,
    selectedTournamentId,
    onSelect,
    allLabel = 'All-Time Career',
    variant = 'public',
    className,
}: CompetitionFilterBarProps) {
    const sortedTournaments = useMemo(() => {
        const statusOrder: Record<string, number> = { LIVE: 0, PUBLISHED: 1, COMPLETED: 2, DRAFT: 3 };
        return [...tournaments].sort((a, b) => {
            const sa = statusOrder[a.status || 'COMPLETED'] ?? 2;
            const sb = statusOrder[b.status || 'COMPLETED'] ?? 2;
            return sa - sb;
        });
    }, [tournaments]);

    return (
        <div className={clsx('min-w-0 w-full sm:w-80 max-w-full', className)}>
            <select
                aria-label="Filter by tournament"
                value={selectedTournamentId ?? ''}
                onChange={event => onSelect(event.target.value || null)}
                className={clsx(
                    'w-full min-w-0 rounded-lg border px-3 py-2 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2',
                    variant === 'admin'
                        ? 'bg-background border-glass-border text-foreground focus:ring-primary-500/30 focus:border-primary-500'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-blue-500/30 focus:border-blue-500'
                )}
            >
                <option value="">{allLabel}</option>
                {sortedTournaments.map(tournament => (
                    <option key={tournament.id} value={tournament.id}>
                        {tournament.name}{tournament.status === 'LIVE' ? ' (Live)' : ''}
                    </option>
                ))}
            </select>
        </div>
    );
}
