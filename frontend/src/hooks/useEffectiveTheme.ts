import { useState, useEffect } from 'react';
import { useUIStore } from '@/store/ui.store';

export const useEffectiveTheme = (): 'light' | 'dark' => {
    const { theme } = useUIStore();
    const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(
        typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
    );

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
            setSystemTheme(e.matches ? 'dark' : 'light');
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    if (theme === 'system') {
        return systemTheme;
    }

    return theme;
};
