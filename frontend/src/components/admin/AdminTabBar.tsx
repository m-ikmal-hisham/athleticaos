import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    House,
    CalendarBlank,
    Trophy,
    UsersThree,
    Users,
} from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { GlassTabBar, GlassTabBarItem } from '@/components/navigation/GlassTabBar';
import { AdminTournamentAccessory } from './AdminTournamentAccessory';
import { TournamentSwitcher } from './TournamentSwitcher';

function UserAvatarIcon({ active }: { active: boolean }) {
    const user = useAuthStore((s) => s.user);
    const [imageError, setImageError] = useState(false);

    const initials =
        `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'U';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const photoUrl = (user as any)?.avatarUrl || (user as any)?.profilePhotoUrl;

    if (photoUrl && !imageError) {
        return (
            <img
                src={photoUrl}
                alt="You"
                className={clsx(
                    'w-6 h-6 rounded-full object-cover transition-all',
                    active
                        ? 'ring-2 ring-navy dark:ring-navy-tint ring-offset-1 ring-offset-transparent'
                        : 'opacity-90'
                )}
                onError={() => setImageError(true)}
            />
        );
    }

    return (
        <div
            className={clsx(
                'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white transition-all',
                active
                    ? 'bg-navy dark:bg-navy ring-2 ring-navy dark:ring-navy-tint ring-offset-1 ring-offset-transparent'
                    : 'bg-navy/80 dark:bg-navy/70'
            )}
            aria-hidden="true"
        >
            {initials}
        </div>
    );
}

export function AdminTabBar() {
    const { i18n } = useTranslation();
    const t = i18n.getFixedT('en', 'admin');
    const { pathname } = useLocation();
    const user = useAuthStore((s) => s.user);
    const overlayCount = useUIStore((s) => s.overlayCount);
    const [switcherOpen, setSwitcherOpen] = useState(false);

    const isSuperOrOrgAdmin = Boolean(
        user?.roles?.some((r) => r === 'ROLE_SUPER_ADMIN' || r === 'ROLE_ORG_ADMIN')
    );

    // Accessory only shown on exact list and when no sheet/modal is open
    const isAccessoryRoute =
        pathname === '/dashboard' || pathname === '/dashboard/stats' || pathname === '/dashboard/matches';
    const hasAccessory = isAccessoryRoute && overlayCount === 0;

    // Determine activeKey
    let activeKey: string | null = null;
    if (pathname === '/dashboard') {
        activeKey = 'home';
    } else if (pathname === '/dashboard/matches' || pathname.startsWith('/dashboard/matches/')) {
        activeKey = 'matches';
    } else if (isSuperOrOrgAdmin) {
        if (pathname === '/dashboard/tournaments' || pathname.startsWith('/dashboard/tournaments/')) {
            activeKey = 'tournaments';
        } else if (
            pathname.startsWith('/dashboard/teams') ||
            pathname.startsWith('/dashboard/players')
        ) {
            activeKey = 'squads';
        }
    } else {
        if (pathname.startsWith('/dashboard/teams')) {
            activeKey = 'teams';
        } else if (pathname.startsWith('/dashboard/players')) {
            activeKey = 'players';
        }
    }

    if (!activeKey && (pathname.startsWith('/dashboard/you') || pathname.startsWith('/dashboard/profile'))) {
        activeKey = 'you';
    }

    const items: GlassTabBarItem[] = isSuperOrOrgAdmin
        ? [
              {
                  key: 'home',
                  label: t('tabs.home'),
                  to: '/dashboard',
                  icon: House,
              },
              {
                  key: 'matches',
                  label: t('tabs.matches'),
                  to: '/dashboard/matches',
                  icon: CalendarBlank,
              },
              {
                  key: 'tournaments',
                  label: t('tabs.tournaments'),
                  to: '/dashboard/tournaments',
                  icon: Trophy,
              },
              {
                  key: 'squads',
                  label: t('tabs.squads'),
                  to: '/dashboard/teams',
                  icon: UsersThree,
              },
              {
                  key: 'you',
                  label: t('tabs.you'),
                  to: '/dashboard/you',
                  renderIcon: (active) => <UserAvatarIcon active={active} />,
              },
          ]
        : [
              {
                  key: 'home',
                  label: t('tabs.home'),
                  to: '/dashboard',
                  icon: House,
              },
              {
                  key: 'matches',
                  label: t('tabs.matches'),
                  to: '/dashboard/matches',
                  icon: CalendarBlank,
              },
              {
                  key: 'teams',
                  label: t('tabs.teams'),
                  to: '/dashboard/teams',
                  icon: UsersThree,
              },
              {
                  key: 'players',
                  label: t('tabs.players'),
                  to: '/dashboard/players',
                  icon: Users,
              },
              {
                  key: 'you',
                  label: t('tabs.you'),
                  to: '/dashboard/you',
                  renderIcon: (active) => <UserAvatarIcon active={active} />,
              },
          ];

    return (
        <>
            <GlassTabBar
                items={items}
                activeKey={activeKey}
                hasAccessory={hasAccessory}
                accessorySlot={<AdminTournamentAccessory onOpenSwitcher={() => setSwitcherOpen(true)} />}
                ariaLabel="Admin navigation"
            />

            <TournamentSwitcher
                isOpen={switcherOpen}
                onClose={() => setSwitcherOpen(false)}
            />
        </>
    );
}
