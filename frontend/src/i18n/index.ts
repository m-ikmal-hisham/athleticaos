import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from './locales/en/common.json';
import enHome from './locales/en/home.json';
import enLegal from './locales/en/legal.json';
import enDataRequests from './locales/en/dataRequests.json';
import enAdmin from './locales/en/admin.json';

export type AppLanguage = 'en' | 'ms';

export const STORAGE_KEY = 'athos-lang';

export function getDetectedLanguage(): AppLanguage {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'ms' || stored === 'en') {
            return stored;
        }
    } catch {
        // localStorage unavailable
    }

    if (typeof navigator !== 'undefined') {
        const languages = navigator.languages ?? [navigator.language];
        for (const lang of languages) {
            if (lang && lang.toLowerCase().startsWith('ms')) {
                return 'ms';
            }
        }
    }

    return 'en';
}

let msResourcesLoaded = false;

type Namespaces = Record<'common' | 'home' | 'legal' | 'dataRequests' | 'admin', Record<string, unknown>>;

async function importMsResources(): Promise<Namespaces> {
    const [msCommon, msHome, msLegal, msDataRequests, msAdmin] = await Promise.all([
        import('./locales/ms/common.json'),
        import('./locales/ms/home.json'),
        import('./locales/ms/legal.json'),
        import('./locales/ms/dataRequests.json'),
        import('./locales/ms/admin.json'),
    ]);
    return {
        common: msCommon.default,
        home: msHome.default,
        legal: msLegal.default,
        dataRequests: msDataRequests.default,
        admin: msAdmin.default,
    };
}

/** Adds the BM bundle to an already-initialised i18n (runtime switch to BM). */
export async function loadMsResources(): Promise<void> {
    if (msResourcesLoaded) return;
    const ms = await importMsResources();
    (Object.keys(ms) as (keyof Namespaces)[]).forEach((ns) => {
        i18n.addResourceBundle('ms', ns, ms[ns], true, true);
    });
    msResourcesLoaded = true;
}

export async function changeLanguage(lang: AppLanguage): Promise<void> {
    if (lang === 'ms') {
        await loadMsResources();
    }
    await i18n.changeLanguage(lang);
}

export async function initI18n(): Promise<typeof i18n> {
    const initialLang = getDetectedLanguage();

    // addResourceBundle only works after init, so a BM first visit passes the BM bundle into init
    let msInitial: Namespaces | null = null;
    if (initialLang === 'ms') {
        try {
            msInitial = await importMsResources();
        } catch {
            // BM chunk failed to load: start in English rather than not rendering at all
            msInitial = null;
        }
    }

    await i18n.use(initReactI18next).init({
        lng: msInitial || initialLang === 'en' ? initialLang : 'en',
        fallbackLng: 'en',
        supportedLngs: ['en', 'ms'],
        load: 'languageOnly',
        defaultNS: 'common',
        ns: ['common', 'home', 'legal', 'dataRequests', 'admin'],
        resources: {
            en: {
                common: enCommon,
                home: enHome,
                legal: enLegal,
                dataRequests: enDataRequests,
                admin: enAdmin,
            },
            ...(msInitial ? { ms: msInitial } : {}),
        },
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: false,
        },
    });

    if (msInitial) msResourcesLoaded = true;

    if (typeof document !== 'undefined') {
        document.documentElement.lang = i18n.language === 'ms' ? 'ms' : 'en';
    }

    i18n.on('languageChanged', (lng: string) => {
        const normalized: AppLanguage = lng.startsWith('ms') ? 'ms' : 'en';
        if (typeof document !== 'undefined') {
            document.documentElement.lang = normalized;
        }
        try {
            localStorage.setItem(STORAGE_KEY, normalized);
        } catch {
            // localStorage unavailable
        }
    });

    return i18n;
}

export default i18n;
