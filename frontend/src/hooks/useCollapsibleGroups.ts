import { useCallback, useState } from 'react';

/**
 * Open/closed state for a list of collapsible groups (match days, standings pools). Only
 * `defaultOpenKey` starts open. Anything the viewer toggles is remembered per key until
 * resetKey changes (say, a new tab or category), which goes back to the default.
 */
export function useCollapsibleGroups(keys: string[], defaultOpenKey: string | undefined, resetKey = '') {
    const [overrides, setOverrides] = useState<Record<string, boolean>>({});
    const [overridesKey, setOverridesKey] = useState(resetKey);
    if (overridesKey !== resetKey) {
        setOverridesKey(resetKey);
        setOverrides({});
    }

    const isOpen = useCallback(
        (key: string) => overrides[key] ?? key === defaultOpenKey,
        [overrides, defaultOpenKey]
    );

    const toggle = useCallback(
        (key: string) => setOverrides(prev => ({ ...prev, [key]: !(prev[key] ?? key === defaultOpenKey) })),
        [defaultOpenKey]
    );

    const setAll = useCallback(
        (open: boolean) => setOverrides(Object.fromEntries(keys.map(key => [key, open]))),
        [keys]
    );

    const allOpen = keys.length > 0 && keys.every(isOpen);

    return { isOpen, toggle, setAll, allOpen };
}
