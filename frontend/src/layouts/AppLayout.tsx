import { Suspense, useState, useEffect } from 'react';
import { Outlet, Link, ScrollRestoration, useLocation } from 'react-router-dom';
import { CaretDown, CaretLeft, CaretRight, CaretUpDown, Trophy } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ProfilePopup } from '@/components/ProfilePopup';
import { useEffectiveTheme } from '@/hooks/useEffectiveTheme';
import { PageLoader } from '@/components/PageLoader';
import { EnvironmentRibbon } from '@/components/EnvironmentRibbon';
import { SITE_NAME, PRODUCT_NAME, SPORT_NAME } from '@/config/site';
import { useBrandingStore } from '@/store/branding.store';
import { getOrganisationById } from '@/api/organisations.api';
import { getVisibleAdminNavSections } from '@/config/adminNav';
import { AdminTabBar } from '@/components/admin/AdminTabBar';
import { AdminBrandBackground } from '@/components/admin/AdminBrandBackground';
import { TournamentSwitcher } from '@/components/admin/TournamentSwitcher';
import { useSpotlightTournament } from '@/hooks/useSpotlightTournament';
import { TournamentLogo } from '@/components/common/TournamentLogo';
import { ScrollToTopOnNavigate } from '@/components/common/ScrollToTopOnNavigate';

function getAdminPageTitle(pathname: string, t: (key: string) => string): string {
    if (pathname === '/dashboard') return t('topBar.dashboard');
    if (pathname.startsWith('/dashboard/matches')) return t('topBar.matches');
    if (pathname.startsWith('/dashboard/tournaments')) return t('topBar.tournaments');
    if (pathname.startsWith('/dashboard/teams')) return t('topBar.teams');
    if (pathname.startsWith('/dashboard/players')) return t('topBar.players');
    if (pathname.startsWith('/dashboard/users')) return t('topBar.users');
    if (pathname.startsWith('/dashboard/organisations')) return t('topBar.organisations');
    if (pathname.startsWith('/dashboard/people')) return t('topBar.people');
    if (pathname.startsWith('/dashboard/competitions')) return t('topBar.competitions');
    if (pathname.startsWith('/dashboard/officials')) return t('topBar.officials');
    if (pathname.startsWith('/dashboard/stats')) return t('topBar.stats');
    if (pathname.startsWith('/dashboard/activity')) return t('topBar.activity');
    if (pathname.startsWith('/dashboard/you')) return t('topBar.you');
    if (pathname.startsWith('/dashboard/profile')) return t('topBar.profile');
    if (pathname.startsWith('/dashboard/federation')) return t('topBar.federation');
    if (pathname.startsWith('/dashboard/operations')) return t('topBar.operations');
    if (pathname.startsWith('/dashboard/analytics')) return t('topBar.analytics');
    if (pathname.startsWith('/dashboard/monetization')) return t('topBar.monetization');
    return t('topBar.dashboard');
}

