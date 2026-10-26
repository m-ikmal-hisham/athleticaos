import { enGB, ms } from 'date-fns/locale';
import type { Locale } from 'date-fns';

export interface CalendarGridDay {
    date: Date;
    isoDate: string; // YYYY-MM-DD
    dayNumber: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    dayOfWeek: number; // 0 = Mon, 6 = Sun
}

/**
 * Returns today's date in Malaysia timezone (Asia/Kuala_Lumpur)
 * as a local Date normalized to midnight (00:00:00).
 */
export function todayInMalaysia(): Date {
    const now = new Date();
    try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kuala_Lumpur',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
        const parts = formatter.format(now).split('-');
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        return new Date(year, month, day);
    } catch {
        // Fallback if Intl timeZone is not supported
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
}

/**
 * Parse an API date string 'YYYY-MM-DD' (or ISO string) into a local calendar Date
 * at 00:00:00 without any UTC shifting.
 */
export function parseCalendarDate(dateStr: string | Date | undefined | null): Date | null {
    if (!dateStr) return null;
    if (dateStr instanceof Date) {
        return new Date(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate());
    }
    const match = String(dateStr).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    return new Date(year, month, day);
}

/**
 * Formats a Date as 'YYYY-MM-DD'.
 */
export function formatIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Formats a Date as 'YYYY-MM'.
 */
export function formatIsoYearMonth(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Parses 'YYYY-MM' into a Date at the first of that month.
 */
export function parseIsoYearMonth(monthStr: string | null | undefined): Date {
    if (monthStr) {
        const match = monthStr.match(/^(\d{4})-(\d{2})$/);
        if (match) {
            const year = parseInt(match[1], 10);
            const month = parseInt(match[2], 10) - 1;
            return new Date(year, month, 1);
        }
    }
    const today = todayInMalaysia();
    return new Date(today.getFullYear(), today.getMonth(), 1);
}

/**
 * Checks if two dates represent the same calendar day.
 */
export function isSameDay(a: Date | null | undefined, b: Date | null | undefined): boolean {
    if (!a || !b) return false;
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

/**
 * Checks whether a tournament (given start and end 'YYYY-MM-DD') spans the target day (inclusive).
 */
export function tournamentSpansDay(startDateStr: string, endDateStr: string, day: Date): boolean {
    const start = parseCalendarDate(startDateStr);
    const end = parseCalendarDate(endDateStr);
    if (!start || !end) return false;
    const target = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    return target >= start.getTime() && target <= end.getTime();
}

/**
 * Checks whether two date ranges [startA, endA] and [startB, endB] overlap.
 */
export function dateRangesOverlap(
    startA: Date,
    endA: Date,
    startB: Date,
    endB: Date
): boolean {
    return startA.getTime() <= endB.getTime() && endA.getTime() >= startB.getTime();
}

/**
 * Returns date-fns locale for given language code.
 */
export function getDateLocale(lang: string): Locale {
    return lang.startsWith('ms') ? ms : enGB;
}

/**
 * Builds a month grid starting on Monday, up to 6 rows (42 cells max).
 */
export function getCalendarMonthGrid(year: number, monthIndex: number): CalendarGridDay[] {
    const today = todayInMalaysia();
    const firstOfMonth = new Date(year, monthIndex, 1);
    // JS getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
    // Convert to Monday=0, Sunday=6
    const firstDayOfWeek = (firstOfMonth.getDay() + 6) % 7;

    // Grid start is Monday of the first week
    const gridStartDate = new Date(year, monthIndex, 1 - firstDayOfWeek);

    const days: CalendarGridDay[] = [];
    // 6 rows * 7 days = 42 cells (standard month view)
    for (let i = 0; i < 42; i++) {
        const d = new Date(gridStartDate.getFullYear(), gridStartDate.getMonth(), gridStartDate.getDate() + i);
        days.push({
            date: d,
            isoDate: formatIsoDate(d),
            dayNumber: d.getDate(),
            isCurrentMonth: d.getMonth() === monthIndex,
            isToday: isSameDay(d, today),
            dayOfWeek: (d.getDay() + 6) % 7,
        });
    }

    return days;
}

/**
 * Returns the 7 days (Monday to Sunday) for the week containing anchorDate.
 */
export function getWeekDays(anchorDate: Date): CalendarGridDay[] {
    const today = todayInMalaysia();
    const dayOfWeek = (anchorDate.getDay() + 6) % 7;
    const monday = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate() - dayOfWeek);

    const days: CalendarGridDay[] = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
        days.push({
            date: d,
            isoDate: formatIsoDate(d),
            dayNumber: d.getDate(),
            isCurrentMonth: true,
            isToday: isSameDay(d, today),
            dayOfWeek: i,
        });
    }
    return days;
}

/**
 * Move month by delta (+1 or -1).
 */
export function addMonthsToDate(date: Date, delta: number): Date {
    return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

/**
 * Move week by delta (+1 or -1 weeks).
 */
export function addWeeksToDate(date: Date, delta: number): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta * 7);
}
