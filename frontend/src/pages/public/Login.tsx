import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuthStore } from '@/store/auth.store';
import { SocialButtons } from '@/components/SocialButtons';
import { useEffectiveTheme } from '@/hooks/useEffectiveTheme';

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ─── Access Gate Constants ────────────────────────────────────────────
const ACCESS_CODE = import.meta.env.VITE_ADMIN_ACCESS_CODE || 'AOS3R26ADMINDev';
const ENV = import.meta.env.VITE_ENV || 'development';
const SESSION_KEY = 'aos_access_granted';

/**
 * Check if the access gate should be bypassed via URL parameter.
 * Dev uses ?devkey=, Staging uses ?stgkey= — cross-env params are silently ignored.
 */
function checkSecretUrlBypass(searchParams: URLSearchParams): boolean {
    if (ENV === 'staging') {
        const stgKey = searchParams.get('stgkey');
        return stgKey === ACCESS_CODE;
    } else {
        // Dev / local / any non-staging
        const devKey = searchParams.get('devkey');
        return devKey === ACCESS_CODE;
    }
}

// ─── Access Gate Component ────────────────────────────────────────────
const AccessGate = ({ onGranted }: { onGranted: () => void }) => {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [attempts, setAttempts] = useState(0);
    const effectiveTheme = useEffectiveTheme();
    const logoSrc = effectiveTheme === 'dark' ? '/athleticaos-logo-hq-secondary.png' : '/athleticaos-logo-hq-first.png';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (code === ACCESS_CODE) {
            sessionStorage.setItem(SESSION_KEY, 'true');
            onGranted();
        } else {
            setAttempts(prev => prev + 1);
            setError(attempts >= 2 ? 'Access denied. Contact your administrator.' : 'Invalid access code');
            setCode('');
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-white dark:bg-gray-950">
            {/* Left Side - Access Gate Form */}
            <div className="flex-1 flex items-center justify-center p-8 lg:p-12 xl:p-24 bg-white dark:bg-gray-950 relative z-10">
                <div className="w-full max-w-sm space-y-8">
                    {/* Header */}
                    <div className="flex flex-row items-center justify-center gap-5">
                        <img
                            src={logoSrc}
                            alt="AthleticaOS"
                            className="h-20 w-auto object-contain shrink-0"
                        />
                        <div className="flex flex-col items-start text-left">
                            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white leading-none">
                                Restricted
                            </h2>
                            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 font-medium">
                                Authorized access only
                            </p>
                        </div>
                    </div>

                    {/* Security Icon */}
                    <div className="flex justify-center">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-800/50">
                            <svg className="w-10 h-10 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="text-center">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Enter your access code to continue
                            </p>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100 dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/20 text-center">
                                {error}
                            </div>
                        )}

                        <input
                            type="password"
                            value={code}
                            onChange={(e) => { setCode(e.target.value); setError(''); }}
                            placeholder="Access Code"
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-lg p-3 outline-none transition-all text-center tracking-widest font-mono"
                            autoFocus
                            disabled={attempts >= 5}
                        />

                        <button
                            type="submit"
                            disabled={!code.trim() || attempts >= 5}
                            className="w-full py-3 bg-[#6366f1] hover:bg-[#5558dd] disabled:bg-gray-300 disabled:dark:bg-gray-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-md shadow-indigo-500/20 transition-all"
                        >
                            {attempts >= 5 ? 'Access Locked' : 'Verify Access'}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-xs text-gray-400 dark:text-gray-600">
                        <p>This area is restricted to authorized administrators.</p>
                        <p className="mt-1">If you believe this is an error, contact your system admin.</p>
                    </div>
                </div>
            </div>

            {/* Right Side - Abstract Art (same as login) */}
            <div className="hidden lg:flex flex-1 relative bg-white dark:bg-gray-950 overflow-hidden items-center justify-center p-12">
                <img
                    src={effectiveTheme === 'dark' ? '/athleticaos-bg-dark-new.png' : '/athleticaos-bg-light-new.png'}
                    alt="AthleticaOS Background"
                    className="absolute inset-0 w-full h-full object-cover"
                />

                <div className="relative z-20 max-w-lg text-right">
                    <h2 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white leading-[1.1]">
                        Secured by<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                            AthleticaOS
                        </span>
                    </h2>
                    <p className="mt-6 text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-md ml-auto">
                        Multi-layered security protecting your rugby management platform.
                    </p>
                </div>
            </div>
        </div>
    );
};

