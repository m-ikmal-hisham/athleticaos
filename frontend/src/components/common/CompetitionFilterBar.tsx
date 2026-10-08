import { useMemo } from 'react';
import { clsx } from 'clsx';
import { Select } from '../Select';

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

/** Unified tournament dropdown shared by Public and Admin views. */
export function CompetitionFilterBar({
    tournaments,
    selectedTournamentId,
    onSelect,
    allLabel = 'All-Time Career',
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

    const options = useMemo(() => {
        return [
            { value: '', label: allLabel },
            ...sortedTournaments.map(tournament => ({
                value: tournament.id,
                label: `${tournament.name}${tournament.status === 'LIVE' ? ' (Live)' : ''}`,
            })),
        ];
    }, [allLabel, sortedTournaments]);

    return (
        <div className={clsx('min-w-0 w-full sm:w-80 max-w-full', className)}>
            <Select
                aria-label="Filter by tournament"
                value={selectedTournamentId ?? ''}
                onChange={val => onSelect(val ? String(val) : null)}
                options={options}
            />
        </div>
    );
}

