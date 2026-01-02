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
import Contact from '@/pages/public/Contact';
import HowItWorks from '@/pages/public/HowItWorks';
import Sponsors from '@/pages/public/Sponsors';
import { DashboardHome } from '@/pages/dashboard/DashboardHome';
import Players from '@/pages/dashboard/Players';
import Teams from '@/pages/dashboard/Teams';
import TeamDetail from '@/pages/dashboard/teams/TeamDetail';
import Organisations from '@/pages/dashboard/Organisations';
import OrganisationDetail from '@/pages/dashboard/organisations/OrganisationDetail';
import Tournaments from '@/pages/dashboard/Tournaments';
import Users from '@/pages/dashboard/Users';
import { CreateUser } from '@/pages/dashboard/users/CreateUser';
import { EditUser } from '@/pages/dashboard/users/EditUser';
import { CreatePlayer } from '@/pages/dashboard/players/CreatePlayer';
import { EditPlayer } from '@/pages/dashboard/players/EditPlayer';
import { PlayerProfile } from '@/pages/dashboard/players/PlayerProfile';
import Profile from '@/pages/dashboard/Profile';
import { Matches } from '@/pages/dashboard/Matches';
import { MatchDetail } from '@/pages/dashboard/MatchDetail';
import Stats from '@/pages/dashboard/Stats';
import Officials from '@/pages/dashboard/Officials';
import { Seasons } from '@/pages/dashboard/competitions/Seasons';
import { CreateSeason } from '@/pages/dashboard/competitions/CreateSeason';
import { EditSeason } from '@/pages/dashboard/competitions/EditSeason';
import { SeasonDetail } from '@/pages/dashboard/competitions/SeasonDetail';
import Activity from '@/pages/dashboard/Activity';
import TournamentRosters from '@/pages/dashboard/TournamentRosters';
import DashboardTournamentDetail from '@/pages/dashboard/TournamentDetail';
import BrandingSettings from '@/pages/dashboard/organisations/BrandingSettings';
import { AuthGuard } from '@/routes/AuthGuard';
import { CreateTeam } from '@/pages/dashboard/teams/CreateTeam';
import { EditTeam } from '@/pages/dashboard/teams/EditTeam';
import { CreateOrganisation } from '@/pages/dashboard/organisations/CreateOrganisation';
import { EditOrganisation } from '@/pages/dashboard/organisations/EditOrganisation';
import { CreateTournament } from '@/pages/dashboard/tournaments/CreateTournament';
import { EditTournament } from '@/pages/dashboard/tournaments/EditTournament';
import { CreateMatch } from '@/pages/dashboard/matches/CreateMatch';
import { EditMatch } from '@/pages/dashboard/matches/EditMatch';
import { EditProfile } from '@/pages/dashboard/profile/EditProfile';
import { NotFoundPage } from '@/pages/NotFoundPage';
import OperationsConsole from '@/pages/admin/operations/OperationsConsole';

