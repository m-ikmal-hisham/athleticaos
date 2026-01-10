import { AppleLogo } from "@phosphor-icons/react";

export const SocialButtons = () => {
    return (
        <div className="flex flex-col gap-3">
            <div className="relative group">
                <button
                    type="button"
                    className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-400 cursor-not-allowed opacity-75 transition-all shadow-sm"
                >
                    <div className="w-5 h-5 flex items-center justify-center opacity-60">
                        <svg viewBox="0 0 24 24" className="w-5 h-5">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.11c-.22-.66-.35-1.36-.35-2.11s.13-1.45.35-2.11V7.05H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.95l3.66-2.84z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                    </div>
                    Sign in with Google <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded text-gray-500 font-normal ml-auto">Coming Soon</span>
                </button>
            </div>

            <div className="relative group">
                <button
                    type="button"
                    className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-gray-900/10 text-gray-400 border border-transparent rounded-lg text-sm font-medium cursor-not-allowed opacity-75 transition-all shadow-sm"
                >
                    <AppleLogo weight="fill" className="w-5 h-5 opacity-60" />
                    Sign in with Apple <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded text-gray-500 font-normal ml-auto">Coming Soon</span>
                </button>
            </div>
        </div>
    );
};
