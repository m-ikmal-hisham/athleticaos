import { useMemo } from 'react';
import { useCollapsibleGroups } from './useCollapsibleGroups';

// Local calendar date as YYYY-MM-DD, the same shape as matchDate.
const todayKey = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
};

/**
 * Open/closed state for a schedule grouped by date. Only one day starts open: today when the
 * schedule has matches today, otherwise the first date in the order given (the next match day
 * for fixtures, the latest for results). Toggles are remembered until resetKey changes.
 */
export function useCollapsibleDates(dates: string[], resetKey = '') {
    const defaultOpenDate = useMemo(() => {
        const today = todayKey();
        return dates.includes(today) ? today : dates[0];
    }, [dates]);

    return useCollapsibleGroups(dates, defaultOpenDate, resetKey);
}
