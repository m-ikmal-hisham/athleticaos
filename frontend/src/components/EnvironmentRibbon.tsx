import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * Environment strip shown above every shell so testers always know where they are.
 * - staging: crimson "TEST SITE" strip
 * - development (VITE_ENV or Vite dev server): neutral "LOCAL" strip
 * - production, or an unknown / missing VITE_ENV: renders nothing (no DOM)
 *
 * In normal flow (not fixed), so it never covers content; sticky top bars start below it
 * and stick to top-0 once it has scrolled away.
 */
export function EnvironmentRibbon() {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const env = import.meta.env.VITE_ENV;

    // Use fixed English on admin routes only (dashboard); auth routes follow current language
    const isFixedEnglishRoute = location.pathname.startsWith('/dashboard');

    const resolveT = isFixedEnglishRoute ? i18n.getFixedT('en', 'common') : t;

    if (env === 'staging') {
        return (
            <div role="note" className="relative z-10 w-full bg-crimson text-white text-xs font-medium text-center px-4 pb-1 pt-[calc(4px+env(safe-area-inset-top,0px))] select-none">
                {resolveT('ribbon.staging')}
            </div>
        );
    }

    if (env === 'development' || import.meta.env.DEV) {
        return (
            <div role="note" className="relative z-10 w-full bg-black/72 dark:bg-white/28 text-white text-xs font-medium text-center px-4 pb-1 pt-[calc(4px+env(safe-area-inset-top,0px))] select-none">
                {resolveT('ribbon.local')}
            </div>
        );
    }

    return null;
}
