import React from 'react';
import {
    House,
    Users,
    UsersThree,
    Buildings,
    Trophy,
    CalendarBlank,
    Medal,
    Pulse as ActivityIcon,
    Wrench,
    Globe,
    Gavel,
    Eye,
    ShieldWarning,
    ChartBar,
    ChartLine,
    CurrencyDollar,
} from '@phosphor-icons/react';
import { isFeatureEnabled, FeatureKey } from '@/config/features';
import { User } from '@/types';

export type YouGroupId = 'manage' | 'insights' | 'federation' | 'operations';

export interface AdminNavItem {
    key: string;
    label: string;
    path: string;
    icon: React.ReactNode;
    iconFilled: React.ReactNode;
    roles?: string[];
    feature?: FeatureKey;
    youGroup?: YouGroupId;
}

export interface AdminNavSection {
    title?: string;
    items: AdminNavItem[];
    roles?: string[];
    feature?: FeatureKey;
}

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
    {
        title: 'Menu',
        items: [
            {
                key: 'dashboard',
                label: 'Dashboard',
                path: '/dashboard',
                icon: <House className="w-5 h-5" />,
                iconFilled: <House className="w-5 h-5" weight="fill" />,
            },
            {
                key: 'users',
                label: 'Users',
                path: '/dashboard/users',
                icon: <Users className="w-5 h-5" />,
                iconFilled: <Users className="w-5 h-5" weight="fill" />,
                roles: ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN'],
                youGroup: 'manage',
            },
            {
                key: 'players',
                label: 'Players',
                path: '/dashboard/players',
                icon: <Users className="w-5 h-5" />,
                iconFilled: <Users className="w-5 h-5" weight="fill" />,
            },
            {
                key: 'teams',
                label: 'Teams',
                path: '/dashboard/teams',
                icon: <UsersThree className="w-5 h-5" />,
                iconFilled: <UsersThree className="w-5 h-5" weight="fill" />,
            },
            {
                key: 'organisations',
                label: 'Organisations',
                path: '/dashboard/organisations',
                icon: <Buildings className="w-5 h-5" />,
                iconFilled: <Buildings className="w-5 h-5" weight="fill" />,
                youGroup: 'manage',
            },
            {
                key: 'people',
                label: 'People',
                path: '/dashboard/people',
                icon: <Users className="w-5 h-5" />,
                iconFilled: <Users className="w-5 h-5" weight="fill" />,
                roles: ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN'],
                youGroup: 'manage',
            },
            {
                key: 'competitions',
                label: 'Competitions',
                path: '/dashboard/competitions',
                icon: <Medal className="w-5 h-5" />,
                iconFilled: <Medal className="w-5 h-5" weight="fill" />,
                youGroup: 'manage',
            },
            {
                key: 'tournaments',
                label: 'Tournaments',
                path: '/dashboard/tournaments',
                icon: <Trophy className="w-5 h-5" />,
                iconFilled: <Trophy className="w-5 h-5" weight="fill" />,
                youGroup: 'manage',
            },
            {
                key: 'matches',
                label: 'Matches',
                path: '/dashboard/matches',
                icon: <CalendarBlank className="w-5 h-5" />,
                iconFilled: <CalendarBlank className="w-5 h-5" weight="fill" />,
            },
        ],
    },
    {
        title: 'Federation',
        feature: 'federation',
        roles: ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN'],
        items: [
            {
                key: 'federationDashboard',
                label: 'Dashboard',
                path: '/dashboard/federation/dashboard',
                icon: <Globe className="w-5 h-5" />,
                iconFilled: <Globe className="w-5 h-5" weight="fill" />,
                youGroup: 'federation',
            },
            {
                key: 'sanctioning',
                label: 'Sanctioning',
                path: '/dashboard/federation/sanctioning',
                icon: <Gavel className="w-5 h-5" />,
                iconFilled: <Gavel className="w-5 h-5" weight="fill" />,
                youGroup: 'federation',
            },
            {
                key: 'oversight',
                label: 'Oversight',
                path: '/dashboard/federation/oversight',
                icon: <Eye className="w-5 h-5" />,
                iconFilled: <Eye className="w-5 h-5" weight="fill" />,
                youGroup: 'federation',
            },
            {
                key: 'discipline',
                label: 'Discipline',
                path: '/dashboard/federation/discipline',
                icon: <ShieldWarning className="w-5 h-5" />,
                iconFilled: <ShieldWarning className="w-5 h-5" weight="fill" />,
                youGroup: 'federation',
            },
        ],
    },
    {
        title: 'Analysis',
        items: [
            {
                key: 'stats',
                label: 'Stats & Leaderboards',
                path: '/dashboard/stats',
                icon: <ChartBar className="w-5 h-5" />,
                iconFilled: <ChartBar className="w-5 h-5" weight="fill" />,
                youGroup: 'insights',
            },
            {
                key: 'analytics',
                label: 'Analytics',
                path: '/dashboard/analytics/teams',
                icon: <ChartLine className="w-5 h-5" />,
                iconFilled: <ChartLine className="w-5 h-5" weight="fill" />,
                roles: ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN'],
                feature: 'analytics',
                youGroup: 'insights',
            },
        ],
    },
    {
        title: 'Operations',
        items: [
            {
                key: 'operations',
                label: 'Operations',
                path: '/dashboard/operations',
                icon: <Wrench className="w-5 h-5" />,
                iconFilled: <Wrench className="w-5 h-5" weight="fill" />,
                roles: ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN'],
                feature: 'operations',
                youGroup: 'operations',
            },
            {
                key: 'officials',
                label: 'Officials',
                path: '/dashboard/officials',
                icon: <Users className="w-5 h-5" />,
                iconFilled: <Users className="w-5 h-5" weight="fill" />,
                roles: ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN'],
                youGroup: 'manage',
            },
            {
                key: 'monetization',
                label: 'Monetization',
                path: '/dashboard/monetization/subscriptions',
                icon: <CurrencyDollar className="w-5 h-5" />,
                iconFilled: <CurrencyDollar className="w-5 h-5" weight="fill" />,
                roles: ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN'],
                feature: 'monetization',
                youGroup: 'operations',
            },
            {
                key: 'activity',
                label: 'Activity & Logs',
                path: '/dashboard/activity',
                icon: <ActivityIcon className="w-5 h-5" />,
                iconFilled: <ActivityIcon className="w-5 h-5" weight="fill" />,
                youGroup: 'insights',
            },
        ],
    },
];

