import { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PublicTournamentSummary, PublicMatchDay } from '@/api/public.api';
import { CalendarGridDay } from '@/utils/malaysiaDate';
import { TournamentBar } from './TournamentBar';
import { computeWeekTournamentLayout } from './calendarLayout';

interface MonthGridProps {
    days: CalendarGridDay[]; // 35 or 42 cells
    tournaments: PublicTournamentSummary[];
    matchDays: PublicMatchDay[];
    onSelectDay: (day: CalendarGridDay) => void;
    onPrevMonth: () => void;
    onNextMonth: () => void;
}

export function MonthGrid({
    days,
    tournaments,
    matchDays,
    onSelectDay,
    onPrevMonth,
    onNextMonth,
}: MonthGridProps) {
    const { t } = useTranslation(['calendar']);
    const [focusedIndex, setFocusedIndex] = useState<number>(() => {
        const todayIdx = days.findIndex(d => d.isToday);
        return todayIdx >= 0 ? todayIdx : 0;
    });
    const gridRef = useRef<HTMLDivElement>(null);

    // Map match days by ISO date for instant lookup
    const matchDayMap = useMemo(() => {
        const map = new Map<string, PublicMatchDay>();
        matchDays.forEach(md => {
            map.set(md.date, md);
        });
        return map;
    }, [matchDays]);

    // Compute tournament bars and lanes for each week using pure helper
    const weekData = useMemo(() => {
        return computeWeekTournamentLayout(days, tournaments, { maxLanes: 3 });
    }, [days, tournaments]);


    // Handle keyboard navigation for role="grid"
    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        let nextIndex = index;
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                if (index > 0) nextIndex = index - 1;
                else onPrevMonth();
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (index < days.length - 1) nextIndex = index + 1;
                else onNextMonth();
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (index >= 7) nextIndex = index - 7;
                else onPrevMonth();
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (index + 7 < days.length) nextIndex = index + 7;
                else onNextMonth();
                break;
            case 'Home':
                e.preventDefault();
                nextIndex = Math.floor(index / 7) * 7;
                break;
            case 'End':
                e.preventDefault();
                nextIndex = Math.floor(index / 7) * 7 + 6;
                break;
            case 'PageUp':
                e.preventDefault();
                onPrevMonth();
                break;
            case 'PageDown':
                e.preventDefault();
                onNextMonth();
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                onSelectDay(days[index]);
                return;
            default:
                return;
        }

        if (nextIndex !== index && nextIndex >= 0 && nextIndex < days.length) {
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

    const weekdayHeaders = [
        t('calendar:mon'),
        t('calendar:tue'),
        t('calendar:wed'),
        t('calendar:thu'),
        t('calendar:fri'),
        t('calendar:sat'),
        t('calendar:sun'),
    ];

    return (
        <div
            ref={gridRef}
            role="grid"
            aria-label={t('monthGridAria')}
            className="rounded-[14px] overflow-hidden border border-line-subtle bg-line-subtle shadow-xs select-none"
        >
            {/* Weekday Header Row */}
            <div role="row" className="grid grid-cols-7 bg-surface-sunken border-b border-line-subtle text-center">
                {weekdayHeaders.map((name, i) => (
                    <div
                        key={name}
                        role="columnheader"
                        className={`py-2.5 text-xs font-semibold ${
                            i >= 5 ? 'text-content-secondary' : 'text-content-primary'
                        }`}
                    >
                        {name}
                    </div>
                ))}
            </div>

            {/* Week Rows */}
            <div className="space-y-px">
                {weekData.map((week, weekIdx) => (
                    <div
                        key={`week-${weekIdx}`}
                        role="row"
                        className="relative grid grid-cols-7 gap-px bg-line-subtle min-h-[110px]"
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
                                    onClick={() => onSelectDay(day)}
                                    onKeyDown={e => handleKeyDown(e, cellIndex)}
                                    className={`relative p-1.5 flex flex-col justify-between bg-surface-card transition-colors cursor-pointer outline-none ${
                                        day.isCurrentMonth
                                            ? 'text-content-primary'
                                            : 'text-content-tertiary/40 bg-surface-sunken/40'
                                    } hover:bg-surface-sunken/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand`}
                                >
                                    {/* Top cell header: date number & match dots */}
                                    <div className="flex items-center justify-between pointer-events-none">
                                        <span
                                            className={`text-xs font-semibold w-6 h-6 rounded-full inline-flex items-center justify-center ${
                                                day.isToday
                                                    ? 'bg-brand text-white font-bold'
                                                    : ''
                                            }`}
                                        >
                                            {day.dayNumber}
                                        </span>

                                        {/* Match Dots */}
                                        {totalMatches > 0 && (
                                            <div
                                                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-surface-sunken border border-line-subtle"
                                                title={`${t('calendar:matchesCount', { count: totalMatches })}${liveMatches > 0 ? `, ${t('calendar:liveCount', { count: liveMatches })}` : ''}`}
                                                aria-label={`${t('calendar:matchesCount', { count: totalMatches })}${liveMatches > 0 ? `, ${t('calendar:liveCount', { count: liveMatches })}` : ''}`}
                                            >
                                                <span
                                                    className={`w-2 h-2 rounded-full shrink-0 ${
                                                        liveMatches > 0
                                                            ? 'bg-crimson animate-pulse'
                                                            : 'bg-brand'
                                                    }`}
                                                />
                                                <span className="text-[11px] font-bold font-mono text-content-secondary leading-none">
                                                    {totalMatches}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Space for tournament bars */}
                                    <div className="h-[70px] pointer-events-none" />

                                    {/* Overflow "+n more" button */}
                                    {overflow > 0 && (
                                        <div className="pt-0.5 text-right">
                                            <button
                                                type="button"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    onSelectDay(day);
                                                }}
                                                className="text-[11px] font-semibold text-brand hover:underline px-1 py-0.5 rounded hover:bg-brand/10 transition-colors"
                                                aria-label={t('calendar:moreTournaments', { count: overflow })}
                                            >
                                                {t('calendar:moreTournaments', { count: overflow })}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Tournament Bars Layer for this Week */}
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
    );
}
