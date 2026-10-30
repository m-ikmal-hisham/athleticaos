import { Suspense, useEffect, useRef, useState, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Link, Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CaretDown, SignIn, SquaresFour } from '@phosphor-icons/react';
import { useEffectiveTheme } from '@/hooks/useEffectiveTheme';
import { AppBackground } from '@/components/public/AppBackground';
import { PublicTabBar } from '@/components/public/PublicTabBar';
import { useIsPublicAccessoryLive } from '@/components/public/PublicNowAccessory';
import { EnvironmentRibbon } from '@/components/EnvironmentRibbon';
import { PageLoader } from '@/components/PageLoader';
import { Button } from '@/components/Button';
import { LanguageSwitch } from '@/components/common/LanguageSwitch';
import { PublicThemeToggle } from '@/components/public/PublicThemeToggle';
import { ScrollToTopOnNavigate } from '@/components/common/ScrollToTopOnNavigate';
import { changeLanguage } from '@/i18n';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/auth.store';
import { SITE_NAME, COPYRIGHT_HOLDER, OWNER_NAME, SHOW_OWNER } from '@/config/site';
import { PARTNERS } from '@/config/partners';
import {
    PUBLIC_DESKTOP_PRIMARY_NAV,
    PUBLIC_DESKTOP_MORE_NAV,
    isNavItemActive,
    getDetailParent,
} from '@/config/navigation';
import {
    isAnimatedBackgroundFlagEnabled,
    isMotionAllowed,
} from '@/config/animatedBackground';

const focusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-navy-tint';

const footerLink = clsx(
    'inline-flex items-center min-h-[44px] rounded-sm hover:text-navy dark:hover:text-navy-tint motion-safe:transition-colors',
    focusRing
);

