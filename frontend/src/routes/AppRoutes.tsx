import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';

// Layouts & Guards — always needed, keep eager
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import PublicLayout from '@/layouts/PublicLayout';
import { AuthGuard } from '@/routes/AuthGuard';

// Helper for named exports: lazy(() => import(...).then(m => ({ default: m.X })))
const lazyNamed = <T extends Record<string, any>, K extends keyof T>(
    factory: () => Promise<T>,
    name: K
) => lazy(() => factory().then(m => ({ default: m[name] as React.ComponentType<any> })));

// ─── Public Pages ───────────────────────────────────────────────────
const Home = lazy(() => import('@/pages/public/Home'));
const TournamentsList = lazy(() => import('@/pages/public/TournamentsList'));
const TournamentDetail = lazy(() => import('@/pages/public/TournamentDetail'));
const TeamsList = lazy(() => import('@/pages/public/TeamsList'));
const PlayersList = lazy(() => import('@/pages/public/PlayersList'));
const MatchCenter = lazy(() => import('@/pages/public/MatchCenter'));
const Contact = lazy(() => import('@/pages/public/Contact'));
const HowItWorks = lazy(() => import('@/pages/public/HowItWorks'));
const Sponsors = lazy(() => import('@/pages/public/Sponsors'));
const Login = lazyNamed(() => import('@/pages/public/Login'), 'Login');
// Signup removed — registration is closed and route is disabled
const PublicTeamProfile = lazyNamed(() => import('@/pages/public/PublicTeamProfile'), 'PublicTeamProfile');
const PublicPlayerProfile = lazyNamed(() => import('@/pages/public/PublicPlayerProfile'), 'PublicPlayerProfile');
const MediaPortal = lazyNamed(() => import('@/pages/public/MediaPortal'), 'MediaPortal');

// ─── Dashboard Pages ────────────────────────────────────────────────
const DashboardHome = lazyNamed(() => import('@/pages/dashboard/DashboardHome'), 'DashboardHome');
const Players = lazy(() => import('@/pages/dashboard/Players'));
const Teams = lazy(() => import('@/pages/dashboard/Teams'));
const Organisations = lazy(() => import('@/pages/dashboard/Organisations'));
const Tournaments = lazy(() => import('@/pages/dashboard/Tournaments'));
const Users = lazy(() => import('@/pages/dashboard/Users'));
const Profile = lazy(() => import('@/pages/dashboard/Profile'));
const Matches = lazyNamed(() => import('@/pages/dashboard/Matches'), 'Matches');
const MatchDetail = lazyNamed(() => import('@/pages/dashboard/MatchDetail'), 'MatchDetail');
const Stats = lazy(() => import('@/pages/dashboard/Stats'));
const Officials = lazy(() => import('@/pages/dashboard/Officials'));
const Activity = lazy(() => import('@/pages/dashboard/Activity'));
const TournamentRosters = lazy(() => import('@/pages/dashboard/TournamentRosters'));
const DashboardTournamentDetail = lazy(() => import('@/pages/dashboard/TournamentDetail'));
const PeopleDirectory = lazy(() => import('@/pages/dashboard/PeopleDirectory'));

// ─── Dashboard Sub-pages ────────────────────────────────────────────
const CreateUser = lazyNamed(() => import('@/pages/dashboard/users/CreateUser'), 'CreateUser');
const EditUser = lazyNamed(() => import('@/pages/dashboard/users/EditUser'), 'EditUser');
const CreatePlayer = lazyNamed(() => import('@/pages/dashboard/players/CreatePlayer'), 'CreatePlayer');
const EditPlayer = lazyNamed(() => import('@/pages/dashboard/players/EditPlayer'), 'EditPlayer');
const PlayerProfile = lazyNamed(() => import('@/pages/dashboard/players/PlayerProfile'), 'PlayerProfile');
const TeamDetail = lazy(() => import('@/pages/dashboard/teams/TeamDetail'));
const CreateTeam = lazyNamed(() => import('@/pages/dashboard/teams/CreateTeam'), 'CreateTeam');
const EditTeam = lazyNamed(() => import('@/pages/dashboard/teams/EditTeam'), 'EditTeam');
const OrganisationDetail = lazy(() => import('@/pages/dashboard/organisations/OrganisationDetail'));
const CreateOrganisation = lazyNamed(() => import('@/pages/dashboard/organisations/CreateOrganisation'), 'CreateOrganisation');
const EditOrganisation = lazyNamed(() => import('@/pages/dashboard/organisations/EditOrganisation'), 'EditOrganisation');
const BrandingSettings = lazy(() => import('@/pages/dashboard/organisations/BrandingSettings'));

