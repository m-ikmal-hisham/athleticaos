import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

interface AuthGuardProps {
    children: React.ReactNode;
    requiredRoles?: string[];
}

export const AuthGuard = ({ children, requiredRoles }: AuthGuardProps) => {
    const { isAuthenticated, isInitialized, hasAnyRole } = useAuthStore();
    const location = useLocation();

    // Side-effect moved to main.tsx to ensure reliable initialization


    if (!isInitialized) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-zinc-900 text-white">
                <div className="absolute top-0 left-0 w-full bg-red-600 text-white text-center font-bold p-2 z-50">
                    DEBUG MODE ACTIVE v2
                </div>
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-white"></div>
                    <p className="text-lg font-medium text-white animate-pulse">Initializing Application...</p>
                    <div className="text-xs text-gray-500 mt-4 font-mono">
                        Validating Session... <br />
                        Env: {import.meta.env.MODE} <br />
                        API: {import.meta.env.VITE_API_URL || '/api/v1'}
                    </div>
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
