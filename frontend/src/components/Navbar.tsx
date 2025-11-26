import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, User, LogOut, Bell } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { ThemeToggle } from './ThemeToggle';

interface NavbarProps {
    onMenuClick: () => void;
}

export const Navbar = ({ onMenuClick }: NavbarProps) => {
    const [showUserMenu, setShowUserMenu] = useState(false);
    const { user, logout } = useAuthStore();

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    return (
        <header className="sticky top-0 z-30 w-full bg-transparent">
            <div className="flex items-center justify-between px-6 py-4">
                {/* Left: Menu button (Mobile only) */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-muted"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                </div>

                {/* Right: Notifications + User menu */}
                <div className="flex items-center gap-4">
                    <ThemeToggle />

                    {/* Notifications */}
                    <button className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-muted relative">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-primary-500 rounded-full ring-2 ring-background"></span>
                    </button>

                    {/* User menu */}
                    <div className="relative">
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md ring-2 ring-white/20">
                                <span className="font-bold text-white text-sm">
                                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                                </span>
                            </div>
                            <div className="hidden md:block text-left">
                                <p className="text-sm font-medium text-foreground">
                                    {user?.firstName} {user?.lastName}
                                </p>
                                <p className="text-xs text-muted">{user?.roles[0]?.replace('ROLE_', '')}</p>
                            </div>
                        </button>

                        {/* Dropdown */}
                        {showUserMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowUserMenu(false)}
                                />
                                <div className="absolute right-0 mt-2 w-56 glass-card z-20 animate-fade-in p-1">
                                    <div className="p-3 border-b border-glass-border mb-1">
                                        <p className="text-sm font-medium text-foreground">
                                            {user?.firstName} {user?.lastName}
                                        </p>
                                        <p className="text-xs text-muted truncate">{user?.email}</p>
                                    </div>
                                    <Link
                                        to="/profile"
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-muted hover:text-foreground"
                                        onClick={() => setShowUserMenu(false)}
                                    >
                                        <User className="w-4 h-4" />
                                        <span className="text-sm">Profile</span>
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-500"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span className="text-sm">Logout</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};
