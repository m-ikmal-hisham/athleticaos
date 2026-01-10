import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Layout,
    Users,
    Buildings,
    UserCircle,
    UsersThree,
    Trophy,
    Calendar,
    X,
    Medal,
    ChartBar,
    CheckCircle,
    Gavel,
    TrendUp,
    Info,
    ChartLineUp,
    CurrencyDollar,
    Rocket
} from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/auth.store';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

interface NavItem {
    label: string;
    path: string;
    icon: React.ReactNode;
    roles?: string[];
    children?: NavItem[];
}

const navItems: NavItem[] = [
    {
        label: 'Dashboard',
        path: '/dashboard',
        icon: <Layout className="w-5 h-5" />,
    },
    {
        label: 'Users',
        path: '/dashboard/users',
        icon: <Users className="w-5 h-5" />,
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN'],
    },
    {
        label: 'Organisations',
        path: '/dashboard/organisations',
        icon: <Buildings className="w-5 h-5" />,
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN'],
    },
    {
        label: 'Federation',
        path: '/dashboard/federation/dashboard',
        icon: <Buildings className="w-5 h-5" />,
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN'],
    },
    {
        label: 'Sanctioning',
        path: '/dashboard/federation/sanctioning',
        icon: <Trophy className="w-5 h-5" />,
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN'],
    },
    {
        label: 'Oversight',
        path: '/dashboard/federation/oversight',
        icon: <ChartBar className="w-5 h-5" />,
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN'],
    },
    {
        label: 'Compliance',
        path: '/dashboard/federation/compliance',
        icon: <CheckCircle className="w-5 h-5" />,
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN'],
    },
    {
        label: 'Discipline',
        path: '/dashboard/federation/discipline',
        icon: <Gavel className="w-5 h-5" />,
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN'],
    },
    {
        label: 'Monetization',
        path: '/dashboard/monetization',
        icon: <CurrencyDollar className="w-5 h-5" />,
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN'],
        children: [
            {
                label: 'Sponsor Packages',
                path: '/dashboard/monetization/sponsors',
                icon: <Medal className="w-5 h-5" />,
            },
            {
                label: 'Subscriptions',
                path: '/dashboard/monetization/subscriptions',
                icon: <Rocket className="w-5 h-5" />,
            }
        ]
    },
    {
        label: 'Analytics',
        path: '/dashboard/analytics',
        icon: <ChartLineUp className="w-5 h-5" />,
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN'],
        children: [
            {
                label: 'Team Trends',
                path: '/dashboard/analytics/teams',
                icon: <TrendUp className="w-5 h-5" />,
            },
            {
                label: 'Impact Analysis',
                path: '/dashboard/analytics/impact',
                icon: <Info className="w-5 h-5" />,
            },
            {
                label: 'Season Summary',
                path: '/dashboard/analytics/season',
                icon: <Trophy className="w-5 h-5" />,
            }
        ]
    },
    {
        label: 'Teams',
        path: '/dashboard/teams',
        icon: <UsersThree className="w-5 h-5" />,
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN', 'ROLE_TEAM_MANAGER', 'ROLE_COACH', 'ROLE_PLAYER'],
    },
    {
        label: 'Players',
        path: '/dashboard/players',
        icon: <UserCircle className="w-5 h-5" />,
    },
    {
        label: 'Matches',
        path: '/dashboard/matches',
        icon: <Calendar className="w-5 h-5" />,
    },
    {
        label: 'Tournaments',
        path: '/dashboard/tournaments',
        icon: <Trophy className="w-5 h-5" />,
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN', 'ROLE_TEAM_MANAGER', 'ROLE_COACH', 'ROLE_PLAYER'],
    },
    {
        label: 'Competitions',
        path: '/dashboard/competitions',
        icon: <Medal className="w-5 h-5" />,
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN', 'ROLE_TEAM_MANAGER', 'ROLE_COACH', 'ROLE_PLAYER'],
    },
];

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
    const location = useLocation();
    const { user, hasAnyRole } = useAuthStore();

    useEffect(() => {
        if (user) {
            console.log('Sidebar: Current user roles:', user.roles);
        }
    }, [user]);

    const filteredNavItems = navItems.filter(item => {
        if (!item.roles || item.roles.length === 0) return true;
        return hasAnyRole(item.roles);
    });

    const renderNavItem = (item: NavItem, depth = 0) => {
        const isActive = location.pathname === item.path || (item.children && location.pathname.startsWith(item.path));
        const hasChildren = item.children && item.children.length > 0;

        return (
            <div key={item.path}>
                <Link
                    to={hasChildren ? '#' : item.path}
                    onClick={hasChildren ? undefined : onClose}
                    className={clsx(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                        isActive && !hasChildren
                            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25 font-medium dark:bg-blue-600 dark:shadow-blue-900/40 dark:shadow-lg'
                            : 'text-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground',
                        depth > 0 && 'ml-4'
                    )}
                >
                    {item.icon}
                    <span className="text-sm">{item.label}</span>
                </Link>
                {hasChildren && (
                    <div className="mt-1 space-y-1">
                        {item.children!.map(child => renderNavItem(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <aside
            className={clsx(
                'fixed top-0 left-0 z-40 h-screen transition-transform duration-300',
                'w-64 bg-glass-bg backdrop-blur-2xl border-r border-glass-border',
                'lg:translate-x-0',
                isOpen ? 'translate-x-0' : '-translate-x-full'
            )}
        >
            <div className="flex flex-col h-full">
                {/* Logo */}
                <div className="flex items-center justify-between p-6">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg text-white font-bold text-lg">
                            A
                        </div>
                        <span className="font-display font-semibold text-xl text-foreground tracking-tight">
                            AthleticaOS
                        </span>
                    </Link>
                    <button
                        onClick={onClose}
                        className="lg:hidden p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-muted"
                        aria-label="Close Sidebar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto custom-scrollbar px-4 py-2">
                    <div className="space-y-1">
                        {filteredNavItems.map(item => renderNavItem(item))}
                    </div>
                </nav>

                {/* Footer */}
                <div className="p-6 border-t border-glass-border">
                    <p className="text-xs text-muted text-center">
                        © 2025 AthleticaOS
                    </p>
                </div>
            </div>
        </aside >

    );
};
