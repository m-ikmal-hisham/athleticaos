import { Link, Outlet } from 'react-router-dom';
import { Trophy } from 'lucide-react';

export default function PublicLayout() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            {/* Top Navigation */}
            <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/50 dark:border-slate-700/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-2 group">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 group-hover:from-blue-600 group-hover:to-blue-700 transition-all">
                                <Trophy className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg font-bold text-slate-900 dark:text-white">
                                    AthleticaOS
                                </span>
                                <span className="text-xs text-slate-600 dark:text-slate-400">
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
                                to="/dashboard"
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                            >
                                Admin Login
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="mt-16 border-t border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                            <p className="font-semibold text-slate-900 dark:text-white mb-1">
                                Powered by AthleticaOS Rugby
                            </p>
                            <p className="text-xs">
                                Powered by Ragbi Online and Infiniteous Creative
                            </p>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-500">
                            © {new Date().getFullYear()} Malaysia Rugby. All rights reserved.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
