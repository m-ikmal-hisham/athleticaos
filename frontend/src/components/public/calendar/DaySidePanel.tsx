import { useEffect, useRef, useState, useId } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X, CalendarPlus, Trophy, Clock, MapPin, CaretRight, ArrowSquareOut } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { PublicTournamentSummary, PublicMatchFeedItem } from '@/api/public.api';
import { usePublicMatchFeed } from '@/hooks/public/usePublicMatchFeed';
import { TournamentLogo } from '@/components/common/TournamentLogo';
import { downloadTournamentIcs } from '@/utils/ics';
import { useUIStore } from '@/store/ui.store';
import { BottomSheet } from '@/components/public/BottomSheet';
import { getDateLocale } from '@/utils/malaysiaDate';
import { format } from 'date-fns';

interface DaySidePanelProps {
    isOpen: boolean;
    onClose: () => void;
    date: Date;
    isoDate: string; // YYYY-MM-DD
    tournaments: PublicTournamentSummary[];
}

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function DaySidePanel({ isOpen, onClose, date, isoDate, tournaments }: DaySidePanelProps) {
    const { t, i18n } = useTranslation(['calendar', 'common']);
    const [page, setPage] = useState(0); // the feed API pages from 0
    const [accumulatedMatches, setAccumulatedMatches] = useState<PublicMatchFeedItem[]>([]);
    const panelRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    // Reset pagination when date changes
    useEffect(() => {
        setPage(0);
        setAccumulatedMatches([]);
    }, [isoDate]);

    // Fetch matches for this day
    const { data: feedData, isLoading: matchesLoading } = usePublicMatchFeed({
        view: 'range',
        from: isoDate,
        to: isoDate,
        page,
        size: 20,
    });

    useEffect(() => {
        if (feedData?.items) {
            setAccumulatedMatches(prev => {
                if (page === 0) return feedData.items;
                // Append unique items
                const existingIds = new Set(prev.map(m => m.id));
                const newItems = feedData.items.filter(m => !existingIds.has(m.id));
                return [...prev, ...newItems];
            });
        }
    }, [feedData, page]);

    const [isDesktop, setIsDesktop] = useState(
        () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
    );
    useEffect(() => {
        const mql = window.matchMedia('(min-width: 1024px)');
        const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, []);

    // Date header formatting with date-fns locale
    const locale = getDateLocale(i18n.language);
    const formattedDateTitle = format(date, 'EEEE, d MMMM yyyy', { locale });

    // Focus trapping and Escape key management for desktop panel
    useEffect(() => {
        if (!isOpen || !isDesktop) return;

        const { incrementOverlayCount, decrementOverlayCount } = useUIStore.getState();
        incrementOverlayCount();

        const previouslyFocused = document.activeElement as HTMLElement | null;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const focusTimer = window.setTimeout(() => {
            const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
            (first ?? panelRef.current)?.focus();
        }, 0);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onCloseRef.current();
                return;
            }
            if (e.key === 'Tab' && panelRef.current) {
                const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
                if (items.length === 0) return;
                const first = items[0];
                const last = items[items.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            decrementOverlayCount();
            window.clearTimeout(focusTimer);
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = originalOverflow;
            if (previouslyFocused && document.contains(previouslyFocused)) {
                previouslyFocused.focus({ preventScroll: true });
            }
        };
    }, [isOpen, isDesktop]);

    if (!isOpen) return null;

    // Running tournaments on this day
    const runningTournaments = tournaments.filter(t => {
        if (!t.startDate || !t.endDate) return false;
        const start = t.startDate.slice(0, 10);
        const end = t.endDate.slice(0, 10);
        return isoDate >= start && isoDate <= end;
    });

    const content = (
        <div className="space-y-6">
            {/* Running Tournaments Section */}
            <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-content-secondary mb-3 flex items-center gap-1.5">
                    <Trophy size={14} className="text-brand" />
                    <span>{t('calendar:runningTournaments')}</span>
                    <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-surface-sunken">
                        {runningTournaments.length}
                    </span>
                </h3>

                {runningTournaments.length === 0 ? (
                    <p className="text-xs text-content-tertiary italic p-3 rounded-[10px] bg-surface-sunken">
                        {t('calendar:noTournamentsFound')}
                    </p>
                ) : (
                    <div className="space-y-2">
                        {runningTournaments.map(tournament => (
                            <div
                                key={tournament.id}
                                className="p-3 rounded-[10px] bg-surface-sunken border border-line-subtle flex items-center justify-between gap-3 text-content-primary"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-md bg-surface-card p-0.5 border border-line-subtle shrink-0 flex items-center justify-center overflow-hidden">
                                        {tournament.logoUrl || tournament.organiserBranding?.logoUrl ? (
                                            <TournamentLogo
                                                tournamentId={tournament.id}
                                                logoUrl={tournament.logoUrl || tournament.organiserBranding?.logoUrl}
                                                className="w-full h-full object-contain"
                                            />
                                        ) : (
                                            <Trophy size={16} className="text-brand" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-xs font-bold truncate">
                                            {tournament.name}
                                        </h4>
                                        <div className="flex items-center gap-2 text-[11px] text-content-secondary mt-0.5">
                                            {tournament.live ? (
                                                <span className="text-accent-text font-bold uppercase tracking-wider flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-crimson animate-pulse" />
                                                    {t('calendar:status.live')}
                                                </span>
                                            ) : tournament.completed ? (
                                                <span>{t('calendar:status.completed')}</span>
                                            ) : (
                                                <span>{t('calendar:status.upcoming')}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => downloadTournamentIcs(tournament)}
                                        className="w-8 h-8 rounded-md inline-flex items-center justify-center text-content-secondary hover:text-content-primary hover:bg-line-subtle border border-line-subtle"
                                        title={t('calendar:addToCalendar')}
                                        aria-label={t('calendar:addToCalendar')}
                                    >
                                        <CalendarPlus size={16} />
                                    </button>
                                    <Link
                                        to={`/tournaments/${tournament.slug || tournament.id}`}
                                        className="w-8 h-8 rounded-md inline-flex items-center justify-center bg-brand text-white hover:bg-brand-hover"
                                        title={t('calendar:openTournament')}
                                        aria-label={t('calendar:openTournament')}
                                    >
                                        <ArrowSquareOut size={16} />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Matches Section */}
            <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-content-secondary mb-3 flex items-center gap-1.5">
                    <Clock size={14} className="text-brand" />
                    <span>{t('calendar:dayMatches')}</span>
                    {accumulatedMatches.length > 0 && (
                        <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-surface-sunken">
                            {feedData?.totalItems ?? accumulatedMatches.length}
                        </span>
                    )}
                </h3>

                {matchesLoading && page === 0 ? (
                    <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-16 rounded-[10px] bg-surface-sunken animate-pulse" />
                        ))}
                    </div>
                ) : accumulatedMatches.length === 0 ? (
                    <p className="text-xs text-content-tertiary italic p-3 rounded-[10px] bg-surface-sunken">
                        {t('calendar:noMatchesDay')}
                    </p>
                ) : (
                    <div className="space-y-2.5">
                        {accumulatedMatches.map(match => (
                            <Link
                                key={match.id}
                                to={`/matches/${match.id}`}
                                className="block p-3 rounded-[12px] bg-surface-card border border-line-subtle hover:border-brand/40 shadow-xs transition-colors group"
                            >
                                <div className="flex items-center justify-between text-[11px] text-content-tertiary mb-1.5">
                                    <span className="flex items-center gap-1 font-medium">
                                        <Clock size={12} />
                                        {match.matchTime || t('calendar:venueTbc')}
                                    </span>
                                    {match.status && ['LIVE', 'ONGOING'].includes(match.status) ? (
                                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-crimson text-white uppercase tracking-wider animate-pulse">
                                            {t('calendar:status.live')}
                                        </span>
                                    ) : (
                                        <span className="truncate max-w-[130px]">{match.tournamentName}</span>
                                    )}
                                </div>

                                {/* Teams & Scores */}
                                <div className="flex items-center justify-between gap-2 text-xs font-semibold text-content-primary">
                                    <div className="flex-1 truncate">
                                        <span>{match.homeTeamName}</span>
                                    </div>
                                    <div className="px-2 py-0.5 rounded bg-surface-sunken font-mono font-bold text-xs shrink-0">
                                        {match.homeScore !== undefined && match.awayScore !== undefined
                                            ? `${match.homeScore} - ${match.awayScore}`
                                            : t('calendar:vs')}
                                    </div>
                                    <div className="flex-1 text-right truncate">
                                        <span>{match.awayTeamName}</span>
                                    </div>
                                </div>

                                {match.venue && (
                                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-line-subtle/50 text-[11px] text-content-tertiary">
                                        <span className="flex items-center gap-1 truncate">
                                            <MapPin size={12} />
                                            <span className="truncate">{match.venue}</span>
                                        </span>
                                        <span className="group-hover:text-brand flex items-center gap-0.5 shrink-0 font-medium">
                                            <CaretRight size={12} />
                                        </span>
                                    </div>
                                )}
                            </Link>
                        ))}

                        {feedData?.hasNext && (
                            <button
                                type="button"
                                onClick={() => setPage(p => p + 1)}
                                disabled={matchesLoading}
                                className="w-full py-2 rounded-md bg-surface-sunken text-content-secondary hover:text-content-primary text-xs font-semibold border border-line-subtle transition-colors disabled:opacity-50"
                            >
                                {matchesLoading ? '...' : t('calendar:showMore')}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    // Render BottomSheet on mobile (< 1024px)
    return (
        <>
            {!isDesktop && (
                <BottomSheet
                    isOpen={isOpen}
                    onClose={onClose}
                    title={formattedDateTitle}
                >
                    <div className="p-2 pb-6">
                        {content}
                    </div>
                </BottomSheet>
            )}

            {/* Desktop Slide-over Drawer (>= 1024px) */}
            {isDesktop && isOpen &&
                createPortal(
                    <div className="fixed inset-0 z-50">
                        {/* Scrim */}
                        <div
                            className="fixed inset-0 bg-black/60 backdrop-blur-xs motion-safe:animate-fade-in"
                            onClick={onClose}
                            aria-hidden="true"
                        />

                        {/* Slide-over panel */}
                        <div
                            ref={panelRef}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby={titleId}
                            tabIndex={-1}
                            className="fixed top-0 right-0 bottom-0 w-[420px] max-w-full bg-surface-card border-l border-line-subtle shadow-2xl flex flex-col z-50 outline-none motion-safe:animate-slide-left overflow-hidden"
                        >
                            {/* Panel Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-line-subtle shrink-0">
                                <h2 id={titleId} className="text-base font-bold text-content-primary truncate">
                                    {formattedDateTitle}
                                </h2>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="min-w-[36px] min-h-[36px] -mr-2 inline-flex items-center justify-center rounded-[10px] text-content-secondary hover:text-content-primary hover:bg-surface-sunken"
                                    aria-label={t('calendar:close')}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Panel Body */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {content}
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
}
