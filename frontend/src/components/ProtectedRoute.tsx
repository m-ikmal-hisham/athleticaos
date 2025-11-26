import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRoles?: string[];
}

export const ProtectedRoute = ({ children, requiredRoles }: ProtectedRouteProps) => {
    const location = useLocation();
    const { isAuthenticated, hasAnyRole } = useAuthStore();

    if (!isAuthenticated) {
        // Redirect to login page but save the attempted location
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requiredRoles && requiredRoles.length > 0) {
        if (!hasAnyRole(requiredRoles)) {
            // User doesn't have required role, redirect to unauthorized page
            return <Navigate to="/unauthorized" replace />;
        }
    }

    return <>{children}</>;
};
