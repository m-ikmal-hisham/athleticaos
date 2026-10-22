import type { Icon } from '@phosphor-icons/react';
import { House, Trophy, UsersThree, User, Info, Handshake, EnvelopeSimple } from '@phosphor-icons/react';

/**
 * Public navigation: single source of truth for the public shell
 * (desktop top bar, phone bottom bar, "More" sheet).
 * Labels live only here so the i18n branch can translate them.
 */
export interface PublicNavItem {
    key: string;
    label: string;
    /** Shorter label for the phone tab bar, where each item is ~70 px wide */
    tabLabel?: string;
    to: string;
    icon: Icon;
    /** Match only the exact path (used for '/') */
    exact?: boolean;
}

export const PUBLIC_PRIMARY_NAV: PublicNavItem[] = [
    // D10 (Matchday home) renames this to Matchday / Lightning
    { key: 'home', label: 'Home', to: '/', icon: House, exact: true },
    { key: 'tournaments', label: 'Tournaments', tabLabel: 'Tours', to: '/tournaments', icon: Trophy },
    { key: 'teams', label: 'Teams', to: '/teams', icon: UsersThree },
    { key: 'players', label: 'Players', to: '/players', icon: User },
];

export const PUBLIC_MORE_NAV: PublicNavItem[] = [
    { key: 'how-it-works', label: 'How it works', to: '/how-it-works', icon: Info },
    { key: 'partners', label: 'Partners', to: '/partners', icon: Handshake },
    { key: 'contact', label: 'Contact', to: '/contact', icon: EnvelopeSimple },
];

/** Pages reached only from the footer; the bottom bar shows "More" as active on these. */
export const PUBLIC_FOOTER_ONLY_PATHS = ['/privacy', '/terms', '/data-requests'];

export const PUBLIC_NAV_LABELS = {
    more: 'More',
    signIn: 'Sign in',
    dashboard: 'Dashboard',
    skipToContent: 'Skip to content',
    primaryNav: 'Primary',
};

/** Detail routes that get the phone Back row: pattern prefix → parent */
export const PUBLIC_DETAIL_PARENTS: { prefix: string; label: string; to: string }[] = [
    { prefix: '/tournaments/', label: 'Tournaments', to: '/tournaments' },
    { prefix: '/teams/', label: 'Teams', to: '/teams' },
    { prefix: '/players/', label: 'Players', to: '/players' },
    { prefix: '/matches/', label: 'Home', to: '/' },
];

const matchesPath = (pathname: string, to: string) =>
    pathname === to || pathname.startsWith(to + '/');

/** Active state for a primary/more item. '/' is exact, except /matches/* counts as Home for now. */
export function isNavItemActive(item: PublicNavItem, pathname: string): boolean {
    if (item.exact) {
        if (item.to === '/') return pathname === '/' || pathname.startsWith('/matches/');
        return pathname === item.to;
    }
    return matchesPath(pathname, item.to);
}

/** "More" is active on any of its items or a footer-only page. */
export function isMoreActive(pathname: string): boolean {
    return (
        PUBLIC_MORE_NAV.some((item) => isNavItemActive(item, pathname)) ||
        PUBLIC_FOOTER_ONLY_PATHS.some((p) => matchesPath(pathname, p))
    );
}

/** Parent for the phone Back row, or null when the page is not a detail page. */
export function getDetailParent(pathname: string) {
    return PUBLIC_DETAIL_PARENTS.find((d) => pathname.startsWith(d.prefix) && pathname.length > d.prefix.length) ?? null;
}
