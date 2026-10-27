import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PublicTournamentSummary } from '@/api/public.api';
import { usePublicMatchDays } from '@/hooks/public/usePublicMatchDays';
import {
    todayInMalaysia,
    formatIsoYearMonth,
    parseIsoYearMonth,
    getCalendarMonthGrid,
    getWeekDays,
    addMonthsToDate,
    addWeeksToDate,
    CalendarGridDay,
} from '@/utils/malaysiaDate';
import { CalendarHeader } from './CalendarHeader';
import { CalendarFilters, CalendarFilterState } from './CalendarFilters';
import { MonthGrid } from './MonthGrid';
import { PhoneWeekAgenda } from './PhoneWeekAgenda';
import { DaySidePanel } from './DaySidePanel';

interface TournamentCalendarProps {
    tournaments: PublicTournamentSummary[];
}

export default function TournamentCalendar({ tournaments }: TournamentCalendarProps) {
    const [searchParams, setSearchParams] = useSearchParams();

    // 1. Current Month derived from URL query (?month=YYYY-MM)
    const monthQuery = searchParams.get('month');
    const currentMonth = useMemo(() => {
        return parseIsoYearMonth(monthQuery);
    }, [monthQuery]);

    // 2. Active filters from URL query
    const filters: CalendarFilterState = useMemo(() => {
        const rawStatus = searchParams.get('status');
        const status = rawStatus === 'live' || rawStatus === 'upcoming' || rawStatus === 'completed' ? rawStatus : null;
        const level = searchParams.get('level');
        const organiser = searchParams.get('organiser');
        const competitionType = searchParams.get('type');
        return {
            status,
            level: level || null,
            organiser: organiser || null,
            competitionType: competitionType || null,
        };
    }, [searchParams]);

    // 3. Anchor Date for Phone week strip
    const [anchorWeekDate, setAnchorWeekDate] = useState<Date>(() => todayInMalaysia());
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [selectedDayForPanel, setSelectedDayForPanel] = useState<CalendarGridDay | null>(null);

    // Sync month changes into URL query
    const setMonthInUrl = useCallback((date: Date) => {
        const nextMonthStr = formatIsoYearMonth(date);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('view', 'calendar');
            next.set('month', nextMonthStr);
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    // Sync filter changes into URL query
    const handleFiltersChange = useCallback((nextFilters: CalendarFilterState) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('view', 'calendar');

            if (nextFilters.status) next.set('status', nextFilters.status);
            else next.delete('status');

            if (nextFilters.level) next.set('level', nextFilters.level);
            else next.delete('level');

            if (nextFilters.organiser) next.set('organiser', nextFilters.organiser);
            else next.delete('organiser');

            if (nextFilters.competitionType) next.set('type', nextFilters.competitionType);
            else next.delete('type');

            return next;
        }, { replace: true });
    }, [setSearchParams]);

    // Initial check: if month is not in URL, set default month
    useEffect(() => {
        if (!searchParams.get('month')) {
            setMonthInUrl(todayInMalaysia());
        }
    }, [searchParams, setMonthInUrl]);

    // Compute Desktop Month Grid Days (42 cells)
    const monthDays = useMemo(() => {
        return getCalendarMonthGrid(currentMonth.getFullYear(), currentMonth.getMonth());
    }, [currentMonth]);

    // Compute Phone Week Days (7 cells)
    const weekDays = useMemo(() => {
        return getWeekDays(anchorWeekDate);
    }, [anchorWeekDate]);

    // Fetch match counts for the full month visible range (max 42 days)
    const gridStart = monthDays[0]?.isoDate || '';
    const gridEnd = monthDays[monthDays.length - 1]?.isoDate || '';
    const { data: monthMatchDays = [] } = usePublicMatchDays({
        from: gridStart,
        to: gridEnd,
    });

    // Also fetch match counts for phone week strip if anchorWeekDate extends outside the current month grid
    const weekStart = weekDays[0]?.isoDate || '';
    const weekEnd = weekDays[6]?.isoDate || '';
    const isWeekInsideMonthGrid = weekStart >= gridStart && weekEnd <= gridEnd;
    const { data: weekMatchDays = [] } = usePublicMatchDays({
        from: weekStart,
        to: weekEnd,
    });

    const activeMatchDays = isWeekInsideMonthGrid ? monthMatchDays : weekMatchDays;

    // Filter tournaments based on active filters
    const filteredTournaments = useMemo(() => {
        return tournaments.filter(t => {
            // Status filter
            if (filters.status) {
                if (filters.status === 'live' && !t.live) return false;
                if (filters.status === 'upcoming' && (t.live || t.completed)) return false;
                if (filters.status === 'completed' && !t.completed) return false;
            }
            // Level filter
            if (filters.level && t.level !== filters.level) {
                return false;
            }
            // Organiser filter
            if (filters.organiser && t.organiserName !== filters.organiser) {
                return false;
            }
            // Competition type filter
            if (filters.competitionType && t.competitionType !== filters.competitionType) {
                return false;
            }
            return true;
        });
    }, [tournaments, filters]);

    // Month navigation
    const handlePrevMonth = () => {
        const prev = addMonthsToDate(currentMonth, -1);
        setMonthInUrl(prev);
    };

    const handleNextMonth = () => {
        const next = addMonthsToDate(currentMonth, 1);
        setMonthInUrl(next);
    };

    const handleToday = () => {
        const today = todayInMalaysia();
        setMonthInUrl(today);
        setAnchorWeekDate(today);
    };

    // Week navigation (for phone)
    const handlePrevWeek = () => {
        setAnchorWeekDate(prev => addWeeksToDate(prev, -1));
    };

    const handleNextWeek = () => {
        setAnchorWeekDate(prev => addWeeksToDate(prev, 1));
    };

    return (
        <div className="space-y-4">
            {/* Calendar Controls Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Month header on desktop only; phones use the week strip's own month header */}
                <div className="hidden lg:block">
                    <CalendarHeader
                        currentDate={currentMonth}
                        onPrev={handlePrevMonth}
                        onNext={handleNextMonth}
                        onToday={handleToday}
                        isMonthView
                    />
                </div>

                <CalendarFilters
                    tournaments={tournaments}
                    filters={filters}
                    onChange={handleFiltersChange}
                    isMobileOpen={isMobileFilterOpen}
                    onMobileClose={() => setIsMobileFilterOpen(false)}
                    onMobileOpen={() => setIsMobileFilterOpen(true)}
                />
            </div>

            {/* Desktop Month Grid (>= 1024px) */}
            <div className="hidden lg:block">
                <MonthGrid
                    days={monthDays}
                    tournaments={filteredTournaments}
                    matchDays={monthMatchDays}
                    onSelectDay={setSelectedDayForPanel}
                    onPrevMonth={handlePrevMonth}
                    onNextMonth={handleNextMonth}
                />
            </div>

            {/* Phone Week Strip + Agenda (< 1024px) */}
            <div className="lg:hidden">
                <PhoneWeekAgenda
                    weekDays={weekDays}
                    tournaments={filteredTournaments}
                    matchDays={activeMatchDays}
                    onPrevWeek={handlePrevWeek}
                    onNextWeek={handleNextWeek}
                    onToday={handleToday}
                    onSelectDayModal={setSelectedDayForPanel}
                />
            </div>

            {/* Day Side Panel (slide-over on desktop, bottom sheet on phone) */}
            {selectedDayForPanel && (
                <DaySidePanel
                    isOpen={Boolean(selectedDayForPanel)}
                    onClose={() => setSelectedDayForPanel(null)}
                    date={selectedDayForPanel.date}
                    isoDate={selectedDayForPanel.isoDate}
                    tournaments={tournaments}
                />
            )}
        </div>
    );
}
