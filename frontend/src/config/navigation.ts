import type { Icon } from '@phosphor-icons/react';
import { House, Trophy, UsersThree, User, Info, Handshake, EnvelopeSimple, TreeStructure } from '@phosphor-icons/react';

/**
 * Public navigation: single source of truth for the public shell
 * (desktop top bar, phone bottom bar, "More" sheet).
 * Labels live as translation keys so the shell can translate them.
 */
export interface PublicNavItem {
    key: string;
    labelKey: string;
    /** Shorter translation key for the phone tab bar, where each item is ~70 px wide */
    tabLabelKey?: string;
    to: string;
    icon: Icon;
    /** Match only the exact path (used for '/') */
    exact?: boolean;
}

export const PUBLIC_PRIMARY_NAV: PublicNavItem[] = [
    // D10 (Matchday home) renames this to Matchday / Lightning
    { key: 'home', labelKey: 'nav.home', to: '/', icon: House, exact: true },
    { key: 'tournaments', labelKey: 'nav.tournaments', tabLabelKey: 'nav.tournamentsShort', to: '/tournaments', icon: Trophy },
    { key: 'teams', labelKey: 'nav.teams', to: '/teams', icon: UsersThree },
    { key: 'players', labelKey: 'nav.players', to: '/players', icon: User },
];

export const PUBLIC_MORE_NAV: PublicNavItem[] = [
    { key: 'organisations', labelKey: 'nav.organisations', to: '/organisations', icon: TreeStructure },
    { key: 'how-it-works', labelKey: 'nav.howItWorks', to: '/how-it-works', icon: Info },
    { key: 'partners', labelKey: 'nav.partners', to: '/partners', icon: Handshake },
    { key: 'contact', labelKey: 'nav.contact', to: '/contact', icon: EnvelopeSimple },
];

/** Pages reached only from the footer; the bottom bar shows "More" as active on these. */
export const PUBLIC_FOOTER_ONLY_PATHS = ['/privacy', '/terms', '/data-requests'];

export const PUBLIC_NAV_KEY_MAP = {
    more: 'nav.more',
    signIn: 'nav.signIn',
    dashboard: 'nav.dashboard',
    skipToContent: 'nav.skipToContent',
    primaryNav: 'nav.primaryNav',
    back: 'nav.back',
};

/** Detail routes that get the phone Back row: pattern prefix → parent */
export const PUBLIC_DETAIL_PARENTS: { prefix: string; labelKey: string; to: string }[] = [
    { prefix: '/organisations/', labelKey: 'nav.organisations', to: '/organisations' },
    { prefix: '/tournaments/', labelKey: 'nav.tournaments', to: '/tournaments' },
    { prefix: '/teams/', labelKey: 'nav.teams', to: '/teams' },
    { prefix: '/players/', labelKey: 'nav.players', to: '/players' },
    { prefix: '/matches/', labelKey: 'nav.home', to: '/' },
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
