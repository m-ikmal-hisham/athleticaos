import { Suspense } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { PageLoader } from '@/components/PageLoader';

export const AuthLayout = () => {
    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-between p-4 relative overflow-hidden">
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
                        Privacy
                    </Link>
                    <span aria-hidden="true" className="select-none">·</span>
                    <Link
                        to="/terms"
                        className="inline-flex items-center min-h-[44px] px-2 hover:text-navy dark:hover:text-navy-tint transition-colors"
                    >
                        Terms
                    </Link>
                </div>
            </footer>
        </div>
    );
};
