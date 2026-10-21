import { useState, useEffect, useCallback } from 'react';

export type LegalLanguage = 'en' | 'ms';

const STORAGE_KEY = 'athos-lang';

const getInitialLanguage = (): LegalLanguage => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'ms' || stored === 'en') {
            return stored;
        }
    } catch {
        // localStorage unavailable or restricted
    }
    return 'en';
};

export function useLegalLanguage() {
    const [language, setLanguageState] = useState<LegalLanguage>(getInitialLanguage);

    const setLanguage = useCallback((lang: LegalLanguage) => {
        setLanguageState(lang);
        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch {
            // localStorage unavailable
        }
    }, []);

    // Sync across tabs if user changes language in another tab
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY && (e.newValue === 'en' || e.newValue === 'ms')) {
                setLanguageState(e.newValue);
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    return { language, setLanguage };
}
