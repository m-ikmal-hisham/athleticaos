import { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage, STORAGE_KEY } from '@/i18n';

export type LegalLanguage = 'en' | 'ms';

export function useLegalLanguage() {
    const { i18n } = useTranslation();
    const language: LegalLanguage = i18n.language && i18n.language.startsWith('ms') ? 'ms' : 'en';

    const setLanguage = useCallback((lang: LegalLanguage) => {
        void changeLanguage(lang);
    }, []);

    // Sync across tabs if user changes language in another tab
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY && (e.newValue === 'en' || e.newValue === 'ms')) {
                void changeLanguage(e.newValue);
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    return { language, setLanguage };
}
