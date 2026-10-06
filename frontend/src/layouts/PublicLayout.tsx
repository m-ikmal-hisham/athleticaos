import { Suspense, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { List, X } from '@phosphor-icons/react';
import { TournamentPill } from '@/components/TournamentPill';
import { useEffectiveTheme } from '@/hooks/useEffectiveTheme';
import { AppBackground } from '@/components/public/AppBackground';
import { PageLoader } from '@/components/PageLoader';
import { clsx } from 'clsx';
import { SITE_NAME, COPYRIGHT_HOLDER, OWNER_NAME, SHOW_OWNER } from '@/config/site';
import { PARTNERS } from '@/config/partners';

export default function PublicLayout() {
    const effectiveTheme = useEffectiveTheme();
    const logoSrc = effectiveTheme === 'dark' ? '/athleticaos-logo-dark-x2.png' : '/athleticaos-logo-primary-x2.png';
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();
    const partnerNames = PARTNERS.map((p) => p.name).join(', ');

    // Hide Tournament Pill on Match Details pages (e.g. /matches/...)
    const shouldShowTournamentPill = !location.pathname.startsWith('/matches/');

    const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

    return (
        <div className="min-h-screen bg-background transition-colors duration-300 relative">
            {/* Global Background */}
            <AppBackground />

            {/* Top Navigation */}
            <nav
                className="backdrop-blur-nav sticky top-0 z-50 bg-white/70 dark:bg-deep-navy/70 border-b border-black/10 dark:border-white/12"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-3 group" onClick={() => setMobileMenuOpen(false)}>
                            <img
                                src={logoSrc}
                                alt="AthleticaOS Logo"
                                className="h-10 w-auto object-contain"
                            />
                            <div className="flex flex-col">
                                <span className="text-lg font-bold text-black dark:text-white leading-none">
                                    AthleticaOS
                                </span>
                                <span className="text-xs text-black/70 dark:text-white/70 font-medium">
                                    Rugby Malaysia
                                </span>
                            </div>
                        </Link>

                        {/* Desktop Navigation Links */}
                        <div className="hidden md:flex items-center gap-6">
                            <Link
                                to="/tournaments"
                                className="text-sm font-medium text-black/70 dark:text-white/70 hover:text-navy dark:hover:text-navy-tint transition-colors"
                            >
                                Tournaments
                            </Link>
                            <Link
                                to="/teams"
                                className="text-sm font-medium text-black/70 dark:text-white/70 hover:text-navy dark:hover:text-navy-tint transition-colors"
                            >
                                Teams
                            </Link>
                            <Link
                                to="/players"
                                className="text-sm font-medium text-black/70 dark:text-white/70 hover:text-navy dark:hover:text-navy-tint transition-colors"
                            >
                                Players
                            </Link>
                            <Link
                                to="/how-it-works"
                                className="text-sm font-medium text-black/70 dark:text-white/70 hover:text-navy dark:hover:text-navy-tint transition-colors"
                            >
                                How It Works
                            </Link>
                            <Link
                                to="/partners"
                                className="text-sm font-medium text-black/70 dark:text-white/70 hover:text-navy dark:hover:text-navy-tint transition-colors"
                            >
                                Partners
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden p-2 text-black/70 dark:text-white/70"
                            onClick={toggleMobileMenu}
                            aria-label="Toggle menu"
                        >
                            {mobileMenuOpen ? (
                                <X className="w-6 h-6" />
                            ) : (
                                <List className="w-6 h-6" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                {mobileMenuOpen && (
                    <div
                        className="backdrop-blur-menu md:hidden bg-white/95 dark:bg-deep-navy/95 border-b border-black/10 dark:border-white/12 absolute top-16 left-0 right-0 p-4 space-y-4 shadow-xl z-40 animate-in slide-in-from-top-4 duration-200"
                    >
                        <Link
                            to="/tournaments"
                            className="block text-base font-medium text-black/70 dark:text-white/70 hover:text-navy dark:hover:text-navy-tint py-2 border-b border-black/10 dark:border-white/12"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Tournaments
                        </Link>
                        <Link
                            to="/teams"
                            className="block text-base font-medium text-black/70 dark:text-white/70 hover:text-navy dark:hover:text-navy-tint py-2 border-b border-black/10 dark:border-white/12"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Teams
                        </Link>
                        <Link
                            to="/players"
                            className="block text-base font-medium text-black/70 dark:text-white/70 hover:text-navy dark:hover:text-navy-tint py-2 border-b border-black/10 dark:border-white/12"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Players
                        </Link>
                        <Link
                            to="/how-it-works"
                            className="block text-base font-medium text-black/70 dark:text-white/70 hover:text-navy dark:hover:text-navy-tint py-2 border-b border-black/10 dark:border-white/12"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            How It Works
                        </Link>
                        <Link
                            to="/partners"
                            className="block text-base font-medium text-black/70 dark:text-white/70 hover:text-navy dark:hover:text-navy-tint py-2 border-b border-black/10 dark:border-white/12"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Partners
                        </Link>
                    </div>
                )}
            </nav>

            {/* Main Content - pb-28 ensures content isn't hidden behind the fixed TournamentPill on mobile */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 relative z-10">
                <Suspense fallback={<PageLoader />}>
                    <Outlet />
                </Suspense>
            </main>

            {/* Footer */}
            <footer className="mt-16 border-t border-black/10 dark:border-white/12 bg-white/50 dark:bg-deep-navy/50 relative z-10 mb-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-sm text-black/70 dark:text-white/70">
                            <p className="font-semibold text-black dark:text-white mb-1">
                                {SITE_NAME}
                            </p>
                            {SHOW_OWNER && (
                                <p className="text-xs mb-1">
                                    Owned and operated by {OWNER_NAME}
                                </p>
                            )}
                            {partnerNames && (
                                <p className="text-xs">
                                    In partnership with {partnerNames}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-6 text-sm font-medium text-black/70 dark:text-white/70">
                            <Link to="/how-it-works" className="hover:text-navy dark:hover:text-navy-tint transition-colors">About</Link>
                            <Link to="/contact" className="hover:text-navy dark:hover:text-navy-tint transition-colors">Contact</Link>
                            <Link to="/partners" className="hover:text-navy dark:hover:text-navy-tint transition-colors">Partners</Link>
                        </div>

                        <div className="text-xs text-black/70 dark:text-white/70 flex flex-col md:items-end">
                            <p>© {new Date().getFullYear()} {COPYRIGHT_HOLDER}.</p>
                            {import.meta.env.VITE_ENV !== 'production' && (
                                <p className="mt-1 opacity-70 font-mono text-xs">v{import.meta.env.VITE_GIT_SHA || 'dev'}</p>
                            )}
                        </div>
                    </div>
                </div>
            </footer>
            {/* Sticky Tournament Pill - Wide centered Floating Music Player style */}
            <div className={clsx(
                "fixed bottom-6 left-0 right-0 z-40 pointer-events-none flex justify-center transition-opacity duration-300",
                shouldShowTournamentPill ? "opacity-100" : "opacity-0 pointer-events-none"
            )}>
                <div className="pointer-events-auto w-full max-w-3xl px-6">
                    <TournamentPill />
                </div>
            </div>
        </div>
    );
}
