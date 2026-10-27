import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeSlash, CheckCircle, Check, X, ArrowLeft, Spinner } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { authApi } from '@/api/auth.api';
import { passwordProblem, PASSWORD_MIN_LENGTH } from '@/utils/password';
import { useEffectiveTheme } from '@/hooks/useEffectiveTheme';

interface InviteDetails {
    email: string;
    firstName: string;
    organisationName?: string;
}

export const AcceptInvite = () => {
    const { t } = useTranslation('auth');
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [token, setToken] = useState<string | null>(null);

    const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
    const [isFetchingDetails, setIsFetchingDetails] = useState(true);
    const [fetchError, setFetchError] = useState('');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const effectiveTheme = useEffectiveTheme();
    const logoSrc = effectiveTheme === 'dark' ? '/athleticaos-logo-dark-x2.png' : '/athleticaos-logo-primary-x2.png';

    useEffect(() => {
        const queryToken = searchParams.get('token');
        if (queryToken) {
            setToken(queryToken);
            // Clean token from URL bar immediately to prevent history/bookmark leakage
            window.history.replaceState({}, document.title, window.location.pathname);

            authApi.getInviteDetails(queryToken)
                .then(res => {
                    setInviteDetails(res.data);
                })
                .catch(err => {
                    const axiosErr = err as { response?: { data?: { message?: string } } };
                    setFetchError(axiosErr.response?.data?.message || t('acceptInvite.invalidOrExpired'));
                })
                .finally(() => {
                    setIsFetchingDetails(false);
                });
        } else {
            setIsFetchingDetails(false);
            setFetchError(t('acceptInvite.missingLink'));
        }
    }, [searchParams, t]);

    // Validation checks
    const hasMinLength = newPassword.length >= PASSWORD_MIN_LENGTH;
    const hasNoCommonWords = !passwordProblem(newPassword, inviteDetails?.email);
    const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            setSubmitError('Missing invitation token.');
            return;
        }

        const problem = passwordProblem(newPassword, inviteDetails?.email);
        if (problem) {
            setSubmitError(problem);
            return;
        }

        if (newPassword !== confirmPassword) {
            setSubmitError('Passwords do not match.');
            return;
        }

        try {
            setIsLoading(true);
            setSubmitError('');
            await authApi.acceptInvite({ token, newPassword });
            setIsSuccess(true);
        } catch (err: unknown) {
            const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
            // On failure (e.g. password policy or token), keep the token available for re-try
            setSubmitError(axiosErr.response?.data?.message || 'Could not complete registration. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetchingDetails) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center p-8">
                <div className="flex flex-col items-center gap-3">
                    <Spinner size={32} className="animate-spin text-navy dark:text-navy-tint" />
                    <p className="text-sm text-black/72 dark:text-white/72">{t('acceptInvite.validating')}</p>
                </div>
            </div>
        );
    }

    if (fetchError || !token) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center p-8">
                <div className="w-full max-w-sm p-6 rounded-2xl bg-black/4 dark:bg-white/6 border border-black/10 dark:border-white/12 text-center space-y-4">
                    <div className="flex justify-center text-crimson dark:text-crimson-tint">
                        <X size={44} weight="bold" />
                    </div>
                    {/* Covers expired, already used and replaced (resent) links alike. */}
                    <h2 className="text-xl font-bold text-black dark:text-white">{t('acceptInvite.invalidTitle')}</h2>
                    <p className="text-sm text-black/72 dark:text-white/72 leading-relaxed">
                        {fetchError || t('acceptInvite.invalidOrExpired')}
                    </p>
                    <p className="text-sm text-black/72 dark:text-white/72 leading-relaxed">
                        {t('acceptInvite.askAdmin')}
                    </p>
                    <div className="pt-2">
                        <Button
                            type="button"
                            variant="primary"
                            className="w-full py-3"
                            onClick={() => navigate('/login')}
                        >
                            {t('acceptInvite.backToSignIn')}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex">
            <div className="flex-1 flex items-center justify-center p-8 lg:p-12 xl:p-24 relative z-10">
                <div className="w-full max-w-sm space-y-8">
                    {/* Header */}
                    <div className="flex flex-row items-center justify-center gap-5">
                        <img
                            src={logoSrc}
                            alt="AthleticaOS Rugby"
                            className="h-20 w-auto object-contain shrink-0"
                        />
                        <div className="flex flex-col items-start text-left">
                            <h2 className="text-3xl font-bold tracking-tight text-black dark:text-white leading-none">
                                {isSuccess ? t('acceptInvite.welcome') : t('acceptInvite.join')}
                            </h2>
                            <p className="mt-1.5 text-sm text-black/72 dark:text-white/72 font-medium">
                                {t('acceptInvite.rugbySubtitle')}
                            </p>
                        </div>
                    </div>

                    {isSuccess ? (
                        <div className="space-y-6 text-center">
                            <div className="p-4 rounded-xl bg-black/4 dark:bg-white/6 border border-black/10 dark:border-white/12 space-y-3">
                                <div className="flex justify-center text-navy dark:text-navy-tint">
                                    <CheckCircle size={48} weight="duotone" />
                                </div>
                                <h3 className="text-lg font-semibold text-black dark:text-white">
                                    {t('acceptInvite.accountActivated')}
                                </h3>
                                <p className="text-sm text-black/72 dark:text-white/72 leading-relaxed">
                                    {t('acceptInvite.activatedDescription')}
                                </p>
                            </div>

                            <Button
                                type="button"
                                variant="primary"
                                className="w-full py-3"
                                onClick={() => navigate('/login')}
                            >
                                {t('login.submit')}
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Personalised greeting */}
                            <div className="p-3.5 rounded-xl bg-black/4 dark:bg-white/6 border border-black/10 dark:border-white/12 space-y-1">
                                <p className="text-sm font-semibold text-black dark:text-white">
                                    {t('acceptInvite.welcomeGreeting', { name: inviteDetails?.firstName || t('acceptInvite.welcomeGreetingFallback') })}
                                </p>
                                <p className="text-xs text-black/72 dark:text-white/72">
                                    {t('acceptInvite.setPasswordNotice')}
                                    <span className="font-semibold text-black dark:text-white">
                                        {inviteDetails?.organisationName || 'AthleticaOS Rugby'}
                                    </span>.
                                </p>
                                {inviteDetails?.email && (
                                    <p className="text-xs text-black/60 dark:text-white/60 pt-1">
                                        {t('acceptInvite.accountEmail')}<span className="font-mono">{inviteDetails.email}</span>
                                    </p>
                                )}
                            </div>

                            {submitError && (
                                <div className="p-3 rounded-lg bg-crimson/10 border border-crimson/20 text-center text-sm text-crimson dark:text-crimson-tint">
                                    {submitError}
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-black/72 dark:text-white/72">
                                    {t('acceptInvite.createPasswordLabel')}
                                </label>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder={t('acceptInvite.chooseStrongPassword')}
                                        autoComplete="new-password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="bg-black/4 dark:bg-white/6 border-black/24 dark:border-white/28 text-black/90 dark:text-white/92 placeholder:text-black/60 dark:placeholder:text-white/60 focus:bg-white dark:focus:bg-deep-navy rounded-[10px] min-h-[44px] text-base sm:text-sm p-3 pr-11"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        aria-label={showPassword ? t('acceptInvite.hidePassword') : t('acceptInvite.showPassword')}
                                        className="absolute inset-y-0 right-0 flex items-center px-3 text-black/60 hover:text-black/90 dark:text-white/60 dark:hover:text-white/92"
                                    >
                                        {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-black/72 dark:text-white/72">
                                    {t('acceptInvite.confirmPasswordLabel')}
                                </label>
                                <div className="relative">
                                    <Input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        placeholder={t('acceptInvite.retypePassword')}
                                        autoComplete="new-password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="bg-black/4 dark:bg-white/6 border-black/24 dark:border-white/28 text-black/90 dark:text-white/92 placeholder:text-black/60 dark:placeholder:text-white/60 focus:bg-white dark:focus:bg-deep-navy rounded-[10px] min-h-[44px] text-base sm:text-sm p-3 pr-11"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(v => !v)}
                                        aria-label={showConfirmPassword ? t('acceptInvite.hidePassword') : t('acceptInvite.showPassword')}
                                        className="absolute inset-y-0 right-0 flex items-center px-3 text-black/60 hover:text-black/90 dark:text-white/60 dark:hover:text-white/92"
                                    >
                                        {showConfirmPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            {/* Checklist */}
                            <div className="p-3.5 rounded-xl bg-black/4 dark:bg-white/6 border border-black/10 dark:border-white/12 space-y-2 text-xs">
                                <p className="font-semibold text-black/80 dark:text-white/80">{t('acceptInvite.passwordRequirements')}</p>
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        {hasMinLength ? (
                                            <Check size={14} className="text-navy dark:text-navy-tint shrink-0" weight="bold" />
                                        ) : (
                                            <span className="w-3.5 h-3.5 rounded-full border border-black/30 dark:border-white/30 shrink-0" />
                                        )}
                                        <span className={hasMinLength ? 'text-black dark:text-white' : 'text-black/60 dark:text-white/60'}>
                                            {t('acceptInvite.minCharacters', { count: PASSWORD_MIN_LENGTH })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {newPassword.length > 0 && hasNoCommonWords ? (
                                            <Check size={14} className="text-navy dark:text-navy-tint shrink-0" weight="bold" />
                                        ) : (
                                            <span className="w-3.5 h-3.5 rounded-full border border-black/30 dark:border-white/30 shrink-0" />
                                        )}
                                        <span className={newPassword.length > 0 && hasNoCommonWords ? 'text-black dark:text-white' : 'text-black/60 dark:text-white/60'}>
                                            {t('acceptInvite.avoidCommon')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {passwordsMatch ? (
                                            <Check size={14} className="text-navy dark:text-navy-tint shrink-0" weight="bold" />
                                        ) : (
                                            <span className="w-3.5 h-3.5 rounded-full border border-black/30 dark:border-white/30 shrink-0" />
                                        )}
                                        <span className={passwordsMatch ? 'text-black dark:text-white' : 'text-black/60 dark:text-white/60'}>
                                            {t('acceptInvite.passwordsMatch')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="w-1/3 py-3"
                                    onClick={() => navigate('/login')}
                                >
                                    {t('acceptInvite.cancel')}
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="flex-1 py-3"
                                    isLoading={isLoading}
                                    disabled={!hasMinLength || !passwordsMatch}
                                >
                                    {t('acceptInvite.setPassword')}
                                </Button>
                            </div>

                            <p className="text-center text-xs text-black/60 dark:text-white/60 pt-1">
                                {t('acceptInvite.termsNoticeBefore')}
                                <Link to="/terms" className="text-navy dark:text-navy-tint hover:underline font-medium">
                                    {t('acceptInvite.termsOfUse')}
                                </Link>
                                {t('acceptInvite.termsNoticeBetween')}
                                <Link to="/privacy" className="text-navy dark:text-navy-tint hover:underline font-medium">
                                    {t('acceptInvite.privacyNotice')}
                                </Link>
                                .
                            </p>

                            <div className="text-center pt-2">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center gap-1.5 text-xs text-navy dark:text-navy-tint hover:underline font-medium"
                                >
                                    <ArrowLeft size={14} /> {t('acceptInvite.alreadyHavePassword')}
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* Right Side graphic */}
            <div className="hidden lg:flex flex-1 relative items-center justify-center p-12 bg-transparent" />
        </div>
    );
};

export default AcceptInvite;