import { FederationDashboard } from '@/pages/admin/federation/FederationDashboard';
import { SanctioningConsole } from '@/pages/admin/federation/SanctioningConsole';
import { CompetitionOversight } from '@/pages/admin/federation/CompetitionOversight';
import { ComplianceReports } from '@/pages/admin/federation/ComplianceReports';
import { DisciplineTrends } from '@/pages/admin/federation/DisciplineTrends';
import { TeamAnalyticsDashboard } from '@/pages/admin/analytics/TeamAnalyticsDashboard';
import { DisciplineImpactAnalysis } from '@/pages/admin/analytics/DisciplineImpactAnalysis';
import { SeasonSummaryReport } from '@/pages/admin/analytics/SeasonSummaryReport';
import { SponsorPackages } from '@/pages/admin/monetization/SponsorPackages';
import { SubscriptionManagement } from '@/pages/admin/monetization/SubscriptionManagement';
import { MediaPortal } from '@/pages/public/MediaPortal';



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
            {
                path: '/contact',
                element: <Contact />,
            },
            {
                path: '/how-it-works',
                element: <HowItWorks />,
            },
            {
                path: '/sponsors',
                element: <Sponsors />,
            },
            {
                path: '/media/matches/:matchId',
                element: <MediaPortal />,
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
                path: 'users/new',
                element: (
                    <AuthGuard requiredRoles={['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN']}>
                        <CreateUser />
                    </AuthGuard>
                ),
            },
            {
                path: 'users/:id/edit',
                element: (
                    <AuthGuard requiredRoles={['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN']}>
                        <EditUser />
                    </AuthGuard>
                ),
            },
            {
                path: 'profile/edit',
                element: <EditProfile />,
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
                path: 'organisations/new',
                element: (
                    <AuthGuard requiredRoles={['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN']}>
                        <CreateOrganisation />
                    </AuthGuard>
                ),
            },
            {
                path: 'organisations/:id/edit',
                element: (
                    <AuthGuard requiredRoles={['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN']}>
                        <EditOrganisation />
                    </AuthGuard>
                ),
            },
            {
                path: 'organisations/:id',
                element: <OrganisationDetail />,
            },
            {
                path: 'organisations/:id/branding',
                element: <BrandingSettings />,
            },
            {
                path: 'players',
                element: <Players />,
            },
            {
                path: 'players/new',
                element: (
                    <AuthGuard requiredRoles={['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN']}>
                        <CreatePlayer />
                    </AuthGuard>
                ),
            },
            {
                path: 'players/:id',
                element: <PlayerProfile />,
            },
            {
                path: 'players/:id/edit',
                element: (
                    <AuthGuard requiredRoles={['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN']}>
                        <EditPlayer />
                    </AuthGuard>
                ),
            },
            {
                path: 'teams',
                element: <Teams />,
            },
            {
                path: 'teams/new',
                element: (
                    <AuthGuard requiredRoles={['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN']}>
                        <CreateTeam />
                    </AuthGuard>
                ),
            },
            {
                path: 'teams/:id/edit',
                element: (
                    <AuthGuard requiredRoles={['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN']}>
                        <EditTeam />
                    </AuthGuard>
                ),
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
                path: 'competitions/seasons/new',
                element: (
                    <AuthGuard requiredRoles={['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN']}>
                        <CreateSeason />
                    </AuthGuard>
                ),
            },
            {
                path: 'competitions/seasons/:id',
                element: <SeasonDetail />,
            },
            {
                path: 'competitions/seasons/:id/edit',
                element: (
                    <AuthGuard requiredRoles={['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN']}>
                        <EditSeason />
                    </AuthGuard>
                ),
            },
            {
                path: 'tournaments',
                element: <Tournaments />,
            },
            {
                path: 'tournaments/new',
                element: (
                    <AuthGuard requiredRoles={['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN']}>
                        <CreateTournament />
                    </AuthGuard>
                ),
            },
            {
                path: 'tournaments/:id/edit',
                element: (
                    <AuthGuard requiredRoles={['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN']}>
                        <EditTournament />
                    </AuthGuard>
                ),
            },
            {
                path: 'matches',
                element: <Matches />,
            },
            {
                path: 'matches/new',
                element: (
                    <AuthGuard requiredRoles={['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN']}>
                        <CreateMatch />
                    </AuthGuard>
                ),
            },
            {
                path: 'matches/:id/edit',
                element: (
                    <AuthGuard requiredRoles={['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN']}>
                        <EditMatch />
                    </AuthGuard>
                ),
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
                path: 'tournaments/:id',
                element: <DashboardTournamentDetail />,
            },
            {
                path: 'tournaments/:tournamentId/rosters',
                element: <TournamentRosters />,
            },
            {
                path: 'activity',
                element: <Activity />,
            },
            {
                path: 'officials',
                element: (
                    <AuthGuard requiredRoles={['ROLE_SUPER_ADMIN', 'ROLE_CLUB_ADMIN', 'ROLE_OFFICIAL']}>
                        <Officials />
                    </AuthGuard>
                ),
            },
            {
                path: 'operations',
                element: (
                    <AuthGuard requiredRoles={['ROLE_SUPER_ADMIN', 'ROLE_CLUB_ADMIN', 'ROLE_OFFICIAL']}>
                        <OperationsConsole />
                    </AuthGuard>
                ),
            },

            {
                path: 'federation/dashboard',
                element: (
                    <AuthGuard requiredRoles={['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN']}>
                        <FederationDashboard />
                    </AuthGuard>
                ),
            },
            {
                path: 'federation/sanctioning',
                element: (
                    <AuthGuard requiredRoles={['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN']}>
                        <SanctioningConsole />
                    </AuthGuard>
                ),
            },
            {
                path: 'federation/oversight',
                element: (
                    <AuthGuard requiredRoles={['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN']}>
                        <CompetitionOversight />
                    </AuthGuard>
                ),
            },
            {
                path: 'federation/compliance',
                element: (
                    <AuthGuard requiredRoles={['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN']}>
                        <ComplianceReports />
                    </AuthGuard>
                ),
            },
            {
                path: 'federation/discipline',
                element: (
                    <AuthGuard requiredRoles={['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN']}>
                        <DisciplineTrends />
                    </AuthGuard>
                ),
            },
            // Analytics
            {
                path: 'analytics/teams',
                element: (
                    <AuthGuard requiredRoles={['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN']}>
                        <TeamAnalyticsDashboard />
                    </AuthGuard>
                ),
            },
            {
                path: 'analytics/impact',
                element: (
                    <AuthGuard requiredRoles={['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN']}>
                        <DisciplineImpactAnalysis />
                    </AuthGuard>
                ),
            },
            {
                path: 'analytics/season',
                element: (
                    <AuthGuard requiredRoles={['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN']}>
                        <SeasonSummaryReport />
                    </AuthGuard>
                ),
            },
            // Monetization
            {
                path: 'monetization/sponsors',
                element: (
                    <AuthGuard requiredRoles={['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN']}>
                        <SponsorPackages />
                    </AuthGuard>
                ),
            },
            {
                path: 'monetization/subscriptions',
                element: (
                    <AuthGuard requiredRoles={['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN']}>
                        <SubscriptionManagement />
                    </AuthGuard>
                ),
            },
        ],
    },
    {
        path: '*',
        element: <NotFoundPage />,
    },
], {
    future: {

        v7_relativeSplatPath: true,
        v7_fetcherPersist: true,
        v7_normalizeFormMethod: true,
        v7_partialHydration: true,
        v7_skipActionErrorRevalidation: true,
    }
});
