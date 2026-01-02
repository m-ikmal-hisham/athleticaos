import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { House, Users, UsersThree, Buildings, Trophy, X, CaretDown, ChartBar, CalendarBlank, Medal, Pulse as ActivityIcon, CaretLeft, CaretRight, Wrench, Globe, Gavel, Eye, ShieldWarning, ChartLine, CurrencyDollar } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/auth.store';
import { ThemeToggle } from '@/components/ThemeToggle';
import { TournamentPill } from '@/components/TournamentPill';
import { ProfilePopup } from '@/components/ProfilePopup';
import { useEffectiveTheme } from '@/hooks/useEffectiveTheme';

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
        label: 'Operations',
        path: '/dashboard/operations',
        icon: <Wrench className="w-5 h-5" />,
        iconFilled: <Wrench className="w-5 h-5" weight="fill" />,
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_CLUB_ADMIN', 'ROLE_OFFICIAL']
    },
    {
        label: 'Officials',
        path: '/dashboard/officials',
        icon: <Users className="w-5 h-5" />,
        iconFilled: <Users className="w-5 h-5" weight="fill" />,
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_CLUB_ADMIN']
    },
    {
        label: 'Federation',
        path: '/dashboard/federation/dashboard',
        icon: <Globe className="w-5 h-5" />,
        iconFilled: <Globe className="w-5 h-5" weight="fill" />,
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN']
    },
    {
        label: 'Sanctioning',
        path: '/dashboard/federation/sanctioning',
        icon: <Gavel className="w-5 h-5" />,
        iconFilled: <Gavel className="w-5 h-5" weight="fill" />,
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN']
    },
    {
        label: 'Oversight',
        path: '/dashboard/federation/oversight',
        icon: <Eye className="w-5 h-5" />,
        iconFilled: <Eye className="w-5 h-5" weight="fill" />,
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN']
    },
    {
        label: 'Discipline',
        path: '/dashboard/federation/discipline',
        icon: <ShieldWarning className="w-5 h-5" />,
        iconFilled: <ShieldWarning className="w-5 h-5" weight="fill" />,
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN']
    },
    {
        label: 'Analytics',
        path: '/dashboard/analytics/teams',
        icon: <ChartLine className="w-5 h-5" />,
        iconFilled: <ChartLine className="w-5 h-5" weight="fill" />,
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN']
    },
    {
        label: 'Monetization',
        path: '/dashboard/monetization/subscriptions',
        icon: <CurrencyDollar className="w-5 h-5" />,
        iconFilled: <CurrencyDollar className="w-5 h-5" weight="fill" />,
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN']
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
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showProfilePopup, setShowProfilePopup] = useState(false);
    const location = useLocation();
    const { user, checkTokenValidity } = useAuthStore();
    const { setBrandingFromOrganisation, resetBranding, primaryColor, secondaryColor, accentColor, logoUrl: brandLogoUrl } = useBrandingStore();
    const effectiveTheme = useEffectiveTheme();
    const logoSrc = effectiveTheme === 'dark' ? '/athleticaos-logo-hq-secondary.png' : '/athleticaos-logo-hq-first.png';

    // Check token validity on mount
    useEffect(() => {
        checkTokenValidity();
    }, [checkTokenValidity]);

    // Initialize Branding
    useEffect(() => {
        const initBranding = async () => {
            // Check if user is SUPER_ADMIN. If so, force default branding (skip fetching org).
            if (user?.roles?.includes('ROLE_SUPER_ADMIN')) {
                resetBranding();
                return;
            }

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
                    'fixed z-50 transition-all duration-300',
                    isCollapsed ? 'w-20' : 'w-72', // Width transition
                    'p-0 flex flex-col',
                    'border border-white/10 dark:border-white/5',
                    'shadow-[0_8px_40px_-12px_rgba(0,0,0,0.3)]',
                    'lg:top-4 lg:bottom-4 lg:left-4 lg:rounded-[20px]',
                    'lg:translate-x-0',
                    sidebarOpen ? 'translate-x-0 top-0 bottom-0 left-0 w-64 rounded-none' : '-translate-x-full lg:translate-x-0'
                )}
            >
                <div className="relative flex flex-col h-full bg-white/10 dark:bg-black/10 backdrop-blur-[2px] backdrop-saturate-[180%] rounded-[20px] overflow-hidden">

                    {/* Toggle Button (Desktop Only) */}


                    {/* Logo & Header */}
                    <div className={clsx("flex items-center p-6 pb-2 transition-all duration-300", isCollapsed ? "justify-center px-0" : "justify-between")}>
                        <Link to="/dashboard" className={clsx("flex items-center group", isCollapsed ? "gap-0" : "gap-3")}>
                            <div className="relative shrink-0">
                                {brandLogoUrl ? (
                                    <img
                                        src={brandLogoUrl}
                                        alt="Logo"
                                        className={clsx("rounded-xl object-contain bg-white/10 shadow-sm transition-all duration-300", isCollapsed ? "w-8 h-8" : "w-10 h-10")}
                                        onError={(e) => {
                                            e.currentTarget.src = logoSrc;
                                            e.currentTarget.className = clsx("object-contain transition-all duration-300", isCollapsed ? "w-8 h-8" : "w-10 h-10");
                                            const fallbackA = e.currentTarget.nextElementSibling;
                                            if (fallbackA) fallbackA.classList.add('hidden');
                                        }}
                                    />
                                ) : (
                                    <img
                                        src={logoSrc}
                                        alt="Logo"
                                        className={clsx("object-contain transition-all duration-300", isCollapsed ? "w-8 h-8" : "w-10 h-10")}
                                    />
                                )}
                            </div>
                            <div className={clsx("flex flex-col overflow-hidden transition-all duration-300", isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
                                <span className="font-bold text-lg text-foreground tracking-tight leading-none group-hover:text-primary transition-colors whitespace-nowrap">
                                    AthleticaOS
                                </span>
                                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mt-0.5 whitespace-nowrap">
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

                    {/* Toggle Button */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={clsx(
                            "hidden lg:flex w-6 h-6 bg-white dark:bg-slate-800 rounded-full shadow-md items-center justify-center text-xs border border-slate-200 dark:border-slate-700 z-50 text-slate-500 hover:text-blue-600 transition-all duration-300 mb-2",
                            isCollapsed
                                ? "relative mx-auto" // In flow when collapsed
                                : "absolute top-8 right-6" // Floating when expanded
                        )}
                    >
                        {isCollapsed ? <CaretRight weight="bold" /> : <CaretLeft weight="bold" />}
                    </button>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar">
                        <ul className="space-y-1">
                            {navItems.map((item) => {
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
                                                'flex items-center gap-3 rounded-lg transition-all duration-200 group relative',
                                                isCollapsed ? 'justify-center py-3 px-2' : 'px-4 py-3 mx-2',
                                                isActive
                                                    ? 'bg-gradient-to-r from-blue-600 to-[#D32F2F] dark:from-blue-600 dark:to-blue-500 text-white shadow-lg shadow-blue-500/20 dark:shadow-blue-500/20'
                                                    : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground'
                                            )}
                                        >
                                            <span className={clsx("shrink-0", isActive ? "text-white" : "")}>
                                                {isActive ? item.iconFilled : item.icon}
                                            </span>

                                            {!isCollapsed && (
                                                <span className="text-sm tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 delay-75">
                                                    {item.label}
                                                </span>
                                            )}

                                            {/* Tooltip for collapsed state */}
                                            {isCollapsed && (
                                                <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                                    {item.label}
                                                </div>
                                            )}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>

                    {/* Bottom Section: Theme + Notifications + Profile */}
                    <div className={clsx("m-4 mt-0 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5 transition-all duration-300", isCollapsed ? "p-2" : "p-4")}>
                        {!isCollapsed && (
                            <div className="text-[10px] text-muted-foreground px-2 uppercase tracking-wider font-semibold mb-3 flex items-center justify-between">
                                <span>System</span>
                                <div className="flex gap-2">
                                    <ThemeToggle />
                                </div>
                            </div>
                        )}

                        {isCollapsed && (
                            <div className="flex justify-center mb-2">
                                <ThemeToggle orientation="vertical" />
                            </div>
                        )}

                        {/* Profile Block */}
                        <button
                            onClick={() => setShowProfilePopup(true)}
                            className={clsx(
                                "w-full flex items-center rounded-xl hover:bg-white/40 dark:hover:bg-black/40 transition-all duration-150 border border-transparent hover:border-black/5 dark:hover:border-white/10",
                                isCollapsed ? "justify-center p-1" : "gap-3 p-2"
                            )}
                        >
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-inner ring-2 ring-white/10 shrink-0">
                                <span className="font-bold text-white text-xs">
                                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                                </span>
                            </div>
                            {!isCollapsed && (
                                <>
                                    <div className="flex-1 text-left overflow-hidden">
                                        <p className="text-sm font-semibold text-foreground truncate leading-tight">
                                            {user?.firstName} {user?.lastName}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground truncate">
                                            Is Active
                                        </p>
                                    </div>
                                    <CaretDown className="w-3 h-3 text-muted-foreground" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className={clsx(
                "flex-1 flex flex-col min-h-screen transition-all duration-300",
                isCollapsed ? "lg:ml-[100px]" : "lg:ml-[320px]" // Adjusted margin for collapsed state
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
                <div className={clsx(
                    "fixed bottom-6 left-0 right-0 z-40 pointer-events-none flex justify-center transition-all duration-300",
                    isCollapsed ? "lg:pl-[100px]" : "lg:pl-[320px]",
                    location.pathname.startsWith('/dashboard/matches/') ? "opacity-0 invisible" : "opacity-100 visible"
                )}>
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