// ─── Main Login Component ─────────────────────────────────────────────
export const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { login } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [lockoutMessage, setLockoutMessage] = useState('');

    // ─── Access Gate State ────────────────────────────────────────────
    const [accessGranted, setAccessGranted] = useState(
        ENV === 'production' || sessionStorage.getItem(SESSION_KEY) === 'true'
    );

    useEffect(() => {
        if (ENV === 'production') {
            setAccessGranted(true);
            return;
        }

        // Check session first (gate was already passed in this tab session)
        if (sessionStorage.getItem(SESSION_KEY) === 'true') {
            setAccessGranted(true);
            return;
        }

        // Check secret URL parameter bypass
        if (checkSecretUrlBypass(searchParams)) {
            sessionStorage.setItem(SESSION_KEY, 'true');
            setAccessGranted(true);
        }
    }, [searchParams]);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormData) => {
        try {
            setIsLoading(true);
            setLockoutMessage('');
            await login(data);

            // Get role-based default route
            const defaultRoute = useAuthStore.getState().getDefaultRoute();

            // Redirect to the page they tried to visit or role-based default
            const state = location.state as { from?: { pathname: string } } | null;
            const from = state?.from?.pathname || defaultRoute;
            navigate(from, { replace: true });
        } catch (err: unknown) {
            // Check for 423 Locked response (brute-force lockout)
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as { response?: { status?: number; data?: { message?: string; remainingMinutes?: number } } };
                if (axiosErr.response?.status === 423) {
                    const minutes = axiosErr.response.data?.remainingMinutes || 15;
                    setLockoutMessage(`Too many failed attempts. Please try again in ${minutes} minute(s).`);
                }
            }
            // Other errors are handled by toast in the store
        } finally {
            setIsLoading(false);
        }
    };

    const effectiveTheme = useEffectiveTheme();
    const logoSrc = effectiveTheme === 'dark' ? '/athleticaos-logo-hq-secondary.png' : '/athleticaos-logo-hq-first.png';
    const bgSrc = effectiveTheme === 'dark' ? '/athleticaos-bg-dark-new.png' : '/athleticaos-bg-light-new.png';

    // ─── Show Access Gate if not yet granted ──────────────────────────
    if (!accessGranted) {
        return <AccessGate onGranted={() => setAccessGranted(true)} />;
    }

    // ─── Login Form (shown after access gate is passed) ───────────────
    return (
        <div className="min-h-screen w-full flex bg-white dark:bg-gray-950">
            {/* Left Side - Form */}
            <div className="flex-1 flex items-center justify-center p-8 lg:p-12 xl:p-24 bg-white dark:bg-gray-950 relative z-10">
                <div className="w-full max-w-sm space-y-8">
                    {/* Header Section - Side by Side Centered */}
                    <div className="flex flex-row items-center justify-center gap-5">
                        <img
                            src={logoSrc}
                            alt="AthleticaOS"
                            className="h-20 w-auto object-contain shrink-0"
                        />
                        <div className="flex flex-col items-start text-left">
                            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white leading-none">
                                Login
                            </h2>
                            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 font-medium">
                                Or sign in with email
                            </p>
                        </div>
                    </div>

                    {/* Social Login Section */}
                    <div className="mt-6">
                        <SocialButtons />
                    </div>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-200 dark:border-gray-800" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white dark:bg-gray-950 px-2 text-gray-500 dark:text-gray-400">Or continue with</span>
                        </div>
                    </div>

                    {/* Lockout Warning */}
                    {lockoutMessage && (
                        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 text-center">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <span className="text-sm font-semibold text-red-600 dark:text-red-400">Account Locked</span>
                            </div>
                            <p className="text-sm text-red-600 dark:text-red-400">{lockoutMessage}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <div className="space-y-1">
                            <Input
                                type="email"
                                placeholder="Email"
                                error={errors.email?.message}
                                {...register('email')}
                                className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-900 focus:border-purple-500 focus:ring-purple-500 rounded-lg p-3"
                                disabled={!!lockoutMessage}
                            />
                        </div>

                        <div className="space-y-1">
                            <Input
                                type="password"
                                placeholder="Password"
                                error={errors.password?.message}
                                {...register('password')}
                                className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-900 focus:border-purple-500 focus:ring-purple-500 rounded-lg p-3"
                                disabled={!!lockoutMessage}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-purple-600 focus:ring-purple-500 bg-white dark:bg-gray-900" />
                                Keep me logged in
                            </label>
                            <Link to="/forgot-password" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500">
                                Forgot password?
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            className="w-full py-3 bg-[#6366f1] hover:bg-[#5558dd] text-white font-semibold rounded-lg shadow-md shadow-indigo-500/20 transition-all"
                            isLoading={isLoading}
                            disabled={!!lockoutMessage}
                        >
                            Login
                        </Button>
                    </form>

                    <div className="mt-8 text-center text-xs text-gray-400 dark:text-gray-600">
                        Authorized personnel only
                    </div>
                </div>
            </div>

            {/* Right Side - Abstract Art */}
            <div className="hidden lg:flex flex-1 relative bg-white dark:bg-gray-950 overflow-hidden items-center justify-center p-12">
                <img
                    src={bgSrc}
                    alt="AthleticaOS Background"
                    className="absolute inset-0 w-full h-full object-cover"
                />


                <div className="relative z-20 max-w-lg text-right">
                    <h2 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white leading-[1.1]">
                        Changing the way<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-blue-600">
                            the world plays
                        </span>
                    </h2>
                    <p className="mt-6 text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-md ml-auto">
                        Experience the future of rugby management with AthleticaOS.
                        Streamlined, powerful, and built for champions.
                    </p>

                    {/* Decorative subtle grid or dots */}
                    <div className="absolute top-[-40px] right-[-20px] w-24 h-24 opacity-20 bg-dot-pattern dark:bg-dot-pattern-white">
                    </div>
                </div>
            </div>
        </div>
    );
};
