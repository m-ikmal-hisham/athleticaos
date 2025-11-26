import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

interface AuthGuardProps {
    children: React.ReactNode;
    requiredRoles?: string[];
}

export const AuthGuard = ({ children, requiredRoles }: AuthGuardProps) => {
    const { isAuthenticated, hasAnyRole } = useAuthStore();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requiredRoles && !hasAnyRole(requiredRoles)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <>{children}</>;
};
