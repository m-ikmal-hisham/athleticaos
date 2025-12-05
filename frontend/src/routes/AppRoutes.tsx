import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import PublicLayout from '@/layouts/PublicLayout';
import { Login } from '@/pages/public/Login';
import { Signup } from '@/pages/public/Signup';
import Home from '@/pages/public/Home';
import TournamentsList from '@/pages/public/TournamentsList';
import TournamentDetail from '@/pages/public/TournamentDetail';
import MatchCenter from '@/pages/public/MatchCenter';
import { DashboardHome } from '@/pages/dashboard/DashboardHome';
import Players from '@/pages/dashboard/Players';
import Teams from '@/pages/dashboard/Teams';
import TeamDetail from '@/pages/dashboard/teams/TeamDetail';
import Organisations from '@/pages/dashboard/Organisations';
import Tournaments from '@/pages/dashboard/Tournaments';
import Users from '@/pages/dashboard/Users';
import Profile from '@/pages/dashboard/Profile';
import { Matches } from '@/pages/dashboard/Matches';
import { MatchDetail } from '@/pages/dashboard/MatchDetail';
import Stats from '@/pages/dashboard/Stats';
import { Seasons } from '@/pages/dashboard/competitions/Seasons';
import { SeasonDetail } from '@/pages/dashboard/competitions/SeasonDetail';
import Activity from '@/pages/dashboard/Activity';
import { AuthGuard } from '@/routes/AuthGuard';
import { NotFoundPage } from '@/pages/NotFoundPage';



export const router = createBrowserRouter([
    // Public Routes
    {
        element: <PublicLayout />,
        children: [
            {
                path: '/',
                element: <Home />,
            },
            {
                path: '/tournaments',
                element: <TournamentsList />,
            },
            {
                path: '/tournaments/:id',
                element: <TournamentDetail />,
            },
            {
                path: '/matches/:matchId',
                element: <MatchCenter />,
            },
        ],
    },
    // Auth Routes
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
                    <AuthGuard requiredRoles={['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN']}>
                        <Users />
                    </AuthGuard>
                ),
            },
            {
                path: 'profile',
                element: <Profile />,
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
                path: 'teams/:slug',
                element: <TeamDetail />,
            },
            {
                path: 'competitions',
                element: <Seasons />,
            },
            {
                path: 'competitions/seasons/:id',
                element: <SeasonDetail />,
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
                path: 'matches/:id',
                element: <MatchDetail />,
            },
            {
                path: 'stats',
                element: <Stats />,
            },
            {
                path: 'activity',
                element: <Activity />,
            },
        ],
    },
    {
        path: '*',
        element: <NotFoundPage />,
    },
]);
