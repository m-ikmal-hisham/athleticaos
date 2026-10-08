import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeSlash, Info } from '@phosphor-icons/react';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuthStore } from '@/store/auth.store';
import { ForcedPasswordChange } from '@/components/auth/ForcedPasswordChange';
import { useEffectiveTheme } from '@/hooks/useEffectiveTheme';

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ─── Main Login Component ─────────────────────────────────────────────
export const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuthStore();
    const isSignedOut = new URLSearchParams(location.search).get('signedOut') === '1';
    const [isLoading, setIsLoading] = useState(false);
    const [lockoutMessage, setLockoutMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    // Set when login answers PASSWORD_CHANGE_REQUIRED; held in memory only until the change completes
    const [pendingChange, setPendingChange] = useState<{ email: string; currentPassword: string } | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    const redirectAfterLogin = () => {
        // Get role-based default route
        const defaultRoute = useAuthStore.getState().getDefaultRoute();

        // Redirect to the page they tried to visit or role-based default
        const state = location.state as { from?: { pathname: string } } | null;
        const from = state?.from?.pathname || defaultRoute;
        navigate(from, { replace: true });
    };

    const onSubmit = async (data: LoginFormData) => {
        try {
            setIsLoading(true);
            setLockoutMessage('');
            await login(data);
            redirectAfterLogin();
        } catch (err: unknown) {
            // Check for 423 Locked response (brute-force lockout)
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as { response?: { status?: number; data?: { message?: string; code?: string; remainingMinutes?: number } } };
                if (axiosErr.response?.status === 403 && axiosErr.response.data?.code === 'PASSWORD_CHANGE_REQUIRED') {
                    setPendingChange({ email: data.email, currentPassword: data.password });
                } else if (axiosErr.response?.status === 423) {
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
    const logoSrc = effectiveTheme === 'dark' ? '/athleticaos-logo-dark-x2.png' : '/athleticaos-logo-primary-x2.png';

    // ─── Forced password change (temporary / admin-set password) ──────
    if (pendingChange) {
        return (
            <ForcedPasswordChange
                email={pendingChange.email}
                currentPassword={pendingChange.currentPassword}
                onChanged={() => {
                    setPendingChange(null);
                    redirectAfterLogin();
                }}
                onCancel={() => setPendingChange(null)}
            />
        );
    }

    // ─── Login Form (shown after access gate is passed) ───────────────
    return (
        <div className="min-h-screen w-full flex bg-surface-page">
            {/* Left Side - Form */}
            <div className="flex-1 flex items-center justify-center p-8 lg:p-12 xl:p-24 bg-surface-page relative z-10">
                <div className="w-full max-w-sm space-y-8">
                    {/* Header Section - Side by Side Centered */}
                    <div className="flex flex-row items-center justify-center gap-5">
                        <img
                            src={logoSrc}
                            alt="AthleticaOS"
                            className="h-20 w-auto object-contain shrink-0"
                        />
                        <div className="flex flex-col items-start text-left">
                            <h2 className="text-3xl font-bold tracking-tight text-black dark:text-white leading-none">
                                Sign in
                            </h2>
                            <p className="mt-1.5 text-sm text-black/72 dark:text-white/72 font-medium">
                                For organisers, officials and team managers.
                            </p>
                        </div>
                    </div>

                    {/* Lockout Warning */}
                    {lockoutMessage && (
                        <div className="p-4 rounded-lg bg-crimson/10 border border-crimson/20 text-center">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <svg className="w-5 h-5 text-crimson" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <span className="text-sm font-semibold text-crimson dark:text-crimson-tint">Account Locked</span>
                            </div>
                            <p className="text-sm text-crimson dark:text-crimson-tint">{lockoutMessage}</p>
                        </div>
                    )}

                    {isSignedOut && (
                        <div className="p-3 rounded-lg bg-black/4 dark:bg-white/6 border border-black/10 dark:border-white/12 flex items-center gap-2.5 text-sm text-black/72 dark:text-white/72">
                            <Info className="w-5 h-5 shrink-0" />
                            <span>You have signed out.</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <div className="space-y-1">
                            <Input
                                type="email"
                                placeholder="Email"
                                error={errors.email?.message}
                                {...register('email')}
                                className="bg-black/4 dark:bg-white/6 border-black/24 dark:border-white/28 text-black/90 dark:text-white/92 placeholder:text-black/60 dark:placeholder:text-white/60 focus:bg-white dark:focus:bg-deep-navy focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-navy-tint rounded-[10px] min-h-[44px] text-base sm:text-sm p-3"
                                disabled={!!lockoutMessage}
                            />
                        </div>

                        <div className="space-y-1">
                            {/* Error is rendered below the wrapper so the toggle stays centred on the input */}
                            <div className="relative">
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Password"
                                    autoComplete="current-password"
                                    {...register('password')}
                                    aria-invalid={!!errors.password}
                                    className={`bg-black/4 dark:bg-white/6 text-black/90 dark:text-white/92 placeholder:text-black/60 dark:placeholder:text-white/60 focus:bg-white dark:focus:bg-deep-navy rounded-[10px] min-h-[44px] text-base sm:text-sm p-3 pr-11 ${errors.password ? 'border-crimson dark:border-crimson-tint focus-visible:ring-crimson' : 'border-black/24 dark:border-white/28 focus-visible:ring-navy dark:focus-visible:ring-navy-tint'}`}
                                    disabled={!!lockoutMessage}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    aria-pressed={showPassword}
                                    disabled={!!lockoutMessage}
                                    className="absolute inset-y-0 right-0 flex items-center px-3 text-black/60 hover:text-black/90 dark:text-white/60 dark:hover:text-white/92 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {showPassword ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {errors.password?.message && (
                                <p className="mt-1.5 text-xs text-crimson dark:text-crimson-tint">{errors.password.message}</p>
                            )}
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm text-black/72 dark:text-white/72 cursor-pointer select-none">
                                <input type="checkbox" className="w-4 h-4 rounded border-black/24 dark:border-white/28 accent-navy bg-white dark:bg-deep-navy cursor-pointer" />
                                Keep me logged in
                            </label>
                            <Link to="/forgot-password" className="text-sm font-medium text-navy dark:text-navy-tint hover:underline">
                                Forgot password?
                            </Link>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="secondary"
                                className="w-1/3 py-3"
                                onClick={() => navigate('/')}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                className="flex-1 py-3"
                                isLoading={isLoading}
                                disabled={!!lockoutMessage}
                            >
                                Sign in
                            </Button>
                        </div>
                    </form>

                    <div className="mt-8 text-center text-xs text-black/60 dark:text-white/60">
                        Need an account for your organisation?{' '}
                        <Link to="/contact?subject=ORGANISATION_REGISTRATION" className="text-navy dark:text-navy-tint hover:underline font-medium">
                            Register your interest
                        </Link>
                    </div>
                </div>
            </div>

            {/* Right Side - Solid Deep Navy in dark, subtle graphic */}
            <div className="hidden lg:flex flex-1 relative bg-white dark:bg-deep-navy overflow-hidden items-center justify-center p-12">
                <img
                    src="/athleticaos-bg-light-new.png"
                    alt="AthleticaOS Background"
                    className="absolute inset-0 w-full h-full object-cover opacity-100 dark:opacity-[0.08]"
                />

                <div className="relative z-20 max-w-lg text-right">
                    <h2 className="text-5xl font-bold tracking-tight text-black dark:text-white leading-[1.1]">
                        Run your competitions<br />
                        <span className="text-navy dark:text-navy-tint">
                            in one place
                        </span>
                    </h2>
                    <p className="mt-6 text-lg text-black/72 dark:text-white/72 leading-relaxed max-w-md ml-auto">
                        Fixtures, scoring, rosters and results for Malaysian rugby.
                    </p>
                </div>
            </div>
        </div>
    );
};
