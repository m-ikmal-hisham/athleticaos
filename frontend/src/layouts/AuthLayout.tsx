import { Suspense } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageLoader } from '@/components/PageLoader';
import { EnvironmentRibbon } from '@/components/EnvironmentRibbon';
import { BrandBackground } from '@/components/admin/AdminBrandBackground';
import { LanguageSwitch } from '@/components/common/LanguageSwitch';

export const AuthLayout = () => {
    const { t } = useTranslation('auth');

    return (
        <div className="min-h-[100dvh] w-full flex flex-col relative pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] pb-[env(safe-area-inset-bottom,0px)]">
            <BrandBackground />
            <EnvironmentRibbon />
            <div className="absolute top-[max(0.75rem,env(safe-area-inset-top,0px))] right-4 z-20">
                <LanguageSwitch />
            </div>
            <div className="flex-1 w-full flex flex-col items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top,0px))] relative overflow-hidden">
                {/* Spacer to balance vertical centering */}
                <div className="w-full" />
                <div className="w-full z-10 flex-1 flex flex-col justify-center">
                    <Suspense fallback={<PageLoader />}>
                        <Outlet />
                    </Suspense>
                </div>
                {/* Small centered footer line */}
                <footer className="w-full py-2 text-center z-10">
                    <div className="inline-flex items-center justify-center gap-2 text-xs text-black/60 dark:text-white/60">
                        <Link
                            to="/privacy"
                            className="inline-flex items-center min-h-[44px] px-2 hover:text-navy dark:hover:text-navy-tint transition-colors"
                        >
                            {t('layout.privacy')}
                        </Link>
                        <span aria-hidden="true" className="select-none">·</span>
                        <Link
                            to="/terms"
                            className="inline-flex items-center min-h-[44px] px-2 hover:text-navy dark:hover:text-navy-tint transition-colors"
                        >
                            {t('layout.terms')}
                        </Link>
                    </div>
                </footer>
            </div>
        </div>
    );
};
