import { Users, UsersRound, Building, Calendar } from 'lucide-react';
import { Card } from '@/components/Card';
import { useAuthStore } from '@/store/auth.store';
import { useNavigate } from 'react-router-dom';

export const DashboardHome = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();

    const stats = [
        {
            title: 'Total Players',
            value: '1,234',
            icon: <Users className="w-6 h-6" />,
            path: '/dashboard/players'
        },
        {
            title: 'Total Teams',
            value: '56',
            icon: <UsersRound className="w-6 h-6" />,
            path: '/dashboard/teams'
        },
        {
            title: 'Total Organisations',
            value: '24',
            icon: <Building className="w-6 h-6" />,
            path: '/dashboard/organisations'
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, index) => (
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

            {/* Upcoming Matches */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Upcoming Matches
                    </h2>
                </div>
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-150">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">Team A vs Team B</p>
                                <p className="text-xs text-muted-foreground mt-1">National Championship • Round {i}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-foreground">Dec {25 + i}</p>
                                <p className="text-xs text-muted-foreground">15:00</p>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

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
