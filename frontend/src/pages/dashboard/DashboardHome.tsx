import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Users, UsersThree, Buildings, Trophy, Calendar, TrendUp } from '@phosphor-icons/react';
import { GlassCard } from '@/components/GlassCard';
import { useAuthStore } from '@/store/auth.store';
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
            path: '/dashboard/players',
            color: 'blue',
            bgImage: '/assets/dashboard/players_bg.png'
        },
        {
            title: 'Total Teams',
            value: teamsCount.toLocaleString(),
            icon: <UsersThree className="w-6 h-6" />,
            path: '/dashboard/teams',
            color: 'red',
            bgImage: '/assets/dashboard/teams_bg.png'
        },
        {
            title: 'Total Organisations',
            value: orgsCount.toLocaleString(),
            icon: <Buildings className="w-6 h-6" />,
            path: '/dashboard/organisations',
            color: 'blue',
            bgImage: '/assets/dashboard/orgs_bg.png'
        },
        {
            title: 'Total Matches',
            value: matchesCount.toLocaleString(),
            icon: <Trophy className="w-6 h-6" />,
            path: '/dashboard/matches',
            color: 'red',
            bgImage: '/assets/dashboard/matches_bg.png'
        },
        {
            title: 'Active Tournaments',
            value: tournamentsCount.toLocaleString(),
            icon: <TrendUp className="w-6 h-6" />,
            path: '/dashboard/tournaments',
            color: 'blue',
            bgImage: '/assets/dashboard/tournaments.png'
        },
        {
            title: 'Upcoming Matches',
            value: upcomingCount.toLocaleString(),
            icon: <Calendar className="w-6 h-6" />,
            path: '/dashboard/matches',
            color: 'red',
            bgImage: '/assets/dashboard/upcoming_matches.png'
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
        <div className="space-y-8 pt-6 pb-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    Welcome, {user?.firstName}
                </h1>
                <p className="text-muted-foreground text-lg">
                    Here's what's happening today.
                </p>
            </div>

            {/* Stats Grid - Clickable & Glowing */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <GlassCard key={i} className="animate-pulse h-32">
                            <div className="h-full bg-black/5 dark:bg-white/5 rounded"></div>
                        </GlassCard>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {statCards.map((stat, index) => {
                        return (
                            <GlassCard
                                key={index}
                                className={clsx(
                                    "relative overflow-hidden transition-all duration-300 cursor-pointer group hover:-translate-y-1 h-32 flex flex-col justify-center",
                                    // Minimal Glow Effect based on color prop
                                    stat.color === 'blue' && "hover:shadow-[0_0_20px_rgba(0,83,240,0.15)] dark:hover:shadow-[0_0_30px_rgba(0,83,240,0.2)] hover:border-blue-500/30",
                                    stat.color === 'red' && "hover:shadow-[0_0_20px_rgba(208,2,27,0.15)] dark:hover:shadow-[0_0_30px_rgba(208,2,27,0.2)] hover:border-red-500/30"
                                )}
                                onClick={() => navigate(stat.path)}
                            >
                                {/* Background Image with Gradient Overlay */}
                                <div className="absolute inset-0 z-0">
                                    <img
                                        src={stat.bgImage}
                                        alt=""
                                        className="w-full h-full object-cover opacity-60 transition-transform duration-500 group-hover:scale-105"
                                    />
                                    <div className={clsx(
                                        "absolute inset-0 bg-gradient-to-r",
                                        "from-background/90 via-background/60 to-transparent" // Heavy fade on left for text readability
                                    )} />
                                    {/* Additional color tint */}
                                    <div className={clsx(
                                        "absolute inset-0 opacity-20 mix-blend-overlay transition-opacity duration-300 group-hover:opacity-30",
                                        stat.color === 'blue' && "bg-blue-600",
                                        stat.color === 'red' && "bg-red-600"
                                    )} />
                                </div>

                                {/* Subtle Background Gradient (Hover) */}
                                <div className={clsx(
                                    "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-1",
                                    stat.color === 'blue' && "bg-gradient-to-br from-blue-500/10 to-transparent",
                                    stat.color === 'red' && "bg-gradient-to-br from-red-500/10 to-transparent"
                                )} />

                                <div className="flex items-center justify-between relative z-10 px-1 pl-6"> {/* Increased left padding */}
                                    <div>
                                        <p className="text-sm font-semibold text-muted-foreground/90 uppercase tracking-wide">{stat.title}</p>
                                        <p className="text-4xl font-bold text-foreground mt-2 tracking-tight drop-shadow-sm">{stat.value}</p>
                                    </div>
                                    <div className={clsx(
                                        "p-3 rounded-full transition-colors duration-300 backdrop-blur-sm",
                                        stat.color === 'blue' && "bg-blue-500/20 text-blue-100 group-hover:bg-blue-500/30",
                                        stat.color === 'red' && "bg-red-500/20 text-red-100 group-hover:bg-red-500/30"
                                    )}>
                                        {stat.icon}
                                    </div>
                                </div>
                            </GlassCard>
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
