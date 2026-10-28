import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CaretLeft, CaretRight, ArrowSquareOut, CalendarBlank, Trophy, Clock } from '@phosphor-icons/react';
import { PublicTournamentSummary, PublicMatchDay, PublicMatchFeedItem } from '@/api/public.api';
import { usePublicMatchDays } from '@/hooks/public/usePublicMatchDays';
import { usePublicMatchFeed } from '@/hooks/public/usePublicMatchFeed';
import {
    todayInMalaysia,
    formatIsoDate,
    formatIsoYearMonth,
    CalendarGridDay,
    isSameDay,
    getDateLocale,
} from '@/utils/malaysiaDate';
import { format } from 'date-fns';
import { TournamentBar } from './TournamentBar';
import { DaySidePanel } from './DaySidePanel';
import { computeWeekTournamentLayout } from './calendarLayout';
import { MatchCard } from '@/components/public/match';

interface CalendarStripProps {
    tournaments: PublicTournamentSummary[];
}

export function CalendarStrip({ tournaments }: CalendarStripProps) {
    const { t, i18n } = useTranslation(['home', 'calendar', 'common']);
    const today = useMemo(() => todayInMalaysia(), []);
    const locale = getDateLocale(i18n.language);

    // Compute the 21 days (3 weeks) starting from Monday of the current Malaysia week
    const threeWeekDays: CalendarGridDay[] = useMemo(() => {
        const dayOfWeek = (today.getDay() + 6) % 7;
        const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOfWeek);

        const days: CalendarGridDay[] = [];
        for (let i = 0; i < 21; i++) {
            const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
            days.push({
                date: d,
                isoDate: formatIsoDate(d),
                dayNumber: d.getDate(),
                isCurrentMonth: true,
                isToday: isSameDay(d, today),
                dayOfWeek: i % 7,
            });
        }
        return days;
    }, [today]);

    // Single usePublicMatchDays call for the 21 days
    const rangeStart = threeWeekDays[0]?.isoDate || '';
    const rangeEnd = threeWeekDays[20]?.isoDate || '';
    const { data: matchDays = [] } = usePublicMatchDays({
        from: rangeStart,
        to: rangeEnd,
    });

    const matchDayMap = useMemo(() => {
        const map = new Map<string, PublicMatchDay>();
        matchDays.forEach(md => map.set(md.date, md));
        return map;
    }, [matchDays]);

    // Compute week layout for 3 weeks (max 2 lanes on Home)
    const weekData = useMemo(() => {
        return computeWeekTournamentLayout(threeWeekDays, tournaments, { maxLanes: 2 });
    }, [threeWeekDays, tournaments]);

    // Selected day for side panel (Desktop)
    const [selectedDayForPanel, setSelectedDayForPanel] = useState<CalendarGridDay | null>(null);

    // Desktop keyboard grid navigation
    const [focusedIndex, setFocusedIndex] = useState<number>(() => {
        const todayIdx = threeWeekDays.findIndex(d => d.isToday);
        return todayIdx >= 0 ? todayIdx : 0;
    });
    const gridRef = useRef<HTMLDivElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        let nextIndex = index;
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                if (index > 0) nextIndex = index - 1;
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (index < threeWeekDays.length - 1) nextIndex = index + 1;
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (index >= 7) nextIndex = index - 7;
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (index + 7 < threeWeekDays.length) nextIndex = index + 7;
                break;
            case 'Home':
                e.preventDefault();
                nextIndex = Math.floor(index / 7) * 7;
                break;
            case 'End':
                e.preventDefault();
                nextIndex = Math.floor(index / 7) * 7 + 6;
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                setSelectedDayForPanel(threeWeekDays[index]);
                return;
            default:
                return;
        }

        if (nextIndex !== index && nextIndex >= 0 && nextIndex < threeWeekDays.length) {
            setFocusedIndex(nextIndex);
            const target = gridRef.current?.querySelector<HTMLElement>(`[data-cell-index="${nextIndex}"]`);
            target?.focus();
        }
    };

    // Auto-focus cell when focusedIndex changes internally
    useEffect(() => {
        const target = gridRef.current?.querySelector<HTMLElement>(`[data-cell-index="${focusedIndex}"]`);
        if (document.activeElement?.getAttribute('role') === 'gridcell' && target) {
            target.focus();
        }
    }, [focusedIndex]);

    // ---------------- Phone state ----------------
    // Week index: 0 = this week, 1 = next week, 2 = 2 weeks ahead (strictly 0..2)
    const [phoneWeekIdx, setPhoneWeekIdx] = useState(0);
    const [phoneSelectedIso, setPhoneSelectedIso] = useState<string>(() => formatIsoDate(today));

    // Active 7 days for the selected phone week
    const currentPhoneWeekDays = useMemo(() => {
        const startIdx = phoneWeekIdx * 7;
        return threeWeekDays.slice(startIdx, startIdx + 7);
    }, [threeWeekDays, phoneWeekIdx]);

    const handlePrevPhoneWeek = () => {
        setPhoneWeekIdx(w => Math.max(0, w - 1));
    };

    const handleNextPhoneWeek = () => {
        setPhoneWeekIdx(w => Math.min(2, w + 1));
    };

    // Touch swipe left/right for mobile week strip
    const touchStartX = useRef<number | null>(null);
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const diff = e.changedTouches[0].clientX - touchStartX.current;
        if (diff > 50) {
            handlePrevPhoneWeek();
        } else if (diff < -50) {
            handleNextPhoneWeek();
        }
        touchStartX.current = null;
    };

    // Running tournaments on phoneSelectedIso
    const runningTournamentsOnPhoneDay = useMemo(() => {
        if (!phoneSelectedIso) return [];
        return tournaments.filter(t => {
            if (!t.startDate || !t.endDate) return false;
            const s = t.startDate.slice(0, 10);
            const e = t.endDate.slice(0, 10);
            return phoneSelectedIso >= s && phoneSelectedIso <= e;
        });
    }, [tournaments, phoneSelectedIso]);

    // Matches for phoneSelectedIso
    const [phoneMatchesPage, setPhoneMatchesPage] = useState(0);
    const [phoneAccumulatedMatches, setPhoneAccumulatedMatches] = useState<PublicMatchFeedItem[]>([]);

    useEffect(() => {
        setPhoneMatchesPage(0);
        setPhoneAccumulatedMatches([]);
    }, [phoneSelectedIso]);

    const { data: phoneFeed, isLoading: phoneMatchesLoading } = usePublicMatchFeed(
        {
            view: 'range',
            from: phoneSelectedIso,
            to: phoneSelectedIso,
            page: phoneMatchesPage,
            size: 20,
        },
        { enabled: Boolean(phoneSelectedIso) }
    );

    useEffect(() => {
        if (phoneFeed?.items) {
            setPhoneAccumulatedMatches(prev => {
                if (phoneMatchesPage === 0) return phoneFeed.items;
                const existing = new Set(prev.map(m => m.id));
                const newItems = phoneFeed.items.filter(m => !existing.has(m.id));
                return [...prev, ...newItems];
            });
        }
    }, [phoneFeed, phoneMatchesPage]);

    const weekdayHeaders = [
        t('calendar:mon'),
        t('calendar:tue'),
        t('calendar:wed'),
        t('calendar:thu'),
        t('calendar:fri'),
        t('calendar:sat'),
        t('calendar:sun'),
    ];

    const currentMonthIso = formatIsoYearMonth(today);
    const openCalendarUrl = `/tournaments?view=calendar&month=${currentMonthIso}`;

    return (
        <section className="space-y-4">
            {/* Header: Title + Open Calendar Link */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CalendarBlank className="w-5 h-5 text-brand" />
                    <h2 className="text-xl md:text-2xl font-bold text-content-primary">
                        {t('home:calendarStrip.heading', { defaultValue: 'This month' })}
                    </h2>
                </div>
                <Link
                    to={openCalendarUrl}
                    className="text-sm font-semibold text-brand hover:text-brand-hover hover:underline transition-colors flex items-center gap-1"
                >
                    <span>{t('home:calendarStrip.openCalendar', { defaultValue: 'Open calendar' })}</span>
                    <ArrowSquareOut size={16} />
                </Link>
            </div>

            {/* Desktop (>= 1024px): 3-week Grid */}
            <div className="hidden lg:block">
                <div
                    ref={gridRef}
                    role="grid"
                    aria-label={t('calendar:calendarStripAria')}
                    className="rounded-[14px] overflow-hidden border border-line-subtle bg-line-subtle shadow-xs select-none"
                >
                    {/* Weekday Header Row */}
                    <div role="row" className="grid grid-cols-7 bg-surface-sunken border-b border-line-subtle text-center">
                        {weekdayHeaders.map((name, i) => (
                            <div
                                key={name}
                                role="columnheader"
                                className={`py-2 text-xs font-semibold ${
                                    i >= 5 ? 'text-content-secondary' : 'text-content-primary'
                                }`}
                            >
                                {name}
                            </div>
                        ))}
                    </div>

                    {/* 3 Week Rows */}
                    <div className="space-y-px">
                        {weekData.map((week, weekIdx) => (
                            <div
                                key={`week-${weekIdx}`}
                                role="row"
                                className="relative grid grid-cols-7 gap-px bg-line-subtle min-h-[92px]"
                            >
                                {/* Day Cells */}
                                {week.weekDays.map((day, colIdx) => {
                                    const cellIndex = weekIdx * 7 + colIdx;
                                    const matchDay = matchDayMap.get(day.isoDate);
                                    const totalMatches = matchDay?.total ?? 0;
                                    const liveMatches = matchDay?.live ?? 0;
                                    const overflow = week.dayOverflow[colIdx];
                                    const isFocused = focusedIndex === cellIndex;

                                    return (
                                        <div
                                            key={day.isoDate}
                                            role="gridcell"
                                            data-cell-index={cellIndex}
                                            tabIndex={isFocused ? 0 : -1}
                                            aria-selected={day.isToday}
                                            onClick={() => setSelectedDayForPanel(day)}
                                            onKeyDown={e => handleKeyDown(e, cellIndex)}
                                            className="relative p-1.5 flex flex-col justify-between bg-surface-card transition-colors cursor-pointer outline-none hover:bg-surface-sunken/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                                        >
                                            {/* Cell header: Date number + Match dots */}
                                            <div className="flex items-center justify-between pointer-events-none">
                                                <span
                                                    className={`text-xs font-semibold w-6 h-6 rounded-full inline-flex items-center justify-center ${
                                                        day.isToday ? 'bg-brand text-white font-bold' : 'text-content-primary'
                                                    }`}
                                                >
                                                    {day.dayNumber}
                                                </span>

                                                {totalMatches > 0 && (
                                                    <div
                                                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-surface-sunken border border-line-subtle"
                                                        title={`${t('calendar:matchesCount', { count: totalMatches })}${
                                                            liveMatches > 0 ? `, ${t('calendar:liveCount', { count: liveMatches })}` : ''
                                                        }`}
                                                    >
                                                        <span
                                                            className={`w-2 h-2 rounded-full shrink-0 ${
                                                                liveMatches > 0 ? 'bg-crimson animate-pulse' : 'bg-brand'
                                                            }`}
                                                        />
                                                        <span className="text-[11px] font-bold font-mono text-content-secondary leading-none">
                                                            {totalMatches}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Space reserved for tournament bars (2 lanes * 22px) */}
                                            <div className="h-[46px] pointer-events-none" />

                                            {/* Overflow "+n more" */}
                                            {overflow > 0 && (
                                                <div className="pt-0.5 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            setSelectedDayForPanel(day);
                                                        }}
                                                        className="text-[11px] font-semibold text-brand hover:underline px-1 py-0.5 rounded hover:bg-brand/10 transition-colors"
                                                    >
                                                        {t('calendar:moreTournaments', { count: overflow })}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Tournament Bars Layer (max 2 lanes) */}
                                <div className="absolute inset-x-0 top-7 bottom-0 pointer-events-none">
                                    <div className="relative w-full h-full grid grid-cols-7 gap-px">
                                        {week.segments.map(seg => (
                                            <div
                                                key={`${seg.tournament.id}-${weekIdx}-${seg.startCol}`}
                                                className="relative pointer-events-auto"
                                                style={{
                                                    gridColumn: `${seg.startCol} / span ${seg.span}`,
                                                }}
                                            >
                                                <TournamentBar
                                                    tournament={seg.tournament}
                                                    startCol={1}
                                                    span={seg.span}
                                                    lane={seg.lane}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Phone (< 1024px): 7-day Strip bounded to 3 weeks + Selected day agenda */}
            <div className="lg:hidden space-y-3">
                <div
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    className="p-3 rounded-[14px] bg-surface-card border border-line-subtle shadow-xs space-y-3"
                >
                    {/* Navigation bar with week controls */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={handlePrevPhoneWeek}
                                disabled={phoneWeekIdx === 0}
                                aria-label={t('calendar:previousWeek')}
                                className="w-10 h-10 inline-flex items-center justify-center rounded-[10px] bg-surface-sunken text-content-primary border border-line-subtle disabled:opacity-40"
                            >
                                <CaretLeft size={18} />
                            </button>
                            <button
                                type="button"
                                onClick={handleNextPhoneWeek}
                                disabled={phoneWeekIdx === 2}
                                aria-label={t('calendar:nextWeek')}
                                className="w-10 h-10 inline-flex items-center justify-center rounded-[10px] bg-surface-sunken text-content-primary border border-line-subtle disabled:opacity-40"
                            >
                                <CaretRight size={18} />
                            </button>
                            <span className="text-sm font-bold text-content-primary capitalize ml-1">
                                {format(currentPhoneWeekDays[0]?.date || today, 'MMMM yyyy', { locale })}
                            </span>
                        </div>
                    </div>

                    {/* 7 Days Row */}
                    <div className="grid grid-cols-7 gap-1">
                        {currentPhoneWeekDays.map(day => {
                            const isSelected = day.isoDate === phoneSelectedIso;
                            const matchDay = matchDayMap.get(day.isoDate);
                            const totalMatches = matchDay?.total ?? 0;
                            const liveMatches = matchDay?.live ?? 0;

                            return (
                                <button
                                    key={day.isoDate}
                                    type="button"
                                    onClick={() => setPhoneSelectedIso(day.isoDate)}
                                    className={`py-2 px-1 rounded-[10px] flex flex-col items-center gap-1 transition-colors min-h-[44px] ${
                                        isSelected
                                            ? 'bg-brand text-white'
                                            : day.isToday
                                            ? 'bg-surface-sunken border border-brand/50 text-brand'
                                            : 'bg-surface-sunken hover:bg-line-subtle text-content-primary'
                                    }`}
                                >
                                    <span className="text-[11px] font-bold uppercase leading-none opacity-80">
                                        {format(day.date, 'EEE', { locale })}
                                    </span>
                                    <span className="text-sm font-bold leading-none">
                                        {day.dayNumber}
                                    </span>
                                    {totalMatches > 0 && (
                                        <span
                                            className={`w-1.5 h-1.5 rounded-full ${
                                                isSelected
                                                    ? 'bg-white'
                                                    : liveMatches > 0
                                                    ? 'bg-crimson animate-pulse'
                                                    : 'bg-brand'
                                            }`}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Selected Day Agenda */}
                <div className="p-3.5 rounded-[14px] bg-surface-card border border-line-subtle space-y-4">
                    <div className="text-xs font-semibold text-content-secondary uppercase tracking-wider flex items-center justify-between">
                        <span>
                            {format(new Date(phoneSelectedIso + 'T00:00:00'), 'EEEE, d MMMM', { locale })}
                        </span>
                    </div>

                    {/* Running tournaments on this day */}
                    {runningTournamentsOnPhoneDay.length > 0 && (
                        <div className="space-y-1.5">
                            <span className="text-[11px] font-bold text-content-secondary uppercase tracking-wider flex items-center gap-1">
                                <Trophy size={13} className="text-brand" />
                                {t('calendar:runningTournaments', { defaultValue: 'Tournaments' })}
                            </span>
                            <div className="space-y-1.5">
                                {runningTournamentsOnPhoneDay.map(tr => (
                                    <Link
                                        key={tr.id}
                                        to={`/tournaments/${tr.slug || tr.id}`}
                                        className="p-2.5 rounded-[10px] bg-surface-sunken border border-line-subtle flex items-center justify-between text-content-primary text-xs font-bold hover:bg-line-subtle transition-colors"
                                    >
                                        <span className="truncate pr-2">{tr.name}</span>
                                        {tr.live && (
                                            <span className="text-[11px] font-bold text-crimson uppercase flex items-center gap-1 shrink-0">
                                                <span className="w-1.5 h-1.5 rounded-full bg-crimson animate-pulse" />
                                                {t('common:status.live')}
                                            </span>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Matches on this day */}
                    <div className="space-y-2">
                        <span className="text-[11px] font-bold text-content-secondary uppercase tracking-wider flex items-center gap-1">
                            <Clock size={13} className="text-brand" />
                            {t('calendar:dayMatches', { defaultValue: 'Matches' })}
                            {phoneFeed?.totalItems !== undefined && (
                                <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-surface-sunken">
                                    {phoneFeed.totalItems}
                                </span>
                            )}
                        </span>

                        {phoneMatchesLoading && phoneMatchesPage === 0 ? (
                            <div className="space-y-2">
                                {[1, 2].map(i => (
                                    <div key={i} className="h-14 rounded-[10px] bg-surface-sunken animate-pulse" />
                                ))}
                            </div>
                        ) : phoneAccumulatedMatches.length === 0 ? (
                            <div className="min-h-[120px] flex items-center justify-center p-3 rounded-[10px] bg-surface-sunken">
                                <p className="text-xs text-content-secondary text-center">
                                    {t('calendar:noMatchesDay', { defaultValue: 'No matches scheduled' })}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {phoneAccumulatedMatches.map(m => (
                                    <MatchCard key={m.id} match={m} compact />
                                ))}

                                {phoneFeed?.hasNext && (
                                    <button
                                        type="button"
                                        onClick={() => setPhoneMatchesPage(p => p + 1)}
                                        disabled={phoneMatchesLoading}
                                        className="w-full py-2 rounded-md bg-surface-sunken text-content-secondary hover:text-content-primary text-xs font-semibold border border-line-subtle transition-colors disabled:opacity-50 min-h-[44px]"
                                    >
                                        {phoneMatchesLoading ? '...' : t('calendar:showMore', { defaultValue: 'Show more' })}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Desktop Day Side Panel modal */}
            {selectedDayForPanel && (
                <DaySidePanel
                    isOpen={Boolean(selectedDayForPanel)}
                    onClose={() => setSelectedDayForPanel(null)}
                    date={selectedDayForPanel.date}
                    isoDate={selectedDayForPanel.isoDate}
                    tournaments={tournaments}
                />
            )}
        </section>
    );
}

export default CalendarStrip;
