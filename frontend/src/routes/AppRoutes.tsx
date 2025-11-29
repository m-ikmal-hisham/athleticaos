import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Login } from '@/pages/public/Login';
import { Signup } from '@/pages/public/Signup';
import { DashboardHome } from '@/pages/dashboard/DashboardHome';
import Players from '@/pages/dashboard/Players';
import Teams from '@/pages/dashboard/Teams';
import Organisations from '@/pages/dashboard/Organisations';
import Tournaments from '@/pages/dashboard/Tournaments';
import { Matches } from '@/pages/dashboard/Matches';
import Stats from '@/pages/dashboard/Stats';
import { AuthGuard } from '@/routes/AuthGuard';
import { NotFoundPage } from '@/pages/NotFoundPage';



export const router = createBrowserRouter([
    {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
    },
    {
        element: <AuthLayout />,
        children: [
            {
                path: '/login',
                element: <Login />,
            },
            {
                path: '/signup',
                element: <Signup />,
            },
        ],
    },
    {
        path: '/unauthorized',
        element: <div>Unauthorized Placeholder</div>,
    },
    {
        path: '/dashboard',
        element: (
            <AuthGuard>
                <AppLayout />
            </AuthGuard>
        ),
        children: [
            {
                index: true,
                element: <DashboardHome />,
            },
            {
                path: 'users',
                element: (
                    <AuthGuard requiredRoles={['ROLE_SUPER_ADMIN', 'ROLE_UNION_ADMIN']}>
                        <div>Users List Placeholder</div>
                    </AuthGuard>
                ),
            },
            {
                path: 'organisations',
                element: <Organisations />,
            },
            {
                path: 'players',
                element: <Players />,
            },
            {
                path: 'teams',
                element: <Teams />,
            },
            {
                path: 'tournaments',
                element: <Tournaments />,
            },
            {
                path: 'matches',
                element: <Matches />,
            },
            {
                path: 'stats',
                element: <Stats />,
            },
        ],
    },
    {
        path: '*',
        element: <NotFoundPage />,
    },
]);
