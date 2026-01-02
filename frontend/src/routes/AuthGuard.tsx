import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

interface AuthGuardProps {
    children: React.ReactNode;
    requiredRoles?: string[];
}

export const AuthGuard = ({ children, requiredRoles }: AuthGuardProps) => {
    const { isAuthenticated, isInitialized, hasAnyRole, checkTokenValidity } = useAuthStore();
    const location = useLocation();

    useEffect(() => {
        if (!isInitialized) {
            checkTokenValidity();
        }
    }, [isInitialized, checkTokenValidity]);

    if (!isInitialized) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-black text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
                    <p className="text-sm text-muted-foreground">Initializing session...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requiredRoles && !hasAnyRole(requiredRoles)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <>{children}</>;
};
