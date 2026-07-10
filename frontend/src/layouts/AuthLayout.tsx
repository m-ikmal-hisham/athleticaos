import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { PageLoader } from '@/components/PageLoader';

export const AuthLayout = () => {
    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background is handled by body styles in globals.css */}
            <div className="w-full z-10">
                <Suspense fallback={<PageLoader />}>
                    <Outlet />
                </Suspense>
            </div>
        </div>
    );
};
