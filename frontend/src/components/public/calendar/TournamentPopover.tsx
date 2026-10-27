import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CalendarBlank, MapPin, Trophy, CalendarPlus, ArrowSquareOut, X, Buildings } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { PublicTournamentSummary } from '@/api/public.api';
import { TournamentLogo } from '@/components/common/TournamentLogo';
import { downloadTournamentIcs } from '@/utils/ics';
import { formatTournamentLevel, formatCompetitionType } from '@/utils/formatters';

interface TournamentPopoverProps {
    tournament: PublicTournamentSummary;
    onClose: () => void;
    anchorRect?: DOMRect | null;
}

export function TournamentPopover({ tournament, onClose, anchorRect }: TournamentPopoverProps) {
    const { t } = useTranslation(['calendar', 'common']);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Dismiss on click outside or Escape
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    // Position popover relative to anchor
    const style: React.CSSProperties = {};
    if (anchorRect) {
        const popoverWidth = 320;
        let left = anchorRect.left + (anchorRect.width / 2) - (popoverWidth / 2);
        // Bound to window
        if (left < 16) left = 16;
        if (left + popoverWidth > window.innerWidth - 16) {
            left = window.innerWidth - popoverWidth - 16;
        }

        const spaceBelow = window.innerHeight - anchorRect.bottom;
        const placeAbove = spaceBelow < 280 && anchorRect.top > 280;

        style.position = 'fixed';
        style.left = `${left}px`;
        style.width = `${popoverWidth}px`;
        if (placeAbove) {
            style.bottom = `${window.innerHeight - anchorRect.top + 8}px`;
        } else {
            style.top = `${anchorRect.bottom + 8}px`;
        }
    }

    const levelText = tournament.level
        ? t(`calendar:level.${tournament.level.toLowerCase()}`, { defaultValue: formatTournamentLevel(tournament.level, t) })
        : '';
    const compTypeText = tournament.competitionType
        ? t(`calendar:competitionType.${tournament.competitionType.toLowerCase()}`, { defaultValue: formatCompetitionType(tournament.competitionType, t) })
        : '';

    return (
        <div
            ref={popoverRef}
            style={style}
            role="dialog"
            aria-modal="false"
            aria-label={tournament.name}
            className="z-50 rounded-[14px] bg-surface-card border border-line-subtle shadow-xl p-4 text-content-primary motion-safe:animate-fade-in"
        >
            {/* Header with logo & close */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-lg p-1 bg-surface-sunken border border-line-subtle shrink-0 flex items-center justify-center overflow-hidden">
                        {tournament.logoUrl || tournament.organiserBranding?.logoUrl ? (
                            <TournamentLogo
                                tournamentId={tournament.id}
                                logoUrl={tournament.logoUrl || tournament.organiserBranding?.logoUrl}
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <Trophy className="w-5 h-5 text-brand" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <h4 className="font-bold text-sm leading-snug line-clamp-2 text-content-primary">
                            {tournament.name}
                        </h4>
                        {(levelText || compTypeText) && (
                            <p className="text-xs text-content-secondary mt-0.5 truncate">
                                {levelText}
                                {levelText && compTypeText && ' • '}
                                {compTypeText}
                            </p>
                        )}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="min-w-[44px] min-h-[44px] -mr-2 -mt-2 inline-flex items-center justify-center rounded-md text-content-tertiary hover:text-content-primary hover:bg-surface-sunken"
                    aria-label={t('calendar:close')}
                >
                    <X size={18} />
                </button>
            </div>

            {/* Status Pill */}
            <div className="mb-3">
                {tournament.live ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-crimson text-white">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        {t('calendar:status.live')}
                    </span>
                ) : tournament.completed ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-sunken text-content-secondary border border-line-subtle">
                        {t('calendar:status.completed')}
                    </span>
                ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand/10 text-brand dark:text-navy-tint border border-brand/20">
                        {t('calendar:status.upcoming')}
                    </span>
                )}
            </div>

            {/* Meta Details */}
            <div className="space-y-1.5 text-xs text-content-secondary mb-4 border-t border-line-subtle pt-2.5">
                <div className="flex items-center gap-2">
                    <CalendarBlank size={14} className="shrink-0 text-brand" />
                    <span>
                        {new Date(tournament.startDate).toLocaleDateString()} – {new Date(tournament.endDate).toLocaleDateString()}
                    </span>
                </div>
                {tournament.venue && (
                    <div className="flex items-center gap-2">
                        <MapPin size={14} className="shrink-0 text-content-secondary" />
                        <span className="truncate">{tournament.venue}</span>
                    </div>
                )}
                {tournament.organiserName && (
                    <div className="flex items-center gap-2">
                        <Buildings size={14} className="shrink-0 text-content-tertiary" />
                        <span className="truncate">{tournament.organiserName}</span>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-line-subtle">
                <Link
                    to={`/tournaments/${tournament.slug || tournament.id}`}
                    className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors"
                >
                    <ArrowSquareOut size={16} />
                    <span>{t('calendar:openTournament')}</span>
                </Link>
                <button
                    type="button"
                    onClick={() => downloadTournamentIcs(tournament)}
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md bg-surface-sunken text-content-primary hover:bg-line-subtle border border-line-subtle text-xs font-semibold transition-colors"
                    title={t('calendar:addToCalendar')}
                    aria-label={t('calendar:addToCalendar')}
                >
                    <CalendarPlus size={16} />
                    <span className="hidden sm:inline">{t('calendar:addToCalendar')}</span>
                </button>
            </div>
        </div>
    );
}