/** Desktop (≥ lg) "More" dropdown. Lives inside the sticky z-50 top bar so it sits above page content. */
function DesktopMoreMenu({ pathname }: { pathname: string }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLUListElement>(null);
    const moreActive = PUBLIC_DESKTOP_MORE_NAV.some((item) => isNavItemActive(item, pathname));

    // Close when the route changes
    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!open) return;
        // Focus the first item when opened
        menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
            setOpen(false);
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                setOpen(false);
                buttonRef.current?.focus();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open]);

    const handleMenuKeyDown = (e: ReactKeyboardEvent<HTMLUListElement>) => {
        const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
        const index = items.indexOf(document.activeElement as HTMLElement);
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            items[(index + 1) % items.length]?.focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            items[(index - 1 + items.length) % items.length]?.focus();
        } else if (e.key === 'Home') {
            e.preventDefault();
            items[0]?.focus();
        } else if (e.key === 'End') {
            e.preventDefault();
            items[items.length - 1]?.focus();
        } else if (e.key === 'Tab') {
            setOpen(false);
        }
    };

    return (
        <div className="relative h-full flex items-center">
            <button
                ref={buttonRef}
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls="public-more-menu"
                onClick={() => setOpen((v) => !v)}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' && !open) {
                        e.preventDefault();
                        setOpen(true);
                    }
                }}
                className={clsx(
                    'inline-flex items-center gap-1 h-full px-1 text-sm font-medium border-b-2 motion-safe:transition-colors',
                    focusRing,
                    moreActive
                        ? 'text-navy dark:text-navy-tint border-navy dark:border-navy-tint'
                        : 'text-black/72 dark:text-white/72 border-transparent hover:text-navy dark:hover:text-navy-tint'
                )}
            >
                {t('nav.more')}
                <CaretDown
                    size={16}
                    aria-hidden="true"
                    className={clsx('motion-safe:transition-transform', open && 'rotate-180')}
                />
            </button>

            {open && (
                <ul
                    ref={menuRef}
                    id="public-more-menu"
                    role="menu"
                    aria-label={t('nav.more')}
                    onKeyDown={handleMenuKeyDown}
                    className="absolute right-0 top-full mt-1 min-w-[200px] p-1 bg-white dark:bg-deep-navy border border-black/10 dark:border-white/12 rounded-[10px] shadow-md motion-safe:animate-fade-in"
                >
                    {PUBLIC_DESKTOP_MORE_NAV.map((item) => {
                        const active = isNavItemActive(item, pathname);
                        const Icon = item.icon;
                        return (
                            <li key={item.key} role="none">
                                <Link
                                    to={item.to}
                                    role="menuitem"
                                    aria-current={active ? 'page' : undefined}
                                    onClick={() => setOpen(false)}
                                    className={clsx(
                                        'flex items-center gap-3 min-h-[44px] px-3 rounded-[8px] text-sm font-medium motion-safe:transition-colors',
                                        focusRing,
                                        active
                                            ? 'text-navy dark:text-navy-tint bg-navy/[0.08] dark:bg-navy-tint/12'
                                            : 'text-black/90 dark:text-white/92 hover:bg-black/4 dark:hover:bg-white/6'
                                    )}
                                >
                                    <Icon size={20} weight={active ? 'fill' : 'duotone'} aria-hidden="true" />
                                    {t(item.labelKey)}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

export default function PublicLayout() {
    const { t, i18n } = useTranslation();
    const effectiveTheme = useEffectiveTheme();
    const logoSrc = effectiveTheme === 'dark' ? '/athleticaos-logo-dark-x2.png' : '/athleticaos-logo-primary-x2.png';
    const location = useLocation();
    const navigate = useNavigate();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const partnerNames = PARTNERS.map((p) => p.name).join(', ');

    const currentLang = i18n.language && i18n.language.startsWith('ms') ? 'ms' : 'en';

    const brandParts = SITE_NAME.split(' ');
    const brandMain = brandParts.slice(0, -1).join(' ') || SITE_NAME;
    const brandSuffix = brandParts.length > 1 ? brandParts[brandParts.length - 1] : '';

    const auth = isAuthenticated
        ? { label: t('nav.dashboard'), to: '/dashboard', icon: SquaresFour }
        : { label: t('nav.signIn'), to: '/login', icon: SignIn };
    const AuthIcon = auth.icon;

    const detailParent = getDetailParent(location.pathname);
    const handleBack = () => {
        if (!detailParent) return;
        // 'default' means this is the first entry in the session (deep link): go to the parent instead
        if (location.key !== 'default') {
            navigate(-1);
        } else {
            navigate(detailParent.to);
        }
    };

    // < lg: hide the top bar while scrolling down, show it again on any scroll up
    const [isHeaderHidden, setIsHeaderHidden] = useState(false);
    useEffect(() => {
        let lastY = window.scrollY;
        const onScroll = () => {
            const y = window.scrollY;
            if (y < 64) setIsHeaderHidden(false);
            else if (y - lastY > 8) setIsHeaderHidden(true);
            else if (lastY - y > 8) setIsHeaderHidden(false);
            else return;
            lastY = y;
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);
    useEffect(() => setIsHeaderHidden(false), [location.pathname]);

    const isAccessoryLive = useIsPublicAccessoryLive();
    // Probe once per mount: isMotionAllowed() creates a WebGL context to test support
    const [isAnimatedBgOn] = useState(() => isAnimatedBackgroundFlagEnabled() && isMotionAllowed());

    // < lg: bottom padding clears the floating tab bar + accessory + safe area + 16px clearance
    // so the footer stays fully visible. To prevent CLS on all public pages, --public-bottom-chrome
    // reserves the constant 140px clearance. A separate --journey-bottom-chrome preserves the exact
    // dynamic clearance for the JourneyOverlay phone phase card.
    const staticBottomChrome = 'calc(140px + max(12px, env(safe-area-inset-bottom, 0px)))';
    const journeyBottomChrome = isAccessoryLive
        ? 'calc(140px + max(12px, env(safe-area-inset-bottom, 0px)))'
        : 'calc(80px + max(12px, env(safe-area-inset-bottom, 0px)))';

    // The phone top bar hides on scroll (< lg). Downstream sticky strips track this offset
    // (bar height: 4rem + 1px top and bottom border + safe area).
    const headerOffset = isHeaderHidden
        ? '0px'
        : 'calc(4rem + 2px + env(safe-area-inset-top, 0px))';

    return (
        <div
            data-animated-bg={isAnimatedBgOn ? 'on' : 'off'}
            className="min-h-[100dvh] bg-background motion-safe:transition-colors motion-safe:duration-300 relative pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] pb-[var(--public-bottom-chrome)] lg:pb-0"
            style={{
                '--public-bottom-chrome': staticBottomChrome,
                '--journey-bottom-chrome': journeyBottomChrome,
                '--public-header-offset': headerOffset,
            } as React.CSSProperties}
        >
            {/* Global Background */}
            <AppBackground />

            {/* New visits open at the top; Back/Forward restore the position saved for that
                history entry. Same-page search-param changes opt out via preventScrollReset. */}
            <ScrollRestoration />
            <ScrollToTopOnNavigate />

            <EnvironmentRibbon />

            {/* Top bar: sticky on every size; on phones it slides away while scrolling down */}
            <header
                className={clsx(
                    'print:hidden glass sticky top-0 z-50 pt-[env(safe-area-inset-top,0px)] motion-safe:transition-transform motion-safe:duration-200 lg:translate-y-0 focus-within:translate-y-0',
                    isHeaderHidden && '-translate-y-full'
                )}
            >
                <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:rounded-[10px] focus:bg-navy focus:text-white focus:text-sm focus:font-medium focus:outline-none focus:ring-2 focus:ring-navy-tint"
                >
                    {t('nav.skipToContent')}
                </a>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between gap-4 h-16">
                        {/* Logo */}
                        <Link to="/" className={clsx('flex items-center gap-2 sm:gap-3 shrink-0 min-w-0 rounded-[10px]', focusRing)}>
                            <img
                                src={logoSrc}
                                alt="AthleticaOS Logo"
                                className="h-9 sm:h-10 w-auto object-contain shrink-0"
                            />
                            <span className="text-lg font-bold text-black dark:text-white leading-none whitespace-nowrap">
                                {brandMain}
                                {brandSuffix && (
                                    <span className="text-navy dark:text-navy-tint ml-1">
                                        {brandSuffix}
                                    </span>
                                )}
                            </span>
                        </Link>

                        {/* Desktop / large tablet (≥ lg) */}
                        <div className="hidden lg:flex items-center gap-3 xl:gap-6 h-full">
                            <nav aria-label={t('nav.primaryNav')} className="h-full">
                                <ul className="flex items-center gap-4 xl:gap-6 h-full">
                                    {PUBLIC_DESKTOP_PRIMARY_NAV.map((item) => {
                                        const active = isNavItemActive(item, location.pathname);
                                        return (
                                            <li key={item.key} className="h-full">
                                                <Link
                                                    to={item.to}
                                                    aria-current={active ? 'page' : undefined}
                                                    className={clsx(
                                                        'inline-flex items-center h-full px-1 text-sm font-medium border-b-2 motion-safe:transition-colors whitespace-nowrap',
                                                        focusRing,
                                                        active
                                                            ? 'text-navy dark:text-navy-tint border-navy dark:border-navy-tint'
                                                            : 'text-black/72 dark:text-white/72 border-transparent hover:text-navy dark:hover:text-navy-tint'
                                                    )}
                                                >
                                                    {item.tabLabelKey ? (
                                                        <>
                                                            <span className="hidden xl:inline">{t(item.labelKey)}</span>
                                                            <span className="xl:hidden">{t(item.tabLabelKey)}</span>
                                                        </>
                                                    ) : (
                                                        <span>{t(item.labelKey)}</span>
                                                    )}
                                                </Link>
                                            </li>
                                        );
                                    })}
                                    <li className="h-full">
                                        <DesktopMoreMenu pathname={location.pathname} />
                                    </li>
                                </ul>
                            </nav>
                            <LanguageSwitch />
                            <PublicThemeToggle />
                            <Button variant="secondary" size="sm" onClick={() => navigate(auth.to)}>
                                {auth.label}
                            </Button>
                        </div>

                        {/* Phones / portrait tablets (< lg): sign-in icon only; primary nav is in the bottom bar */}
                        <Link
                            to={auth.to}
                            aria-label={auth.label}
                            className={clsx(
                                'lg:hidden inline-flex items-center justify-center w-11 h-11 -mr-2 rounded-[10px] text-black/72 dark:text-white/72 hover:text-navy dark:hover:text-navy-tint hover:bg-black/4 dark:hover:bg-white/6 motion-safe:transition-colors',
                                focusRing
                            )}
                        >
                            <AuthIcon size={24} aria-hidden="true" />
                        </Link>
                    </div>
                </div>
            </header>

            {/* Back row on detail pages (< lg only). Scrolls with the page; desktop keeps breadcrumbs. */}
            {detailParent && (
                <div className="print:hidden lg:hidden relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-2">
                    <button
                        type="button"
                        onClick={handleBack}
                        className={clsx(
                            'inline-flex items-center gap-2 min-h-[44px] -ml-2 px-2 rounded-[10px] text-sm font-medium text-black/72 dark:text-white/72 hover:text-navy dark:hover:text-navy-tint motion-safe:transition-colors',
                            focusRing
                        )}
                    >
                        <ArrowLeft size={20} aria-hidden="true" />
                        {t(detailParent.labelKey)}
                    </button>
                </div>
            )}

            {/* Main Content (relative z-10 keeps it above the fixed z-0 AppBackground) */}
            <main
                id="main-content"
                tabIndex={-1}
                className={clsx(
                    'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 relative z-10 outline-none',
                    'min-h-[calc(100vh-4rem)] min-h-[calc(100dvh-4rem-env(safe-area-inset-top,0px))]',
                    detailParent && 'pt-2 lg:pt-8'
                )}
            >
                <Suspense fallback={<PageLoader />}>
                    <Outlet />
                </Suspense>
            </main>

            {/* Footer */}
            <footer className="mt-16 border-t border-black/10 dark:border-white/12 bg-white/50 dark:bg-deep-navy/50 relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-sm text-black/72 dark:text-white/72 text-center md:text-left">
                            <p className="font-semibold text-black dark:text-white mb-1">
                                {SITE_NAME}
                            </p>
                            {SHOW_OWNER && (
                                <p className="text-xs mb-1">
                                    {t('footer.ownedBy', { name: OWNER_NAME })}
                                </p>
                            )}
                            {partnerNames && (
                                <p className="text-xs">
                                    {t('footer.inPartnershipWith', { partners: partnerNames })}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-x-5 md:gap-x-6 gap-y-0 text-sm font-medium text-black/72 dark:text-white/72">
                            <Link to="/how-it-works" className={footerLink}>{t('nav.about')}</Link>
                            <Link to="/journey" className={footerLink}>{t('nav.journey')}</Link>
                            <Link to="/contact" className={footerLink}>{t('nav.contact')}</Link>
                            <Link to="/partners" className={footerLink}>{t('nav.partners')}</Link>
                            <Link to="/privacy" className={footerLink}>{t('nav.privacy')}</Link>
                            <Link to="/terms" className={footerLink}>{t('nav.terms')}</Link>
                            <Link to="/data-requests" className={footerLink}>{t('nav.dataRequests')}</Link>
                            <Link to={auth.to} className={footerLink}>{auth.label}</Link>
                        </div>

                        <div className="text-xs text-black/72 dark:text-white/72 flex flex-col items-center md:items-end gap-2">
                            {/* Language link pair */}
                            <div className="flex items-center gap-1.5 text-xs text-black/72 dark:text-white/72" aria-label={t('language.label')}>
                                <button
                                    type="button"
                                    onClick={() => void changeLanguage('en')}
                                    className={clsx(
                                        'min-h-[44px] px-1 hover:text-navy dark:hover:text-navy-tint transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-navy-tint rounded-sm',
                                        currentLang === 'en' ? 'font-bold text-navy dark:text-navy-tint' : 'text-black/72 dark:text-white/72'
                                    )}
                                    aria-pressed={currentLang === 'en'}
                                >
                                    English
                                </button>
                                <span aria-hidden="true" className="opacity-50">·</span>
                                <button
                                    type="button"
                                    onClick={() => void changeLanguage('ms')}
                                    className={clsx(
                                        'min-h-[44px] px-1 hover:text-navy dark:hover:text-navy-tint transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-navy-tint rounded-sm',
                                        currentLang === 'ms' ? 'font-bold text-navy dark:text-navy-tint' : 'text-black/72 dark:text-white/72'
                                    )}
                                    aria-pressed={currentLang === 'ms'}
                                >
                                    Bahasa Melayu
                                </button>
                            </div>
                            <p>{t('footer.copyright', { year: new Date().getFullYear(), holder: COPYRIGHT_HOLDER })}</p>
                            {import.meta.env.VITE_ENV !== 'production' && (
                                <p className="opacity-70 font-mono text-xs">v{import.meta.env.VITE_GIT_SHA || 'dev'}</p>
                            )}
                        </div>
                    </div>
                </div>
            </footer>

            {/* Phones / portrait tablets: floating glass tab bar */}
            <PublicTabBar />
        </div>
    );
}
