import { useEffect, useState } from 'react';
import { Users, UsersRound, Building, Trophy, Calendar, TrendingUp } from 'lucide-react';
import { Card } from '@/components/Card';
import { useAuthStore } from '@/store/auth.store';
import { useNavigate } from 'react-router-dom';
import { fetchDashboardStats } from '@/api/dashboard.api';

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
                    {statCards.map((stat, index) => (
                        <Card
                            key={index}
                            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                            onClick={() => navigate(stat.path)}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                                    <p className="text-3xl font-bold text-foreground mt-2">{stat.value}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-primary/10 text-primary">
                                    {stat.icon}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Recent Activity */}
            <Card>
                <h2 className="text-xl font-bold text-foreground mb-4">Recent Activity</h2>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-150">
                            <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                            <div className="flex-1">
                                <p className="text-sm text-foreground">New player registered</p>
                                <p className="text-xs text-muted-foreground mt-1">2 hours ago</p>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
};
