import { Suspense, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { List, X } from '@phosphor-icons/react';
import { TournamentPill } from '@/components/TournamentPill';
import { useEffectiveTheme } from '@/hooks/useEffectiveTheme';
import { AppBackground } from '@/components/public/AppBackground';
import { PageLoader } from '@/components/PageLoader';
import { clsx } from 'clsx';

export default function PublicLayout() {
    const effectiveTheme = useEffectiveTheme();
    const logoSrc = effectiveTheme === 'dark' ? '/athleticaos-logo-hq-secondary.png' : '/athleticaos-logo-hq-first.png';
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();

    // Hide Tournament Pill on Match Details pages (e.g. /matches/...)
    const shouldShowTournamentPill = !location.pathname.startsWith('/matches/');

    const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

    return (
        <div className="min-h-screen bg-background transition-colors duration-300 relative">
            {/* Global Background */}
            <AppBackground />

            {/* Top Navigation */}
            <nav
                className="backdrop-blur-nav sticky top-0 z-50 bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/50 dark:border-slate-700/50"
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
                                <span className="text-lg font-bold text-slate-900 dark:text-white leading-none">
                                    AthleticaOS
                                </span>
                                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                    Rugby Malaysia
                                </span>
                            </div>
                        </Link>

                        {/* Desktop Navigation Links */}
                        <div className="hidden md:flex items-center gap-6">
                            <Link
                                to="/tournaments"
                                className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                                Tournaments
                            </Link>
                            <Link
                                to="/teams"
                                className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                                Teams
                            </Link>
                            <Link
                                to="/players"
                                className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                                Players
                            </Link>
                            <Link
                                to="/how-it-works"
                                className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                                How It Works
                            </Link>
                            <Link
                                to="/sponsors"
                                className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                                Sponsors
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden p-2 text-slate-600 dark:text-slate-300"
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
                        className="backdrop-blur-menu md:hidden bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-700 absolute top-16 left-0 right-0 p-4 space-y-4 shadow-xl z-40 animate-in slide-in-from-top-4 duration-200"
                    >
                        <Link
                            to="/tournaments"
                            className="block text-base font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 py-2 border-b border-slate-100 dark:border-white/5"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Tournaments
                        </Link>
                        <Link
                            to="/teams"
                            className="block text-base font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 py-2 border-b border-slate-100 dark:border-white/5"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Teams
                        </Link>
                        <Link
                            to="/players"
                            className="block text-base font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 py-2 border-b border-slate-100 dark:border-white/5"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Players
                        </Link>
                        <Link
                            to="/how-it-works"
                            className="block text-base font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 py-2 border-b border-slate-100 dark:border-white/5"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            How It Works
                        </Link>
                        <Link
                            to="/sponsors"
                            className="block text-base font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 py-2 border-b border-slate-100 dark:border-white/5"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Sponsors
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
            <footer className="mt-16 border-t border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl relative z-10 mb-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                            <p className="font-semibold text-slate-900 dark:text-white mb-1">
                                Powered by AthleticaOS Rugby
                            </p>
                            <p className="text-xs">
                                Powered by Ragbi Online and Infiniteous Creative
                            </p>
                        </div>

                        <div className="flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
                            <Link to="/how-it-works" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">About</Link>
                            <Link to="/contact" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Contact</Link>
                            <Link to="/sponsors" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Sponsors</Link>
                        </div>

                        <div className="text-xs text-slate-500 dark:text-slate-500 flex flex-col items-end">
                            <p>© {new Date().getFullYear()} Malaysia Rugby. All rights reserved.</p>
                            <p className="mt-1 opacity-50 font-mono text-[10px]">v{import.meta.env.VITE_GIT_SHA || 'dev'}</p>
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
