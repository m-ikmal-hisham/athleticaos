import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { CheckCircle } from '@phosphor-icons/react';
import { CONTACT_EMAIL, CONTACT_EMAIL_LIVE } from '@/config/site';
import { submitContact, type ContactSubjectValue } from '@/api/public.api';
import { Select } from '@/components/Select';

const VALID_SUBJECT_VALUES: ContactSubjectValue[] = [
    'GENERAL',
    'PARTNERSHIP',
    'ORGANISATION_REGISTRATION',
    'MEDIA',
    'TOURNAMENT_SUPPORT',
    'PRIVACY_REQUEST',
];

const PRIVACY_TEMPLATES: Record<string, string> = {
    copy: 'Request: get a copy of my personal data. Player name / team / details: ',
    correct: 'Request: correct my personal details. Details to correct: ',
    remove: 'Request: remove or hide my public profile. Player name / team: ',
    withdraw: 'Request: withdraw consent or limit use of data. Details: ',
};

const contactSchema = z.object({
    name: z
        .string()
        .min(2, 'Full name must be at least 2 characters')
        .max(120, 'Full name must not exceed 120 characters'),
    email: z
        .string()
        .min(1, 'Email is required')
        .email('Please enter a valid email address')
        .max(254, 'Email must not exceed 254 characters'),
    organisation: z
        .string()
        .max(160, 'Organisation must not exceed 160 characters')
        .optional()
        .or(z.literal('')),
    subject: z.enum([
        'GENERAL',
        'PARTNERSHIP',
        'ORGANISATION_REGISTRATION',
        'MEDIA',
        'TOURNAMENT_SUPPORT',
        'PRIVACY_REQUEST',
    ], {
        errorMap: () => ({ message: 'Please select a subject' }),
    }),
    message: z
        .string()
        .min(10, 'Message must be at least 10 characters')
        .max(4000, 'Message must not exceed 4000 characters'),
    website: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function Contact() {
    const { t } = useTranslation('contact');
    const [searchParams] = useSearchParams();
    const [submitted, setSubmitted] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    const subjectOptions = useMemo(() => [
        { value: 'GENERAL' as ContactSubjectValue, label: t('subjects.GENERAL', { defaultValue: 'General enquiry' }) },
        { value: 'PARTNERSHIP' as ContactSubjectValue, label: t('subjects.PARTNERSHIP', { defaultValue: 'Partnership' }) },
        { value: 'ORGANISATION_REGISTRATION' as ContactSubjectValue, label: t('subjects.ORGANISATION_REGISTRATION', { defaultValue: 'Register my organisation' }) },
        { value: 'MEDIA' as ContactSubjectValue, label: t('subjects.MEDIA', { defaultValue: 'Media & press' }) },
        { value: 'TOURNAMENT_SUPPORT' as ContactSubjectValue, label: t('subjects.TOURNAMENT_SUPPORT', { defaultValue: 'Tournament organiser support' }) },
        { value: 'PRIVACY_REQUEST' as ContactSubjectValue, label: t('subjects.PRIVACY_REQUEST', { defaultValue: 'Privacy / data request' }) },
    ], [t]);

    const resolveSubjectFromQuery = (): ContactSubjectValue => {
        const querySubject = searchParams.get('subject')?.toUpperCase();
        if (querySubject && VALID_SUBJECT_VALUES.includes(querySubject as ContactSubjectValue)) {
            return querySubject as ContactSubjectValue;
        }
        return 'GENERAL';
    };

    const {
        register,
        control,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ContactFormData>({
        resolver: zodResolver(contactSchema),
        defaultValues: {
            name: '',
            email: '',
            organisation: '',
            subject: resolveSubjectFromQuery(),
            message: '',
            website: '',
        },
    });

    useEffect(() => {
        const paramSubject = searchParams.get('subject')?.toUpperCase();
        if (paramSubject && VALID_SUBJECT_VALUES.includes(paramSubject as ContactSubjectValue)) {
            setValue('subject', paramSubject as ContactSubjectValue);
        }
        if (paramSubject === 'PRIVACY_REQUEST') {
            const typeParam = searchParams.get('type')?.toLowerCase();
            if (typeParam && PRIVACY_TEMPLATES[typeParam]) {
                const currentMessage = watch('message');
                if (!currentMessage || currentMessage.trim() === '') {
                    setValue('message', PRIVACY_TEMPLATES[typeParam]);
                }
            }
        }
    }, [searchParams, setValue, watch]);

    const messageValue = watch('message') || '';

    const onSubmit = async (data: ContactFormData) => {
        setServerError(null);
        try {
            const response = await submitContact({
                name: data.name,
                email: data.email,
                organisation: data.organisation?.trim() || undefined,
                subject: data.subject,
                message: data.message,
                website: data.website?.trim() || undefined,
            });

            if (response.status === 202) {
                setSubmitted(true);
            } else {
                const fallback = CONTACT_EMAIL_LIVE
                    ? t('errorWithEmail', { email: CONTACT_EMAIL })
                    : t('errorGeneric');
                setServerError(fallback);
            }
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                if (err.response?.status === 429) {
                    const message =
                        err.response.data?.message || t('errorRateLimit');
                    setServerError(message);
                } else {
                    const fallback = CONTACT_EMAIL_LIVE
                        ? t('errorWithEmail', { email: CONTACT_EMAIL })
                        : t('errorGeneric');
                    setServerError(fallback);
                }
            } else {
                const fallback = CONTACT_EMAIL_LIVE
                    ? t('errorWithEmail', { email: CONTACT_EMAIL })
                    : t('errorGeneric');
                setServerError(fallback);
            }
        }
    };

    if (submitted) {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="p-8 sm:p-12 text-center rounded-2xl bg-white dark:bg-deep-navy border border-black/10 dark:border-white/12 space-y-6">
                    <div className="w-16 h-16 bg-navy/10 dark:bg-navy-tint/20 text-navy dark:text-navy-tint rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">{t('sentTitle')}</h2>
                    <p className="text-black/72 dark:text-white/72 max-w-md mx-auto">
                        {t('sentDescription')}
                    </p>
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                reset();
                                setSubmitted(false);
                                setServerError(null);
                            }}
                            className="inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] text-sm font-medium rounded-xl border border-black/10 dark:border-white/12 bg-white dark:bg-deep-navy text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                            {t('sendAnother')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        // One screen on desktop: intro on the left, form on the right; compact on phones
        <div className="max-w-6xl mx-auto grid gap-5 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-10 lg:gap-y-3 lg:items-start">
            <div className="space-y-2 lg:col-start-1 lg:col-span-5 lg:pt-4">
                <h1 className="font-score text-3xl sm:text-4xl font-bold text-black dark:text-white tracking-tight">
                    {t('title')}
                </h1>
                <p className="text-sm sm:text-base lg:text-lg text-black/72 dark:text-white/72">
                    {t('subtitle')}
                </p>
            </div>

            {/* Contact form card */}
            <div className="lg:col-start-6 lg:col-span-7 lg:row-start-1 lg:row-span-2 p-4 sm:p-6 rounded-2xl glass-card-surface border border-black/10 dark:border-white/12">
                <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-3" noValidate>
                    {/* Honeypot field - visually hidden, tabIndex -1, autocomplete off, aria-hidden */}
                    <div
                        className="absolute -left-[9999px] opacity-0 h-0 w-0 pointer-events-none"
                        aria-hidden="true"
                    >
                        <label htmlFor="website">Website</label>
                        <input
                            id="website"
                            type="text"
                            tabIndex={-1}
                            autoComplete="off"
                            aria-hidden="true"
                            {...register('website')}
                        />
                    </div>

                    {serverError && (
                        <div
                            role="alert"
                            className="col-span-2 p-4 rounded-xl border border-crimson/30 bg-crimson/10 text-crimson dark:text-crimson-tint text-sm font-medium"
                        >
                            {serverError}
                        </div>
                    )}

                    {/* Full name */}
                    <div className="col-span-2 sm:col-span-1">
                        <label
                            htmlFor="name"
                            className="block text-sm font-medium text-black dark:text-white mb-1"
                        >
                            {t('fullName')}
                        </label>
                        <input
                            id="name"
                            type="text"
                            aria-invalid={!!errors.name}
                            className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl border bg-black/4 dark:bg-white/6 text-black dark:text-white text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-navy dark:focus:ring-navy-tint transition-colors ${
                                errors.name
                                    ? 'border-crimson dark:border-crimson-tint'
                                    : 'border-black/24 dark:border-white/28'
                            }`}
                            {...register('name')}
                        />
                        {errors.name && (
                            <p className="text-xs text-crimson dark:text-crimson-tint mt-1.5">
                                {errors.name.message}
                            </p>
                        )}
                    </div>

                    {/* Email */}
                    <div className="col-span-2 sm:col-span-1">
                        <label
                            htmlFor="email"
                            className="block text-sm font-medium text-black dark:text-white mb-1"
                        >
                            {t('email')}
                        </label>
                        <input
                            id="email"
                            type="email"
                            aria-invalid={!!errors.email}
                            className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl border bg-black/4 dark:bg-white/6 text-black dark:text-white text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-navy dark:focus:ring-navy-tint transition-colors ${
                                errors.email
                                    ? 'border-crimson dark:border-crimson-tint'
                                    : 'border-black/24 dark:border-white/28'
                            }`}
                            {...register('email')}
                        />
                        {errors.email && (
                            <p className="text-xs text-crimson dark:text-crimson-tint mt-1.5">
                                {errors.email.message}
                            </p>
                        )}
                    </div>

                    {/* Organisation (optional) */}
                    <div>
                        <label
                            htmlFor="organisation"
                            className="block text-sm font-medium text-black dark:text-white mb-1"
                        >
                            {t('organisation')}{' '}
                            <span className="text-xs text-black/60 dark:text-white/60 font-normal">
                                {t('optional')}
                            </span>
                        </label>
                        <input
                            id="organisation"
                            type="text"
                            aria-invalid={!!errors.organisation}
                            className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl border bg-black/4 dark:bg-white/6 text-black dark:text-white text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-navy dark:focus:ring-navy-tint transition-colors ${
                                errors.organisation
                                    ? 'border-crimson dark:border-crimson-tint'
                                    : 'border-black/24 dark:border-white/28'
                            }`}
                            {...register('organisation')}
                        />
                        {errors.organisation && (
                            <p className="text-xs text-crimson dark:text-crimson-tint mt-1.5">
                                {errors.organisation.message}
                            </p>
                        )}
                    </div>

                    {/* Subject */}
                    <div>
                        <Controller
                            name="subject"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    id="subject"
                                    label={t('subject')}
                                    options={subjectOptions}
                                    value={field.value}
                                    onChange={(val) => field.onChange(val)}
                                    error={errors.subject?.message}
                                />
                            )}
                        />
                    </div>

                    {/* Message */}
                    <div className="col-span-2">
                        <div className="flex items-baseline justify-between mb-1">
                            <label htmlFor="message" className="text-sm font-medium text-black dark:text-white">
                                {t('message')}
                            </label>
                            <span className="text-xs text-black/60 dark:text-white/60 tabular-nums">
                                {messageValue.length} / 4000
                            </span>
                        </div>
                        <textarea
                            id="message"
                            rows={3}
                            aria-invalid={!!errors.message}
                            className={`w-full px-4 py-2.5 rounded-xl border bg-black/4 dark:bg-white/6 text-black dark:text-white text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-navy dark:focus:ring-navy-tint transition-colors resize-y sm:min-h-[7.5rem] ${
                                errors.message
                                    ? 'border-crimson dark:border-crimson-tint'
                                    : 'border-black/24 dark:border-white/28'
                            }`}
                            {...register('message')}
                        />
                        {errors.message && (
                            <p className="text-xs text-crimson dark:text-crimson-tint mt-1">
                                {errors.message.message}
                            </p>
                        )}
                    </div>

                    {/* Submit button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="col-span-2 w-full inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] text-base font-semibold rounded-xl bg-navy hover:bg-deep-navy dark:hover:bg-navy/80 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSubmitting && (
                            <svg
                                className="animate-spin h-5 w-5 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                            </svg>
                        )}
                        <span>{isSubmitting ? t('submitting') : t('submit')}</span>
                    </button>
                    <p className="col-span-2 text-center text-xs text-black/60 dark:text-white/60">
                        <Trans
                            i18nKey="contact:privacyNotice"
                            components={{
                                privacyLink: (
                                    <Link
                                        to="/privacy"
                                        className="text-navy dark:text-navy-tint hover:underline font-medium"
                                    />
                                ),
                            }}
                        />
                    </p>
                </form>
            </div>

            {CONTACT_EMAIL_LIVE && (
                <p className="text-sm text-black/72 dark:text-white/72 lg:col-start-1 lg:col-span-5 lg:row-start-2">
                    <Trans
                        i18nKey="contact:emailAlternative"
                        values={{ email: CONTACT_EMAIL }}
                        components={{
                            emailLink: (
                                <a
                                    href={`mailto:${CONTACT_EMAIL}`}
                                    className="text-navy dark:text-navy-tint hover:underline transition-colors"
                                />
                            ),
                        }}
                    />
                </p>
            )}
        </div>
    );
}
