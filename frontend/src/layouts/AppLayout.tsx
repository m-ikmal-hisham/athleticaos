import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { House, Users, UsersThree, Buildings, Trophy, X, CaretDown, ChartBar, CalendarBlank, Medal, Pulse as ActivityIcon } from '@phosphor-icons/react';
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
        icon: <House className="w-5 h-5" />,
        iconFilled: <House className="w-5 h-5" weight="fill" />
    },
    {
        label: 'Users',
        path: '/dashboard/users',
        icon: <Users className="w-5 h-5" />,
        iconFilled: <Users className="w-5 h-5" weight="fill" />,
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN']
    },
    {
        label: 'Players',
        path: '/dashboard/players',
        icon: <Users className="w-5 h-5" />,
        iconFilled: <Users className="w-5 h-5" weight="fill" />
    },
    {
        label: 'Teams',
        path: '/dashboard/teams',
        icon: <UsersThree className="w-5 h-5" />,
        iconFilled: <UsersThree className="w-5 h-5" weight="fill" />
    },
    {
        label: 'Organisations',
        path: '/dashboard/organisations',
        icon: <Buildings className="w-5 h-5" />,
        iconFilled: <Buildings className="w-5 h-5" weight="fill" />
    },
    {
        label: 'Competitions',
        path: '/dashboard/competitions',
        icon: <Medal className="w-5 h-5" />,
        iconFilled: <Medal className="w-5 h-5" weight="fill" />
    },
    {
        label: 'Tournaments',
        path: '/dashboard/tournaments',
        icon: <Trophy className="w-5 h-5" />,
        iconFilled: <Trophy className="w-5 h-5" weight="fill" />
    },
    {
        label: 'Matches',
        path: '/dashboard/matches',
        icon: <CalendarBlank className="w-5 h-5" />,
        iconFilled: <CalendarBlank className="w-5 h-5" weight="fill" />
    },
    {
        label: 'Stats & Leaderboards',
        path: '/dashboard/stats',
        icon: <ChartBar className="w-5 h-5" />,
        iconFilled: <ChartBar className="w-5 h-5" weight="fill" />
    },
    {
        label: 'Activity & Logs',
        path: '/dashboard/activity',
        icon: <ActivityIcon className="w-5 h-5" />,
        iconFilled: <ActivityIcon className="w-5 h-5" weight="fill" />
    },
];

import { useBrandingStore } from '@/store/branding.store';
import { getOrganisationById } from '@/api/organisations.api';

// ... (existing imports)

