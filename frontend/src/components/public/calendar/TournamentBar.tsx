import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PublicTournamentSummary } from '@/api/public.api';
import { TournamentPopover } from './TournamentPopover';
import { formatIsoDate } from '@/utils/malaysiaDate';

interface TournamentBarProps {
    tournament: PublicTournamentSummary;
    startCol: number; // 1 to 7
    span: number;     // 1 to 7
    lane: number;     // 0, 1, 2
}

export function TournamentBar({ tournament, startCol, span, lane }: TournamentBarProps) {
    const { t } = useTranslation(['calendar']);
    const [isOpen, setIsOpen] = useState(false);
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
    const barRef = useRef<HTMLButtonElement>(null);

    const handleToggle = () => {
        if (!isOpen && barRef.current) {
            setAnchorRect(barRef.current.getBoundingClientRect());
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    // Status styling
    let statusClass = 'bg-brand text-white hover:bg-brand-hover';
    let statusLabel = t('calendar:status.upcoming');
    if (tournament.live) {
        statusClass = 'bg-crimson text-white hover:opacity-90';
        statusLabel = t('calendar:status.live');
    } else if (tournament.completed) {
        statusClass = 'bg-surface-sunken text-content-primary border border-line-subtle hover:bg-line-subtle';
        statusLabel = t('calendar:status.completed');
    }

    const startFormatted = tournament.startDate ? formatIsoDate(new Date(tournament.startDate)) : '';
    const endFormatted = tournament.endDate ? formatIsoDate(new Date(tournament.endDate)) : '';
    const ariaLabel = `${tournament.name}, ${startFormatted}–${endFormatted}, ${statusLabel}`;

    // Grid placement
    const gridColumn = `${startCol} / span ${span}`;
    const topOffset = `${lane * 22}px`;

    return (
        <>
            <button
                ref={barRef}
                type="button"
                onClick={handleToggle}
                onMouseEnter={() => {
                    if (barRef.current) {
                        setAnchorRect(barRef.current.getBoundingClientRect());
                    }
                }}
                aria-label={ariaLabel}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                style={{
                    gridColumn,
                    top: topOffset,
                }}
                className={`absolute left-0.5 right-0.5 h-5 rounded-[4px] px-1.5 flex items-center gap-1 text-[11px] font-semibold truncate text-left shadow-xs transition-colors cursor-pointer z-10 ${statusClass}`}
            >
                {tournament.live && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 animate-pulse" />
                )}
                <span className="truncate leading-none">{tournament.name}</span>
            </button>

            {isOpen && (
                <TournamentPopover
                    tournament={tournament}
                    onClose={() => setIsOpen(false)}
                    anchorRect={anchorRect}
                />
            )}
        </>
    );
}
