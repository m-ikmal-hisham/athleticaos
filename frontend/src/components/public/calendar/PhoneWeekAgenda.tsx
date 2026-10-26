import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CaretLeft, CaretRight, CaretDown, CaretUp, CalendarBlank, Trophy, Clock, CalendarPlus, ArrowSquareOut } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { PublicTournamentSummary, PublicMatchDay, PublicMatchFeedItem } from '@/api/public.api';
import { usePublicMatchFeed } from '@/hooks/public/usePublicMatchFeed';
import { CalendarGridDay, getDateLocale, formatIsoDate } from '@/utils/malaysiaDate';
import { TournamentLogo } from '@/components/common/TournamentLogo';
import { downloadTournamentIcs } from '@/utils/ics';
import { format } from 'date-fns';
import { MatchCard } from '@/components/public/match';

interface PhoneWeekAgendaProps {
    weekDays: CalendarGridDay[]; // 7 days Mon-Sun
    tournaments: PublicTournamentSummary[];
    matchDays: PublicMatchDay[];
    onPrevWeek: () => void;
    onNextWeek: () => void;
    onToday: () => void;
    onSelectDayModal?: (day: CalendarGridDay) => void;
}

interface DayMatchesSectionProps {
    isoDate: string;
    isExpanded: boolean;
    totalMatches: number;
}

