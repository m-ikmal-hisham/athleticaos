import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Users, UsersRound, Building, Trophy, X, Bell, ChevronDown, BarChart2, Calendar, Award, Activity as ActivityIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/auth.store';
import { ThemeToggle } from '@/components/ThemeToggle';
import { TournamentPill } from '@/components/TournamentPill';
import { ProfilePopup } from '@/components/ProfilePopup';

interface NavItem {
    label: string;
    path: string;
    icon: React.ReactNode;
    iconFilled: React.ReactNode;
    roles?: string[]; // Optional roles for role-based visibility
}

const navItems: NavItem[] = [
    {
        label: 'Dashboard',
        path: '/dashboard',
        icon: <Home className="w-5 h-5" />,
        iconFilled: <Home className="w-5 h-5 fill-current" />
    },
    {
        label: 'Users',
        path: '/dashboard/users',
        icon: <Users className="w-5 h-5" />,
        iconFilled: <Users className="w-5 h-5 fill-current" />,
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN']
    },
    {
        label: 'Players',
        path: '/dashboard/players',
        icon: <Users className="w-5 h-5" />,
        iconFilled: <Users className="w-5 h-5 fill-current" />
    },
    {
        label: 'Teams',
        path: '/dashboard/teams',
        icon: <UsersRound className="w-5 h-5" />,
        iconFilled: <UsersRound className="w-5 h-5 fill-current" />
    },
    {
        label: 'Organisations',
        path: '/dashboard/organisations',
        icon: <Building className="w-5 h-5" />,
        iconFilled: <Building className="w-5 h-5 fill-current" />
    },
    {
        label: 'Competitions',
        path: '/dashboard/competitions',
        icon: <Award className="w-5 h-5" />,
        iconFilled: <Award className="w-5 h-5 fill-current" />
    },
    {
        label: 'Tournaments',
        path: '/dashboard/tournaments',
        icon: <Trophy className="w-5 h-5" />,
        iconFilled: <Trophy className="w-5 h-5 fill-current" />
    },
    {
        label: 'Matches',
        path: '/dashboard/matches',
        icon: <Calendar className="w-5 h-5" />,
        iconFilled: <Calendar className="w-5 h-5 fill-current" />
    },
    {
        label: 'Stats & Leaderboards',
        path: '/dashboard/stats',
        icon: <BarChart2 className="w-5 h-5" />,
        iconFilled: <BarChart2 className="w-5 h-5 fill-current" />
    },
    {
        label: 'Activity & Logs',
        path: '/dashboard/activity',
        icon: <ActivityIcon className="w-5 h-5" />,
        iconFilled: <ActivityIcon className="w-5 h-5 fill-current" />
    },
];

export const AppLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showProfilePopup, setShowProfilePopup] = useState(false);
    const location = useLocation();
    const { user, checkTokenValidity } = useAuthStore();

    // Check token validity on mount
    useEffect(() => {
        checkTokenValidity();
    }, [checkTokenValidity]);

    return (
        <div className="min-h-screen flex">
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Apple TV/Music Style */}
            <aside
                className={clsx(
                    'fixed top-0 left-0 h-screen z-50 transition-all duration-300 w-64',
                    'glass-card border-r border-white/10',
                    'lg:translate-x-0',
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between p-4 border-b border-white/10">
                        <Link to="/dashboard" className="flex items-center gap-3">
                            <img src="/logo.png" alt="Logo" className="h-10 w-10 rounded-lg" />
                            <span className="font-bold text-lg text-foreground">
                                AthleticaOS
                            </span>
                        </Link>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-150"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto p-4">
                        <ul className="space-y-1">
                            {navItems
                                .filter(item => {
                                    // If no roles specified, show to everyone
                                    if (!item.roles || item.roles.length === 0) return true;
                                    // Check if user has any of the required roles
                                    return item.roles.some(role => user?.roles?.includes(role));
                                })
                                .map((item) => {
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <li key={item.path}>
                                            <Link
                                                to={item.path}
                                                onClick={() => setSidebarOpen(false)}
                                                className={clsx(
                                                    'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 relative group',
                                                    isActive
                                                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25 font-medium'
                                                        : 'text-foreground hover:bg-black/5 dark:hover:bg-white/5'
                                                )}
                                            >
                                                {isActive ? item.iconFilled : item.icon}
                                                <span className="text-sm">{item.label}</span>
                                            </Link>
                                        </li>
                                    );
                                })}
                        </ul>
                    </nav>

                    {/* Bottom Section: Theme + Notifications + Profile */}
                    <div className="p-4 border-t border-white/10 space-y-3">
                        {/* Theme Toggle + Notifications */}
                        <div className="flex items-center justify-center gap-2">
                            <button className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 relative transition-all duration-150">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full ring-2 ring-background"></span>
                            </button>
                            <ThemeToggle />
                        </div>

                        {/* Profile Block */}
                        <div className="relative">
                            <button
                                onClick={() => setShowProfilePopup(true)}
                                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-150"
                            >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center shadow-md ring-2 ring-primary-500/20">
                                    <span className="font-bold text-white text-sm">
                                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                                    </span>
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-sm font-semibold text-foreground truncate">
                                        {user?.firstName} {user?.lastName}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {user?.roles?.[0]?.replace('ROLE_', '') || 'User'}
                                    </p>
                                </div>
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col lg:ml-64">
                {/* Topbar - Apple-Style Hamburger (Mobile Only) */}
                <header className="sticky top-0 z-30 glass-card border-b border-white/10 lg:hidden">
                    <div className="flex items-center justify-between px-4 py-3">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-150"
                        >
                            {/* Apple-style hamburger */}
                            <div className="w-5 h-5 flex flex-col justify-center gap-1">
                                <span className="w-full h-0.5 bg-current rounded-full"></span>
                                <span className="w-full h-0.5 bg-current rounded-full"></span>
                                <span className="w-full h-0.5 bg-current rounded-full"></span>
                            </div>
                        </button>
                        <span className="font-bold text-base text-foreground">AthleticaOS</span>
                        <div className="w-9"></div> {/* Spacer for centering */}
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 lg:p-8 overflow-y-auto relative">
                    <div className="max-w-7xl mx-auto w-full pb-24">
                        <Outlet />
                    </div>
                </main>

                {/* Sticky Tournament Pill */}
                <div className="fixed bottom-6 left-0 right-0 lg:left-64 flex justify-center z-20 pointer-events-none px-4">
                    <div className="pointer-events-auto w-full max-w-2xl">
                        <TournamentPill />
                    </div>
                </div>
            </div>

            {/* Profile Popup */}
            <ProfilePopup
                isOpen={showProfilePopup}
                onClose={() => setShowProfilePopup(false)}
            />
        </div>
    );
};
