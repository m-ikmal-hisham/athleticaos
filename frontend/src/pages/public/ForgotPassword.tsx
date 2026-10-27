import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { CheckCircle, ArrowLeft } from '@phosphor-icons/react';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { authApi } from '@/api/auth.api';
import { useEffectiveTheme } from '@/hooks/useEffectiveTheme';

const forgotPasswordSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const ForgotPassword = () => {
    const { t } = useTranslation(['auth', 'common']);
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const effectiveTheme = useEffectiveTheme();
    const logoSrc = effectiveTheme === 'dark' ? '/athleticaos-logo-dark-x2.png' : '/athleticaos-logo-primary-x2.png';

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const onSubmit = async (data: ForgotPasswordFormData) => {
        try {
            setIsLoading(true);
            setErrorMessage('');
            await authApi.forgotPassword(data);
            setIsSubmitted(true);
        } catch (err: unknown) {
            const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
            if (axiosErr.response?.status === 429) {
                setErrorMessage(t('forgotPassword.rateLimitError'));
            } else {
                setErrorMessage(axiosErr.response?.data?.message || t('forgotPassword.genericError'));
            }
        } finally {
            setIsLoading(false);
        }
    };

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
                                {isSubmitted ? t('forgotPassword.checkEmailTitle') : t('forgotPassword.title')}
                            </h2>
                            <p className="mt-1.5 text-sm text-black/72 dark:text-white/72 font-medium">
                                {t('forgotPassword.subtitle')}
                            </p>
                        </div>
                    </div>

                    {isSubmitted ? (
                        <div className="space-y-6 text-center">
                            <div className="p-4 rounded-xl bg-black/4 dark:bg-white/6 border border-black/10 dark:border-white/12 space-y-3">
                                <div className="flex justify-center text-navy dark:text-navy-tint">
                                    <CheckCircle size={48} weight="duotone" />
                                </div>
                                <h3 className="text-lg font-semibold text-black dark:text-white">
                                    {t('forgotPassword.sentTitle')}
                                </h3>
                                <p className="text-sm text-black/72 dark:text-white/72 leading-relaxed">
                                    {t('forgotPassword.sentDescription')}
                                </p>
                            </div>

                            <Button
                                type="button"
                                variant="primary"
                                className="w-full py-3"
                                onClick={() => navigate('/login')}
                            >
                                {t('forgotPassword.backToSignIn')}
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            {errorMessage && (
                                <div className="p-3 rounded-lg bg-crimson/10 border border-crimson/20 text-center text-sm text-crimson dark:text-crimson-tint">
                                    {errorMessage}
                                </div>
                            )}

                            <div className="space-y-1">
                                <Input
                                    type="email"
                                    placeholder={t('forgotPassword.emailPlaceholder')}
                                    error={errors.email?.message}
                                    {...register('email')}
                                    className="bg-black/4 dark:bg-white/6 border-black/24 dark:border-white/28 text-black/90 dark:text-white/92 placeholder:text-black/60 dark:placeholder:text-white/60 focus:bg-white dark:focus:bg-deep-navy focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-navy-tint rounded-[10px] min-h-[44px] text-base sm:text-sm p-3"
                                />
                            </div>

                            <p className="text-xs text-black/60 dark:text-white/60">
                                {t('forgotPassword.instruction')}
                            </p>

                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="w-1/3 py-3"
                                    onClick={() => navigate('/login')}
                                >
                                    {t('login.cancel')}
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="flex-1 py-3"
                                    isLoading={isLoading}
                                >
                                    {t('forgotPassword.sendLink')}
                                </Button>
                            </div>

                            <div className="text-center pt-2">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center gap-1.5 text-xs text-navy dark:text-navy-tint hover:underline font-medium"
                                >
                                    <ArrowLeft size={14} /> {t('forgotPassword.backToSignIn')}
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

export default ForgotPassword;
