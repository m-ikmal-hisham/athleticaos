import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DotsThreeOutline, Globe, SignIn, SquaresFour } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/auth.store';
import { changeLanguage } from '@/i18n';
import {
    PUBLIC_PRIMARY_NAV,
    PUBLIC_MORE_NAV,
    isNavItemActive,
    isMoreActive,
} from '@/config/navigation';
import { BottomSheet } from './BottomSheet';
import { GlassTabBar, GlassTabBarItem } from '@/components/navigation/GlassTabBar';
import { PublicNowAccessory, useIsPublicAccessoryLive } from './PublicNowAccessory';
import { TournamentLogo } from '@/components/common/TournamentLogo';
import { useSpotlightTournament } from '@/hooks/useSpotlightTournament';

const sheetRow =
    'flex items-center gap-3 w-full min-h-[48px] px-3 rounded-[10px] text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-navy-tint';

/**
 * Public floating glass tab bar (< lg).
 * Thin wrapper around generic GlassTabBar that wires up the public nav items,
 * More bottom sheet, and the live tournament accessory.
 */
export function PublicTabBar() {
    const { t, i18n } = useTranslation();
    const { pathname } = useLocation();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const [moreOpen, setMoreOpen] = useState(false);
    // List of every live tournament, opened from the pill when more than one is live
    const [liveOpen, setLiveOpen] = useState(false);
    const isAccessoryLive = useIsPublicAccessoryLive();
    const { liveTournaments } = useSpotlightTournament({ isAdmin: false });

    const currentLang = i18n.language && i18n.language.startsWith('ms') ? 'ms' : 'en';

    // "24–25 Oct" (or "24 Oct – 5 Dec") in the page language, for the live list
    const dateRange = (start?: string, end?: string) => {
        if (!start) return '';
        const locale = currentLang === 'ms' ? 'ms-MY' : 'en-GB';
        const fmt = (d: string) => new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
        if (!end || end === start) return fmt(start);
        const sameMonth = start.slice(0, 7) === end.slice(0, 7);
        return sameMonth
            ? `${new Date(start).toLocaleDateString(locale, { day: 'numeric' })}–${fmt(end)}`
            : `${fmt(start)} – ${fmt(end)}`;
    };

    const authItem = isAuthenticated
        ? { label: t('nav.dashboard'), to: '/dashboard', icon: SquaresFour }
        : { label: t('nav.signIn'), to: '/login', icon: SignIn };
    const AuthIcon = authItem.icon;

    // Determine active key
    let activeKey: string | null = null;
    for (const item of PUBLIC_PRIMARY_NAV) {
        if (isNavItemActive(item, pathname)) {
            activeKey = item.key;
            break;
        }
    }
    if (!activeKey && isMoreActive(pathname)) {
        activeKey = 'more';
    }

    // Build items for GlassTabBar
    const items: GlassTabBarItem[] = [
        ...PUBLIC_PRIMARY_NAV.map((navItem) => ({
            key: navItem.key,
            label: navItem.tabLabelKey ? t(navItem.tabLabelKey) : t(navItem.labelKey),
            to: navItem.to,
            icon: navItem.icon,
        })),
        {
            key: 'more',
            label: t('nav.more'),
            icon: DotsThreeOutline,
            onClick: () => setMoreOpen(true),
            ariaHasPopup: 'dialog',
            ariaExpanded: moreOpen,
        },
    ];

    const toggleLanguage = () => {
        const next = currentLang === 'en' ? 'ms' : 'en';
        void changeLanguage(next);
    };

    return (
        <>
            <GlassTabBar
                items={items}
                activeKey={activeKey}
                hasAccessory={isAccessoryLive}
                accessorySlot={<PublicNowAccessory onShowAllLive={() => setLiveOpen(true)} />}
                ariaLabel={t('nav.primaryNav')}
            />

            <BottomSheet
                isOpen={liveOpen}
                onClose={() => setLiveOpen(false)}
                title={t('accessory.liveListTitle')}
                closeLabel={t('dialog.close')}
                className="lg:hidden"
            >
                <ul className="space-y-1 pb-2">
                    {liveTournaments.map((live) => {
                        const to = `/tournaments/${live.slug || live.id}`;
                        const active = pathname === to || pathname.startsWith(to + '/');
                        return (
                            <li key={live.id}>
                                <Link
                                    to={to}
                                    onClick={() => setLiveOpen(false)}
                                    aria-current={active ? 'page' : undefined}
                                    className={clsx(
                                        sheetRow,
                                        'min-h-[56px]',
                                        active
                                            ? 'bg-navy/[0.08] dark:bg-navy-tint/12 text-navy dark:text-navy-tint'
                                            : 'text-content-primary hover:bg-surface-sunken'
                                    )}
                                >
                                    <span className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-surface-sunken flex items-center justify-center">
                                        <TournamentLogo
                                            tournamentId={live.id}
                                            logoUrl={live.logoUrl || live.organiserBranding?.logoUrl}
                                            className="w-full h-full object-contain"
                                        />
                                    </span>
                                    <span className="min-w-0 flex-1 py-1">
                                        {/* Two lines rather than "…": the name is what people pick by */}
                                        <span className="block font-semibold leading-snug line-clamp-2">{live.name}</span>
                                        {dateRange(live.startDate, live.endDate) && (
                                            <span className="block text-xs text-black/60 dark:text-white/60 leading-snug">
                                                {dateRange(live.startDate, live.endDate)}
                                            </span>
                                        )}
                                    </span>
                                    <span className="shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-crimson text-white text-[11px] font-bold uppercase tracking-wider">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white" aria-hidden="true" />
                                        {t('status.live')}
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </BottomSheet>

            <BottomSheet
                isOpen={moreOpen}
                onClose={() => setMoreOpen(false)}
                title={t('nav.more')}
                closeLabel={t('dialog.close')}
                className="lg:hidden"
            >
                <ul className="space-y-1 pb-2">
                    {PUBLIC_MORE_NAV.map((item) => {
                        const active = isNavItemActive(item, pathname);
                        const Icon = item.icon;
                        return (
                            <li key={item.key}>
                                <Link
                                    to={item.to}
                                    onClick={() => setMoreOpen(false)}
                                    aria-current={active ? 'page' : undefined}
                                    className={clsx(
                                        sheetRow,
                                        active
                                            ? 'bg-navy/[0.08] dark:bg-navy-tint/12 text-navy dark:text-navy-tint'
                                            : 'text-content-primary hover:bg-surface-sunken'
                                    )}
                                >
                                    <Icon size={20} weight={active ? 'fill' : 'duotone'} aria-hidden="true" />
                                    {t(item.labelKey)}
                                </Link>
                            </li>
                        );
                    })}

                    {/* Language row: shows current, toggles */}
                    <li className="pt-1 mt-1 border-t border-line-subtle">
                        <button
                            type="button"
                            onClick={toggleLanguage}
                            className={clsx(sheetRow, 'text-content-primary hover:bg-surface-sunken justify-between')}
                            aria-label={`${t('language.label')}: ${currentLang === 'ms' ? 'Bahasa Melayu' : 'English'}`}
                        >
                            <span className="flex items-center gap-3">
                                <Globe size={20} weight="duotone" aria-hidden="true" />
                                <span>{t('language.label')}</span>
                            </span>
                            <span className="text-xs font-semibold px-2 py-1 rounded-md bg-surface-sunken border border-line-subtle text-content-secondary">
                                {currentLang === 'ms' ? 'BM' : 'EN'}
                            </span>
                        </button>
                    </li>

                    <li className="pt-1 mt-1 border-t border-line-subtle">
                        <Link
                            to={authItem.to}
                            onClick={() => setMoreOpen(false)}
                            className={clsx(sheetRow, 'text-content-primary hover:bg-surface-sunken')}
                        >
                            <AuthIcon size={20} aria-hidden="true" />
                            {authItem.label}
                        </Link>
                    </li>
                </ul>
            </BottomSheet>
        </>
    );
}
