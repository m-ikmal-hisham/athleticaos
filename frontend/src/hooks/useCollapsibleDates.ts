import { useCallback, useMemo, useState } from 'react';

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
 * for fixtures, the latest for results). Anything the viewer toggles is remembered per date
 * until resetKey changes (say, a new tab or category), which goes back to the default.
 */
export function useCollapsibleDates(dates: string[], resetKey = '') {
    const [overrides, setOverrides] = useState<Record<string, boolean>>({});
    const [overridesKey, setOverridesKey] = useState(resetKey);
    if (overridesKey !== resetKey) {
        setOverridesKey(resetKey);
        setOverrides({});
    }

    const defaultOpenDate = useMemo(() => {
        const today = todayKey();
        return dates.includes(today) ? today : dates[0];
    }, [dates]);

    const isOpen = useCallback(
        (date: string) => overrides[date] ?? date === defaultOpenDate,
        [overrides, defaultOpenDate]
    );

    const toggle = useCallback(
        (date: string) => setOverrides(prev => ({ ...prev, [date]: !(prev[date] ?? date === defaultOpenDate) })),
        [defaultOpenDate]
    );

    const setAll = useCallback(
        (open: boolean) => setOverrides(Object.fromEntries(dates.map(date => [date, open]))),
        [dates]
    );

    const allOpen = dates.length > 0 && dates.every(isOpen);

    return { isOpen, toggle, setAll, allOpen };
}