function DayMatchesSection({ isoDate, isExpanded, totalMatches }: DayMatchesSectionProps) {
    const { t } = useTranslation(['calendar']);
    const [page, setPage] = useState(0); // the feed API pages from 0
    const [accumulated, setAccumulated] = useState<PublicMatchFeedItem[]>([]);

    useEffect(() => {
        setPage(0);
        setAccumulated([]);
    }, [isoDate]);

    const { data: feed, isLoading } = usePublicMatchFeed({
        view: 'range',
        from: isoDate,
        to: isoDate,
        page,
        size: 20,
    }, { enabled: isExpanded && totalMatches > 0 }); // load a day's matches only when it is opened

    useEffect(() => {
        if (feed?.items) {
            setAccumulated(prev => {
                if (page === 0) return feed.items;
                const existing = new Set(prev.map(m => m.id));
                const newItems = feed.items.filter(m => !existing.has(m.id));
                return [...prev, ...newItems];
            });
        }
    }, [feed, page]);

    if (!isExpanded) return null;

    if (totalMatches === 0) {
        return (
            <p className="text-xs text-content-secondary p-3 rounded-[10px] bg-surface-sunken">
                {t('calendar:noMatchesDay')}
            </p>
        );
    }

    if (isLoading && page === 0) {
        return (
            <div className="space-y-2">
                {[1, 2].map(i => (
                    <div key={i} className="h-14 rounded-[10px] bg-surface-sunken animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {accumulated.map(match => (
                <MatchCard key={match.id} match={match} compact />
            ))}

            {feed?.hasNext && (
                <button
                    type="button"
                    onClick={() => setPage(p => p + 1)}
                    disabled={isLoading}
                    className="w-full py-2 rounded-md bg-surface-sunken text-content-secondary hover:text-content-primary text-xs font-semibold border border-line-subtle transition-colors disabled:opacity-50"
                >
                    {isLoading ? '...' : t('calendar:showMore')}
                </button>
            )}
        </div>
    );
}

export function PhoneWeekAgenda({
    weekDays,
    tournaments,
    matchDays,
    onPrevWeek,
    onNextWeek,
    onToday,
}: PhoneWeekAgendaProps) {
    const { t, i18n } = useTranslation(['calendar', 'common']);
    const locale = getDateLocale(i18n.language);

    // Initial expanded day: Today if in this week, else the first day of the week
    const [selectedIso, setSelectedIso] = useState<string>(() => {
        const today = weekDays.find(d => d.isToday);
        return today ? today.isoDate : weekDays[0]?.isoDate || '';
    });
    const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>(() => {
        const today = weekDays.find(d => d.isToday);
        const initial = today ? today.isoDate : weekDays[0]?.isoDate || '';
        return { [initial]: true };
    });

    const dayRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // When week changes, keep selected day in sync
    useEffect(() => {
        const found = weekDays.find(d => d.isoDate === selectedIso);
        if (!found) {
            const today = weekDays.find(d => d.isToday);
            const target = today ? today.isoDate : weekDays[0]?.isoDate || '';
            setSelectedIso(target);
            setExpandedDays({ [target]: true });
        }
    }, [weekDays, selectedIso]);

    // Touch swipe left/right support
    const touchStartX = useRef<number | null>(null);
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const diff = e.changedTouches[0].clientX - touchStartX.current;
        if (diff > 50) {
            onPrevWeek();
        } else if (diff < -50) {
            onNextWeek();
        }
        touchStartX.current = null;
    };

    // Match days mapping
    const matchDayMap = new Map<string, PublicMatchDay>();
    matchDays.forEach(md => matchDayMap.set(md.date, md));

    const handleSelectDayStrip = (isoDate: string) => {
        setSelectedIso(isoDate);
        setExpandedDays(prev => ({ ...prev, [isoDate]: true }));

        // Smooth scroll to the day in the agenda
        const el = dayRefs.current[isoDate];
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    };

    const toggleDayExpanded = (isoDate: string) => {
        setExpandedDays(prev => ({
            ...prev,
            [isoDate]: !prev[isoDate],
        }));
    };

    // Month label from first day of week
    const firstDay = weekDays[0]?.date || new Date();
    const monthYearTitle = format(firstDay, 'MMMM yyyy', { locale });

    const weekdayShort = [
        t('calendar:mon'),
        t('calendar:tue'),
        t('calendar:wed'),
        t('calendar:thu'),
        t('calendar:fri'),
        t('calendar:sat'),
        t('calendar:sun'),
    ];

    return (
        <div className="space-y-4">
            {/* Week Strip Container */}
            <div
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className="p-3 rounded-[14px] bg-surface-card border border-line-subtle shadow-xs space-y-3"
            >
                {/* Week Strip Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={onPrevWeek}
                            aria-label={t('calendar:previousWeek')}
                            className="w-10 h-10 inline-flex items-center justify-center rounded-[10px] bg-surface-sunken text-content-primary border border-line-subtle hover:bg-line-subtle"
                        >
                            <CaretLeft size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={onNextWeek}
                            aria-label={t('calendar:nextWeek')}
                            className="w-10 h-10 inline-flex items-center justify-center rounded-[10px] bg-surface-sunken text-content-primary border border-line-subtle hover:bg-line-subtle"
                        >
                            <CaretRight size={18} />
                        </button>
                        <span className="text-sm font-bold text-content-primary capitalize ml-1">
                            {monthYearTitle}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={onToday}
                        aria-label={t('calendar:today')}
                        className="min-h-[40px] px-3 rounded-[10px] bg-surface-sunken text-content-primary border border-line-subtle text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-line-subtle"
                    >
                        <CalendarBlank size={16} />
                        <span>{t('calendar:today')}</span>
                    </button>
                </div>

                {/* 7 Day Strip Buttons */}
                <div className="grid grid-cols-7 gap-1">
                    {weekDays.map(day => {
                        const matchDay = matchDayMap.get(day.isoDate);
                        const total = matchDay?.total ?? 0;
                        const live = matchDay?.live ?? 0;
                        const isSelected = selectedIso === day.isoDate;

                        return (
                            <button
                                key={day.isoDate}
                                type="button"
                                onClick={() => handleSelectDayStrip(day.isoDate)}
                                aria-label={`${day.isoDate}, ${t('calendar:matchesCount', { count: total })}`}
                                className={`min-h-[56px] py-1.5 px-0.5 rounded-[10px] flex flex-col items-center justify-between transition-colors border ${
                                    isSelected
                                        ? 'bg-brand text-white border-brand font-bold shadow-xs'
                                        : day.isToday
                                        ? 'bg-surface-sunken text-brand dark:text-navy-tint border-brand/40 font-bold'
                                        : 'bg-surface-sunken/50 text-content-secondary border-transparent hover:bg-surface-sunken'
                                }`}
                            >
                                <span className="text-[10px] font-semibold uppercase leading-none">
                                    {weekdayShort[day.dayOfWeek]}
                                </span>
                                <span className="text-sm font-bold leading-tight">
                                    {day.dayNumber}
                                </span>

                                {/* Dot Indicator */}
                                <div className="h-2 flex items-center justify-center">
                                    {total > 0 && (
                                        <span
                                            className={`w-1.5 h-1.5 rounded-full ${
                                                live > 0
                                                    ? 'bg-crimson animate-pulse'
                                                    : isSelected
                                                    ? 'bg-white'
                                                    : 'bg-brand'
                                            }`}
                                        />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Agenda List grouped by day */}
            <div className="space-y-3">
                {weekDays.map(day => {
                    const matchDay = matchDayMap.get(day.isoDate);
                    const totalMatches = matchDay?.total ?? 0;
                    const liveMatches = matchDay?.live ?? 0;
                    const isExpanded = Boolean(expandedDays[day.isoDate]);
                    const dayTitle = format(day.date, 'EEEE, d MMMM', { locale });

                    // Running tournaments on this day
                    const runningTournaments = tournaments.filter(t => {
                        if (!t.startDate || !t.endDate) return false;
                        const s = formatIsoDate(new Date(t.startDate));
                        const e = formatIsoDate(new Date(t.endDate));
                        return day.isoDate >= s && day.isoDate <= e;
                    });

                    return (
                        <div
                            key={day.isoDate}
                            ref={el => (dayRefs.current[day.isoDate] = el)}
                            className="rounded-[14px] bg-surface-card border border-line-subtle shadow-xs overflow-hidden"
                        >
                            {/* Day Accordion Header */}
                            <button
                                type="button"
                                onClick={() => toggleDayExpanded(day.isoDate)}
                                className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between text-left hover:bg-surface-sunken transition-colors"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <span
                                        className={`w-2 h-2 rounded-full shrink-0 ${
                                            day.isToday ? 'bg-brand' : 'bg-transparent'
                                        }`}
                                    />
                                    <h3
                                        className={`text-sm capitalize truncate ${
                                            day.isToday
                                                ? 'font-bold text-brand dark:text-navy-tint'
                                                : 'font-semibold text-content-primary'
                                        }`}
                                    >
                                        {dayTitle}
                                    </h3>
                                    {day.isToday && (
                                        <span className="px-1.5 py-0.5 rounded-full bg-brand/10 text-brand dark:text-navy-tint text-[10px] font-bold">
                                            {t('calendar:today')}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {totalMatches > 0 && (
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                                liveMatches > 0
                                                    ? 'bg-crimson text-white animate-pulse'
                                                    : 'bg-surface-sunken text-content-secondary border border-line-subtle'
                                            }`}
                                        >
                                            {t('calendar:matchesCount', { count: totalMatches })}
                                        </span>
                                    )}
                                    {isExpanded ? (
                                        <CaretUp size={16} className="text-content-tertiary" />
                                    ) : (
                                        <CaretDown size={16} className="text-content-tertiary" />
                                    )}
                                </div>
                            </button>

                            {/* Accordion Content */}
                            {isExpanded && (
                                <div className="p-4 pt-1 border-t border-line-subtle space-y-4 motion-safe:animate-fade-in">
                                    {/* Tournaments on this day */}
                                    {runningTournaments.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="text-[11px] font-semibold text-content-secondary uppercase tracking-wider flex items-center gap-1">
                                                <Trophy size={13} className="text-brand" />
                                                <span>{t('calendar:runningTournaments')}</span>
                                            </h4>
                                            <div className="space-y-1.5">
                                                {runningTournaments.map(tr => (
                                                    <div
                                                        key={tr.id}
                                                        className="p-2.5 rounded-[10px] bg-surface-sunken border border-line-subtle flex items-center justify-between gap-2"
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="w-7 h-7 rounded-md bg-surface-card p-0.5 border border-line-subtle shrink-0 flex items-center justify-center overflow-hidden">
                                                                {tr.logoUrl || tr.organiserBranding?.logoUrl ? (
                                                                    <TournamentLogo
                                                                        tournamentId={tr.id}
                                                                        logoUrl={tr.logoUrl || tr.organiserBranding?.logoUrl}
                                                                        className="w-full h-full object-contain"
                                                                    />
                                                                ) : (
                                                                    <Trophy size={14} className="text-brand" />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h5 className="text-xs font-bold text-content-primary truncate">
                                                                    {tr.name}
                                                                </h5>
                                                                {tr.live && (
                                                                    <span className="text-[10px] font-bold text-accent-text uppercase flex items-center gap-1">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-crimson animate-pulse" />
                                                                        {t('calendar:status.live')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => downloadTournamentIcs(tr)}
                                                                className="min-w-[36px] min-h-[36px] rounded-md inline-flex items-center justify-center text-content-secondary hover:text-content-primary hover:bg-line-subtle border border-line-subtle"
                                                                title={t('calendar:addToCalendar')}
                                                                aria-label={t('calendar:addToCalendar')}
                                                            >
                                                                <CalendarPlus size={16} />
                                                            </button>
                                                            <Link
                                                                to={`/tournaments/${tr.slug || tr.id}`}
                                                                className="min-w-[36px] min-h-[36px] rounded-md inline-flex items-center justify-center bg-brand text-white hover:bg-brand-hover"
                                                                title={t('calendar:openTournament')}
                                                                aria-label={t('calendar:openTournament')}
                                                            >
                                                                <ArrowSquareOut size={16} />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Matches on this day */}
                                    <div className="space-y-2">
                                        <h4 className="text-[11px] font-semibold text-content-secondary uppercase tracking-wider flex items-center gap-1">
                                            <Clock size={13} className="text-brand" />
                                            <span>{t('calendar:dayMatches')}</span>
                                        </h4>
                                        <DayMatchesSection
                                            isoDate={day.isoDate}
                                            isExpanded={isExpanded}
                                            totalMatches={totalMatches}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
