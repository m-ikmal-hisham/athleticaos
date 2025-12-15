import { useEffect, useState } from 'react';
import { Users, UsersRound, Building, Trophy, Calendar, TrendingUp } from 'lucide-react';
import { Card } from '@/components/Card';
import { useAuthStore } from '@/store/auth.store';
import { useNavigate } from 'react-router-dom';
import { fetchDashboardStats } from '@/api/dashboard.api';
import { RecentActivityWidget } from '@/components/RecentActivityWidget';

// Custom hook for counter animation
const useCountUp = (end: number, duration: number = 2000) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - percentage, 4);
            setCount(Math.floor(end * easeOutQuart));

            if (percentage < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [end, duration]);

    return count;
};

interface DashboardStats {
    totalPlayers: number;
    totalTeams: number;
    totalMatches: number;
    totalOrganisations: number;
    activeTournaments: number;
    upcomingMatches: number;
}

export const DashboardHome = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const response = await fetchDashboardStats();
                setStats(response.data);
            } catch (error) {
                console.error('Failed to load dashboard stats:', error);
                // Fallback to default values
                setStats({
                    totalPlayers: 0,
                    totalTeams: 0,
                    totalMatches: 0,
                    totalOrganisations: 0,
                    activeTournaments: 0,
                    upcomingMatches: 0
                });
            } finally {
                setLoading(false);
            }
        };

        loadStats();
    }, []);

    const playersCount = useCountUp(stats?.totalPlayers || 0);
    const teamsCount = useCountUp(stats?.totalTeams || 0);
    const orgsCount = useCountUp(stats?.totalOrganisations || 0);
    const matchesCount = useCountUp(stats?.totalMatches || 0);
    const tournamentsCount = useCountUp(stats?.activeTournaments || 0);
    const upcomingCount = useCountUp(stats?.upcomingMatches || 0);

    const statCards = [
        {
            title: 'Total Players',
            value: playersCount.toLocaleString(),
            icon: <Users className="w-6 h-6" />,
            path: '/dashboard/players'
        },
        {
            title: 'Total Teams',
            value: teamsCount.toLocaleString(),
            icon: <UsersRound className="w-6 h-6" />,
            path: '/dashboard/teams'
        },
        {
            title: 'Total Organisations',
            value: orgsCount.toLocaleString(),
            icon: <Building className="w-6 h-6" />,
            path: '/dashboard/organisations'
        },
        {
            title: 'Total Matches',
            value: matchesCount.toLocaleString(),
            icon: <Trophy className="w-6 h-6" />,
            path: '/dashboard/matches'
        },
        {
            title: 'Active Tournaments',
            value: tournamentsCount.toLocaleString(),
            icon: <TrendingUp className="w-6 h-6" />,
            path: '/dashboard/tournaments'
        },
        {
            title: 'Upcoming Matches',
            value: upcomingCount.toLocaleString(),
            icon: <Calendar className="w-6 h-6" />,
            path: '/dashboard/matches'
        },
    ];

    // Determine scope for Recent Activity
    const isSuperAdmin = user?.roles?.includes('ROLE_SUPER_ADMIN');
    const isOrgAdmin = user?.roles?.includes('ROLE_ORG_ADMIN') || user?.roles?.includes('ROLE_CLUB_ADMIN');

    let activityScope: 'global' | 'org' | 'user' = 'user';
    let activityEntityId = user?.id;

    if (isSuperAdmin) {
        activityScope = 'global';
        activityEntityId = undefined;
    } else if (isOrgAdmin && user?.organisationId) {
        activityScope = 'org';
        activityEntityId = user.organisationId;
    }

    return (
        <div className="space-y-6" style={{ paddingTop: '2.5rem', paddingBottom: '3rem' }}>
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-foreground">
                    Welcome, {user?.firstName}! 👋
                </h1>
                <p className="text-muted-foreground mt-1">
                    Here's what's happening with your rugby management system today.
                </p>
            </div>

            {/* Stats Grid - Clickable */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <div className="h-24 bg-black/5 dark:bg-white/5 rounded"></div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {statCards.map((stat, index) => {
                        // Alternate gradient directions for visual interest
                        // More prominent gradients in dark mode using secondary color
                        const gradientClass = index % 2 === 0
                            ? 'bg-gradient-to-br from-primary-500/5 via-transparent to-[#D32F2F]/5 dark:from-primary-500/10 dark:to-[#D32F2F]/15 dark:border-[#D32F2F]/20'
                            : 'bg-gradient-to-bl from-[#D32F2F]/5 via-transparent to-primary-500/5 dark:from-[#D32F2F]/15 dark:to-primary-500/10 dark:border-[#D32F2F]/20';

                        return (
                            <Card
                                key={index}
                                className={`cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 hover:border-[#D32F2F]/40 dark:hover:border-[#D32F2F]/60 ${gradientClass}`}
                                onClick={() => navigate(stat.path)}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">{stat.title}</p>
                                        <p className="text-3xl font-bold text-foreground mt-2">{stat.value}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-primary/10 dark:bg-[#D32F2F]/20 text-primary dark:text-[#D32F2F] dark:border dark:border-[#D32F2F]/30">
                                        {stat.icon}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Recent Activity */}
            <div>
                <RecentActivityWidget
                    scope={activityScope}
                    entityId={activityEntityId}
                    limit={10}
                />
            </div>
        </div>
    );
};