/**
 * Filter sections and items based on role permissions and feature flags.
 * Shared by the desktop sidebar and the mobile You page to avoid drift.
 */
export function getVisibleAdminNavSections(user: User | null): AdminNavSection[] {
    return ADMIN_NAV_SECTIONS
        .filter((section) => {
            if (section.feature && !isFeatureEnabled(section.feature)) return false;
            if (
                section.roles &&
                section.roles.length > 0 &&
                !section.roles.some((role) => user?.roles?.includes(role))
            ) {
                return false;
            }
            return true;
        })
        .map((section) => ({
            ...section,
            items: section.items.filter((item) => {
                if (item.feature && !isFeatureEnabled(item.feature)) return false;
                if (
                    item.roles &&
                    item.roles.length > 0 &&
                    !item.roles.some((role) => user?.roles?.includes(role))
                ) {
                    return false;
                }
                return true;
            }),
        }))
        .filter((section) => section.items.length > 0);
}

export interface YouPageGroup {
    id: YouGroupId;
    label: string;
    items: AdminNavItem[];
}

/**
 * Groups visible admin items for the You page.
 * Items that are already primary tabs for that role are excluded.
 */
export function getYouPageGroups(user: User | null): YouPageGroup[] {
    const isSuperOrOrgAdmin = Boolean(
        user?.roles?.some((r) => r === 'ROLE_SUPER_ADMIN' || r === 'ROLE_ORG_ADMIN')
    );

    // Primary tab paths for the active role
    const tabPaths = new Set<string>(
        isSuperOrOrgAdmin
            ? ['/dashboard', '/dashboard/matches', '/dashboard/tournaments', '/dashboard/teams', '/dashboard/players']
            : ['/dashboard', '/dashboard/matches', '/dashboard/teams', '/dashboard/players']
    );

    const visibleSections = getVisibleAdminNavSections(user);
    const allItems: AdminNavItem[] = [];
    visibleSections.forEach((s) => allItems.push(...s.items));

    // Exclude tabs and any item without a youGroup
    const youItems = allItems.filter((item) => !tabPaths.has(item.path) && item.youGroup);

    // Group in exact order: Manage, Insights, Federation, Operations
    const groupOrder: { id: YouGroupId; label: string }[] = [
        { id: 'manage', label: 'Manage' },
        { id: 'insights', label: 'Insights' },
        { id: 'federation', label: 'Federation' },
        { id: 'operations', label: 'Operations' },
    ];

    return groupOrder
        .map((grp) => ({
            ...grp,
            items: youItems.filter((i) => i.youGroup === grp.id),
        }))
        .filter((grp) => grp.items.length > 0);
}
