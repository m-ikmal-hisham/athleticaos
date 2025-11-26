import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Users, UsersRound, Building, Trophy, Menu, X, Bell, LogOut, User, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/auth.store';
import { ThemeToggle } from '@/components/ThemeToggle';

interface NavItem {
    label: string;
    path: string;
    icon: React.ReactNode;
}

const navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: <Home className="w-5 h-5" /> },
    { label: 'Players', path: '/dashboard/players', icon: <Users className="w-5 h-5" /> },
    { label: 'Teams', path: '/dashboard/teams', icon: <UsersRound className="w-5 h-5" /> },
    { label: 'Organisations', path: '/dashboard/organisations', icon: <Building className="w-5 h-5" /> },
    { label: 'Tournaments', path: '/dashboard/tournaments', icon: <Trophy className="w-5 h-5" /> },
];

export const AppLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const location = useLocation();
    const { user, logout } = useAuthStore();

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    return (
        <div className="min-h-screen flex">
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Apple Music Style */}
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
                            className="lg:hidden p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto p-4">
                        <ul className="space-y-1">
                            {navItems.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <li key={item.path}>
                                        <Link
                                            to={item.path}
                                            onClick={() => setSidebarOpen(false)}
                                            className={clsx(
                                                'flex items-center gap-3 px-3 py-2.5 rounded-full transition-all duration-150 relative group',
                                                isActive
                                                    ? 'text-primary font-medium bg-primary/10'
                                                    : 'text-foreground hover:bg-black/3 dark:hover:bg-white/3'
                                            )}
                                        >
                                            <span className={isActive ? 'text-primary' : ''}>{item.icon}</span>
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
                            <button className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 relative">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
                            </button>
                            <ThemeToggle />
                        </div>

                        {/* Profile Tile */}
                        <div className="relative">
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className="w-full flex items-center gap-3 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                            >
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-md">
                                    <span className="font-bold text-white text-sm">
                                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                                    </span>
                                </div>
                                <div className="flex-1 text-left hidden lg:block">
                                    <p className="text-sm font-medium text-foreground truncate">
                                        {user?.firstName}
                                    </p>
                                </div>
                                <ChevronDown className={clsx(
                                    'w-4 h-4 text-muted-foreground transition-transform hidden lg:block',
                                    showProfileMenu && 'rotate-180'
                                )} />
                            </button>

                            {/* Profile Dropdown */}
                            {showProfileMenu && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowProfileMenu(false)}
                                    />
                                    <div className="absolute bottom-full left-0 right-0 mb-2 glass-card z-20 p-1">
                                        <Link
                                            to="/profile"
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-foreground"
                                            onClick={() => setShowProfileMenu(false)}
                                        >
                                            <User className="w-4 h-4" />
                                            <span className="text-sm">Profile</span>
                                        </Link>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            <span className="text-sm">Sign out</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col lg:ml-64">
                {/* Topbar - Apple Music Style Hamburger */}
                <header className="sticky top-0 z-30 glass-card border-b border-white/10 lg:hidden">
                    <div className="flex items-center justify-between px-6 py-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <span className="font-bold text-lg text-foreground">AthleticaOS</span>
                        <div className="w-10"></div> {/* Spacer for centering */}
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
                    <div className="max-w-7xl mx-auto w-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};