export const AppLayout = () => {
    const { i18n } = useTranslation();
    const t = i18n.getFixedT('en', 'admin');

    // Default: icon rail on lg–xl (1024–1279), expanded on ≥ xl (1280)
    const [isCollapsed, setIsCollapsed] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth < 1280;
        }
        return false;
    });

    // Follow the width (rotation, window resize) until the user toggles the sidebar themselves
    const [userToggledSidebar, setUserToggledSidebar] = useState(false);
    useEffect(() => {
        if (userToggledSidebar || typeof window === 'undefined') return;
        const mq = window.matchMedia('(min-width: 1280px)');
        const apply = () => setIsCollapsed(!mq.matches);
        apply();
        mq.addEventListener('change', apply);
        return () => mq.removeEventListener('change', apply);
    }, [userToggledSidebar]);

    const [showProfilePopup, setShowProfilePopup] = useState(false);
    const [switcherOpen, setSwitcherOpen] = useState(false);
    const location = useLocation();
    const { user, checkTokenValidity } = useAuthStore();
    const overlayCount = useUIStore((s) => s.overlayCount);
    const { tournament: spotlightTournament } = useSpotlightTournament({ isAdmin: true });
    const { setBrandingFromOrganisation, resetBranding, primaryColor, secondaryColor, accentColor, logoUrl: brandLogoUrl } = useBrandingStore();
    const effectiveTheme = useEffectiveTheme();
    const logoSrc = effectiveTheme === 'dark' ? '/athleticaos-logo-dark-x2.png' : '/athleticaos-logo-primary-x2.png';

    // Check token validity on mount
    useEffect(() => {
        checkTokenValidity();
    }, [checkTokenValidity]);

    // Initialize Branding
    useEffect(() => {
        const initBranding = async () => {
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
    }, [primaryColor, secondaryColor, accentColor]);

    const visibleSections = getVisibleAdminNavSections(user);
    const pageTitle = getAdminPageTitle(location.pathname, t);

    // Calculate bottom space: tab bar (64px) + accessory (60px) + safe area + 16px clearance
    const isAccessoryRoute =
        location.pathname === '/dashboard' ||
        location.pathname === '/dashboard/stats' ||
        location.pathname === '/dashboard/matches';
    const isAccessoryVisible = isAccessoryRoute && overlayCount === 0;

    const bottomChrome = isAccessoryVisible
        ? 'calc(140px + max(12px, env(safe-area-inset-bottom, 0px)))'
        : 'calc(80px + max(12px, env(safe-area-inset-bottom, 0px)))';

    return (
        <div
            className="min-h-screen flex flex-col pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]"
            style={{ '--admin-bottom-chrome': bottomChrome } as React.CSSProperties}
        >
            <AdminBrandBackground />
            <EnvironmentRibbon />
            {/* New visits open at the top; Back/Forward restore the position saved for that
                history entry. Same-page search-param changes opt out via preventScrollReset. */}
            <ScrollRestoration />
            <ScrollToTopOnNavigate />
            <div className="flex-1 flex min-h-0 relative">
                {/* Sidebar - Desktop Only (≥ lg) */}
                <aside
                    className={clsx(
                        'hidden lg:flex fixed z-50 transition-all duration-300',
                        isCollapsed ? 'w-20' : 'w-60',
                        'p-0 flex-col',
                        'border border-white/10 dark:border-white/5',
                        'shadow-[0_8px_40px_-12px_rgba(0,0,0,0.3)]',
                        'top-4 bottom-4 left-4 rounded-[24px]'
                    )}
                >
                    <div className="backdrop-blur-nav relative flex flex-col h-full bg-white/40 dark:bg-black/40 overflow-hidden border border-white/20 dark:border-white/10 shadow-2xl rounded-[24px]">
                        {/* Logo & Header */}
                        <div className={clsx("flex items-center p-6 pb-2 transition-all duration-300", isCollapsed ? "justify-center px-0" : "justify-between pr-12")}>
                            <Link to="/dashboard" title={SITE_NAME} aria-label={`${SITE_NAME} Manager`} className={clsx("flex items-center group min-w-0", isCollapsed ? "gap-0" : "gap-3")}>
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
                                        {PRODUCT_NAME}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-1 whitespace-nowrap">
                                        {SPORT_NAME} Manager
                                    </span>
                                </div>
                            </Link>
                        </div>

                        {/* Toggle Button */}
                        <button
                            onClick={() => { setUserToggledSidebar(true); setIsCollapsed(!isCollapsed); }}
                            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                            className={clsx(
                                "flex w-6 h-6 bg-white dark:bg-deep-navy rounded-full shadow-sm items-center justify-center text-xs border border-black/10 dark:border-white/12 z-50 text-black/72 dark:text-white/72 hover:text-black dark:hover:text-white hover:bg-black/4 dark:hover:bg-white/6 transition-all duration-150 mb-2",
                                isCollapsed ? "relative mx-auto" : "absolute top-8 right-5"
                            )}
                        >
                            {isCollapsed ? <CaretRight className="w-4 h-4" /> : <CaretLeft className="w-4 h-4" />}
                        </button>

                        {/* Tournament Chip (Desktop Only) */}
                        <div className={clsx("px-3 mb-2", isCollapsed && "px-2")}>
                            <button
                                type="button"
                                onClick={() => setSwitcherOpen(true)}
                                title={spotlightTournament?.name || t('switcher.selectTournament')}
                                aria-label={t('accessory.openSwitcher')}
                                className={clsx(
                                    "w-full flex items-center rounded-xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 border border-black/10 dark:border-white/12 transition-all duration-150 text-left",
                                    isCollapsed ? "justify-center p-2" : "justify-between p-2.5 gap-2"
                                )}
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-6 h-6 rounded-lg bg-surface-sunken flex items-center justify-center shrink-0 border border-line-subtle overflow-hidden">
                                        {spotlightTournament && (spotlightTournament.logoUrl || spotlightTournament.organiserBranding?.logoUrl) ? (
                                            <TournamentLogo
                                                tournamentId={spotlightTournament.id}
                                                logoUrl={spotlightTournament.logoUrl || spotlightTournament.organiserBranding?.logoUrl}
                                                className="w-full h-full object-contain"
                                            />
                                        ) : (
                                            <Trophy size={14} className="text-content-secondary" />
                                        )}
                                    </div>
                                    {!isCollapsed && (
                                        <div className="min-w-0 flex-1">
                                            <span className="block text-xs font-semibold text-content-primary truncate leading-tight">
                                                {spotlightTournament ? spotlightTournament.name : t('switcher.selectTournament')}
                                            </span>
                                            {spotlightTournament?.live && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-crimson dark:text-crimson-tint">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-crimson animate-pulse" />
                                                    Live
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {!isCollapsed && (
                                    <CaretUpDown size={14} weight="bold" className="text-content-tertiary shrink-0" />
                                )}
                            </button>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar">
                            {visibleSections.map((section, sectionIndex) => (
                                <div key={section.title || sectionIndex} className={clsx("mb-6", isCollapsed && "mb-4")}>
                                    {section.title && !isCollapsed && (
                                        <h3 className="px-3 text-xs font-semibold text-black/60 dark:text-white/60 uppercase tracking-wider mb-2">
                                            {section.title}
                                        </h3>
                                    )}
                                    <ul className="space-y-0.5">
                                        {section.items.map((item) => {
                                            const isActive = item.path === '/dashboard'
                                                ? location.pathname === '/dashboard'
                                                : (location.pathname === item.path || location.pathname.startsWith(item.path + '/'));
                                            return (
                                                <li key={item.path}>
                                                    <Link
                                                        to={item.path}
                                                        className={clsx(
                                                            'flex items-center gap-3 rounded-lg transition-all duration-150 group relative',
                                                            isCollapsed ? 'justify-center py-3 px-2' : 'px-3 py-1.5 mx-0',
                                                            isActive
                                                                ? 'bg-navy text-white font-medium'
                                                                : 'text-sm font-medium text-black/72 dark:text-white/72 hover:bg-black/4 dark:hover:bg-white/6 hover:text-black dark:hover:text-white'
                                                        )}
                                                    >
                                                        <span className={clsx("shrink-0", isActive ? "text-white" : "text-current")}>
                                                            {isActive ? item.iconFilled : item.icon}
                                                        </span>

                                                        {!isCollapsed && (
                                                            <span className="text-sm tracking-tight whitespace-nowrap overflow-hidden transition-all duration-150">
                                                                {item.label}
                                                            </span>
                                                        )}

                                                        {/* Tooltip for collapsed state */}
                                                        {isCollapsed && (
                                                            <div className="absolute left-full ml-4 px-2 py-1 bg-deep-navy text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-white/12">
                                                                {item.label}
                                                            </div>
                                                        )}
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                    {isCollapsed && sectionIndex < visibleSections.length - 1 && (
                                        <div className="mx-2 my-2 border-b border-black/10 dark:border-white/12" />
                                    )}
                                </div>
                            ))}
                        </nav>

                        {/* Bottom Section: Theme + Profile */}
                        <div className={clsx("m-3 mt-0 bg-black/4 dark:bg-white/6 rounded-2xl border border-black/10 dark:border-white/12 transition-all duration-150", isCollapsed ? "p-2" : "p-3")}>
                            {!isCollapsed && (
                                <div className="text-[10px] text-black/60 dark:text-white/60 px-2 uppercase tracking-wider font-semibold mb-3 flex items-center justify-between">
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
                                    "w-full flex items-center rounded-xl hover:bg-black/4 dark:hover:bg-white/6 transition-all duration-150 border border-transparent hover:border-black/10 dark:hover:border-white/12",
                                    isCollapsed ? "justify-center p-1" : "gap-3 p-2"
                                )}
                            >
                                <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center shadow-inner ring-2 ring-white/10 shrink-0">
                                    <span className="font-bold text-white text-xs">
                                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                                    </span>
                                </div>
                                {!isCollapsed && (
                                    <>
                                        <div className="flex-1 text-left overflow-hidden">
                                            <p className="text-xs font-semibold text-black/90 dark:text-white/92 truncate leading-tight">
                                                {user?.firstName} {user?.lastName}
                                            </p>
                                            <p className="text-[10px] text-black/60 dark:text-white/60 truncate">
                                                Is Active
                                            </p>
                                        </div>
                                        <CaretDown className="w-3 h-3 text-black/60 dark:text-white/60" weight="bold" />
                                    </>
                                )}
                            </button>
                            {!isCollapsed && import.meta.env.VITE_ENV !== 'production' && (
                                <p className="mt-2 text-[10px] text-black/60 dark:text-white/60 font-mono text-center">
                                    v{import.meta.env.VITE_GIT_SHA || 'dev'}
                                </p>
                            )}
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <div className={clsx(
                    "flex-1 flex flex-col min-h-screen transition-all duration-300 min-w-0",
                    isCollapsed ? "lg:ml-[100px]" : "lg:ml-[260px]"
                )}>
                    {/* Topbar - Mobile / Tablet Only (< lg) */}
                    <header className="sticky top-0 z-30 glass pt-[env(safe-area-inset-top,0px)] lg:hidden rounded-none border-b border-line-subtle">
                        <div className="flex items-center gap-3 px-4 py-3 min-w-0">
                            <Link to="/dashboard" aria-label={SITE_NAME} className="shrink-0 flex items-center">
                                <img
                                    src={brandLogoUrl || logoSrc}
                                    alt="Logo"
                                    className="w-7 h-7 object-contain rounded-md"
                                />
                            </Link>
                            <h1 className="font-bold text-base text-content-primary truncate">
                                {pageTitle}
                            </h1>
                        </div>
                    </header>

                    {/* Page Content Container */}
                    <main className="flex-1 p-4 lg:p-8 overflow-y-auto relative w-full overflow-x-hidden pb-[var(--admin-bottom-chrome)] lg:pb-8">
                        <div className="max-w-7xl mx-auto w-full">
                            <Suspense fallback={<PageLoader />}>
                                <Outlet />
                            </Suspense>
                        </div>
                    </main>

                    {/* Admin Floating Glass Tab Bar (< lg) */}
                    <AdminTabBar />
                </div>

                {/* Profile Popup (Desktop) */}
                <ProfilePopup
                    isOpen={showProfilePopup}
                    onClose={() => setShowProfilePopup(false)}
                />

                {/* Desktop Tournament Switcher */}
                <TournamentSwitcher
                    isOpen={switcherOpen}
                    onClose={() => setSwitcherOpen(false)}
                />
            </div>
        </div>
    );
};