// ─── Competitions ───────────────────────────────────────────────────
const Seasons = lazyNamed(() => import('@/pages/dashboard/competitions/Seasons'), 'Seasons');
const CreateSeason = lazyNamed(() => import('@/pages/dashboard/competitions/CreateSeason'), 'CreateSeason');
const EditSeason = lazyNamed(() => import('@/pages/dashboard/competitions/EditSeason'), 'EditSeason');
const SeasonDetail = lazyNamed(() => import('@/pages/dashboard/competitions/SeasonDetail'), 'SeasonDetail');
const CreateTournament = lazyNamed(() => import('@/pages/dashboard/tournaments/CreateTournament'), 'CreateTournament');
const EditTournament = lazyNamed(() => import('@/pages/dashboard/tournaments/EditTournament'), 'EditTournament');
const CreateMatch = lazyNamed(() => import('@/pages/dashboard/matches/CreateMatch'), 'CreateMatch');
const EditMatch = lazyNamed(() => import('@/pages/dashboard/matches/EditMatch'), 'EditMatch');
const EditProfile = lazyNamed(() => import('@/pages/dashboard/profile/EditProfile'), 'EditProfile');

// ─── Admin / Federation ─────────────────────────────────────────────
const OperationsConsole = lazy(() => import('@/pages/admin/operations/OperationsConsole'));
const FederationDashboard = lazyNamed(() => import('@/pages/admin/federation/FederationDashboard'), 'FederationDashboard');
const SanctioningConsole = lazyNamed(() => import('@/pages/admin/federation/SanctioningConsole'), 'SanctioningConsole');
const CompetitionOversight = lazyNamed(() => import('@/pages/admin/federation/CompetitionOversight'), 'CompetitionOversight');
const ComplianceReports = lazyNamed(() => import('@/pages/admin/federation/ComplianceReports'), 'ComplianceReports');
const DisciplineTrends = lazyNamed(() => import('@/pages/admin/federation/DisciplineTrends'), 'DisciplineTrends');
const TeamAnalyticsDashboard = lazyNamed(() => import('@/pages/admin/analytics/TeamAnalyticsDashboard'), 'TeamAnalyticsDashboard');
const DisciplineImpactAnalysis = lazyNamed(() => import('@/pages/admin/analytics/DisciplineImpactAnalysis'), 'DisciplineImpactAnalysis');
const SeasonSummaryReport = lazyNamed(() => import('@/pages/admin/analytics/SeasonSummaryReport'), 'SeasonSummaryReport');
const SponsorPackages = lazyNamed(() => import('@/pages/admin/monetization/SponsorPackages'), 'SponsorPackages');
const SubscriptionManagement = lazyNamed(() => import('@/pages/admin/monetization/SubscriptionManagement'), 'SubscriptionManagement');

// ─── Misc ───────────────────────────────────────────────────────────
const NotFoundPage = lazyNamed(() => import('@/pages/NotFoundPage'), 'NotFoundPage');



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
            {
                path: '/teams',
                element: <TeamsList />,
            },
            {
                path: '/teams/:id',
                element: <PublicTeamProfile />,
            },
            {
                path: '/players',
                element: <PlayersList />,
            },
            {
                path: '/players/:id',
                element: <PublicPlayerProfile />,
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
            // /signup route removed — registration closed
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
                path: 'people',
                element: (
                    <AuthGuard requiredRoles={['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN']}>
                        <PeopleDirectory />
                    </AuthGuard>
                ),
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

        // @ts-ignore
        v7_startTransition: true,
        v7_relativeSplatPath: true,
        v7_fetcherPersist: true,
        v7_normalizeFormMethod: true,
        v7_partialHydration: true,
        v7_skipActionErrorRevalidation: true,
    }
});
