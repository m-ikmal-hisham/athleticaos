import { Link, Outlet } from 'react-router-dom';
import { SignIn } from '@phosphor-icons/react';
import { TournamentPill } from '@/components/TournamentPill';
import { useEffectiveTheme } from '@/hooks/useEffectiveTheme';
import { AppBackground } from '@/components/public/AppBackground';

export default function PublicLayout() {
    const effectiveTheme = useEffectiveTheme();
    const logoSrc = effectiveTheme === 'dark' ? '/athleticaos-logo-hq-secondary.png' : '/athleticaos-logo-hq-first.png';

    return (
        <div className="min-h-screen bg-background transition-colors duration-300 relative">
            {/* Global Background */}
            <AppBackground />

            {/* Top Navigation */}
            <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/50 dark:border-slate-700/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-3 group">
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

                        {/* Navigation Links */}
                        <div className="flex items-center gap-6">
                            <Link
                                to="/tournaments"
                                className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                                Tournaments
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
                            <Link
                                to="/dashboard"
                                className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-[#D32F2F] dark:from-[#D32F2F] dark:to-blue-600 hover:opacity-90 rounded-lg transition-all shadow-md shadow-blue-500/20 dark:shadow-red-500/20 hover:shadow-lg"
                            >
                                <SignIn className="w-4 h-4" weight="bold" />
                                Login
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="mt-16 border-t border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl relative z-10">
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

                        <div className="text-xs text-slate-500 dark:text-slate-500">
                            © {new Date().getFullYear()} Malaysia Rugby. All rights reserved.
                        </div>
                    </div>
                </div>
            </footer>
            {/* Sticky Tournament Pill - Wide centered Floating Music Player style */}
            <div className="fixed bottom-6 left-0 right-0 z-40 pointer-events-none flex justify-center">
                <div className="pointer-events-auto w-full max-w-3xl px-6">
                    <TournamentPill />
                </div>
            </div>
        </div>
    );
}