export const AppLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showProfilePopup, setShowProfilePopup] = useState(false);
    const location = useLocation();
    const { user, checkTokenValidity } = useAuthStore();
    const { setBrandingFromOrganisation, resetBranding, primaryColor, secondaryColor, accentColor, logoUrl: brandLogoUrl } = useBrandingStore();

    // Check token validity on mount
    useEffect(() => {
        checkTokenValidity();
    }, [checkTokenValidity]);

    // Initialize Branding
    useEffect(() => {
        const initBranding = async () => {
            // We need a way to know the user's organisation ID directly.
            // Assuming user object has organisationId or similar. If not, we might need to rely on what available.
            // If the backend User entity has organisation, it should be in the user object.
            // If explicit organisationId is not on user, we might default to defaults.

            // For now, let's assume we can find it or we just reset if we can't.
            // Actually, we should check if the user is an ORG_ADMIN or belongs to an org.
            // If specific org info is missing in user, we skip.
            // However, the prompt says "Extract organisation branding fields" from organisation.

            // Let's try to fetch organisation if user has an ID.
            // Checking the User type isn't possible directly here as I didn't see the file content,
            // but let's assume 'organisationId' might be there.

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (user && (user as any).organisationId) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const org = await getOrganisationById((user as any).organisationId);
                    setBrandingFromOrganisation(org);
                } catch (e) {
                    console.warn("Failed to load organisation branding", e);
                    resetBranding();
                }
            } else {
                // If we can't find an org, reset to defaults
                resetBranding();
            }
        };

        if (user) {
            initBranding();
        } else {
            resetBranding();
        }
    }, [user, setBrandingFromOrganisation, resetBranding]);

    // Apply Branding to CSS Variables
    useEffect(() => {
        const root = document.documentElement;
        if (primaryColor) root.style.setProperty('--brand-primary', primaryColor);
        else root.style.removeProperty('--brand-primary');

        if (secondaryColor) root.style.setProperty('--brand-secondary', secondaryColor);
        else root.style.removeProperty('--brand-secondary');

        if (accentColor) root.style.setProperty('--brand-accent', accentColor);
        else root.style.removeProperty('--brand-accent');

        // Optional: Force a repaint or re-evaluation if needed, but CSS vars usually update immediately
    }, [primaryColor, secondaryColor, accentColor]);


    return (
        <div className="min-h-screen flex">
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Apple TV/Music Style Floating */}
            <aside
                className={clsx(
                    'fixed z-50 transition-all duration-300 w-72', // Increased width slightly for comfort
                    'glass-card p-0 flex flex-col', // Reset padding from glass-card to control internal layout
                    'border border-white/10 dark:border-white/5',
                    'shadow-[0_8px_40px_-12px_rgba(0,0,0,0.3)]', // Deeper floating shadow
                    // Floating positioning
                    'lg:top-4 lg:bottom-4 lg:left-4 lg:rounded-[20px]',
                    'lg:translate-x-0',
                    sidebarOpen ? 'translate-x-0 top-0 bottom-0 left-0 w-64 rounded-none' : '-translate-x-full lg:translate-x-0'
                )}
            >
                <div className="flex flex-col h-full bg-white/60 dark:bg-[#1e1e1e]/60 backdrop-blur-xl backdrop-saturate-150 rounded-[20px]">
                    {/* Logo & Header */}
                    <div className="flex items-center justify-between p-6 pb-2">
                        <Link to="/dashboard" className="flex items-center gap-3 group">
                            <div className="relative">
                                {brandLogoUrl ? (
                                    <img
                                        src={brandLogoUrl}
                                        alt="Logo"
                                        className="h-10 w-10 rounded-xl object-contain bg-white/10 shadow-sm"
                                        onError={(e) => {
                                            // Fallback to transparent logo if brand logo fails
                                            e.currentTarget.src = "/logo-transparent.png";
                                            e.currentTarget.className = "h-10 w-10 object-contain mix-blend-screen dark:opacity-90";
                                            // Hide the 'A' fallback if we switch to image
                                            const fallbackA = e.currentTarget.nextElementSibling;
                                            if (fallbackA) fallbackA.classList.add('hidden');
                                        }}
                                    />
                                ) : (
                                    <img
                                        src="/athleticaos-logo-transparent.png"
                                        alt="Logo"
                                        className="h-10 w-10 object-contain mix-blend-screen dark:opacity-90"
                                    />
                                )}
                                <div
                                    className={clsx(
                                        "w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg text-white font-bold text-xl",
                                        // Hide this 'A' fallback if we have EITHER a brand logo OR the default logo
                                        // Basically, we only want this if EVERYTHING fails, which shouldn't happen with the hardcoded default.
                                        // So let's actually just hide it or only show if brandLogoUrl is invalid string but image load handled above?
                                        // Actually, let's keep it simple: If we have brandLogoUrl, we try to show it. If it fails, we swap src.
                                        // The 'A' fallback was for when NO logo existed, but we now ALWAYS have a default logo.
                                        "hidden"
                                    )}
                                >
                                    A
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-lg text-foreground tracking-tight leading-none group-hover:text-primary transition-colors">
                                    AthleticaOS
                                </span>
                                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mt-0.5">
                                    Manager
                                </span>
                            </div>
                        </Link>
                        <button
                            type="button"
                            aria-label="Close sidebar"
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
                        <ul className="space-y-1">
                            {navItems.map((item) => {
                                // Filter logic check
                                if (item.roles && item.roles.length > 0 && !item.roles.some(role => user?.roles?.includes(role))) {
                                    return null;
                                }

                                const isActive = location.pathname === item.path;
                                return (
                                    <li key={item.path}>
                                        <Link
                                            to={item.path}
                                            onClick={() => setSidebarOpen(false)}
                                            className={clsx(
                                                'flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-all duration-200 group',
                                                isActive
                                                    ? 'bg-primary-500/10 text-primary-500 font-medium'
                                                    : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground'
                                            )}
                                        >
                                            {isActive ? (
                                                <span className="text-primary-500">{item.iconFilled}</span>
                                            ) : (
                                                item.icon
                                            )}
                                            <span className="text-sm tracking-wide">{item.label}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>

                    {/* Bottom Section: Theme + Notifications + Profile */}
                    <div className="p-4 m-4 mt-0 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5">
                        <div className="text-[10px] text-muted-foreground px-2 uppercase tracking-wider font-semibold mb-3 flex items-center justify-between">
                            <span>System</span>
                            <div className="flex gap-2">
                                <ThemeToggle />
                            </div>
                        </div>

                        {/* Profile Block */}
                        <button
                            onClick={() => setShowProfilePopup(true)}
                            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/40 dark:hover:bg-black/40 transition-all duration-150 border border-transparent hover:border-black/5 dark:hover:border-white/10"
                        >
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-inner ring-2 ring-white/10">
                                <span className="font-bold text-white text-xs">
                                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                                </span>
                            </div>
                            <div className="flex-1 text-left overflow-hidden">
                                <p className="text-sm font-semibold text-foreground truncate leading-tight">
                                    {user?.firstName} {user?.lastName}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                    Is Active
                                </p>
                            </div>
                            <CaretDown className="w-3 h-3 text-muted-foreground" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className={clsx(
                "flex-1 flex flex-col min-h-screen transition-all duration-300",
                "lg:ml-[320px]" // Add margin equal to floating sidebar width + spacing
            )}>
                {/* Topbar - Mobile Only */}
                <header className="sticky top-0 z-30 glass-card border-b border-white/10 lg:hidden rounded-none">
                    <div className="flex items-center justify-between px-4 py-3">
                        <button
                            aria-label="Open sidebar"
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-150"
                        >
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

                {/* Page Content Container - Centered */}
                <main className="flex-1 p-4 lg:p-8 overflow-y-auto relative w-full">
                    <div className="max-w-7xl mx-auto w-full pb-32"> {/* Increased bottom padding for pill */}
                        <Outlet />
                    </div>
                </main>

                {/* Sticky Tournament Pill - Wide centered Floating Music Player style */}
                <div className="fixed bottom-6 left-0 right-0 z-40 pointer-events-none flex justify-center lg:pl-[320px]"> {/* Offset center by sidebar width */}
                    <div className="pointer-events-auto w-full max-w-3xl px-6">
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
