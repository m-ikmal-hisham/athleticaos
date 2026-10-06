import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { CaretDown, CheckCircle } from '@phosphor-icons/react';
import { CONTACT_EMAIL, CONTACT_EMAIL_LIVE } from '@/config/site';
import { submitContact, type ContactSubjectValue } from '@/api/public.api';

const SUBJECT_OPTIONS: { value: ContactSubjectValue; label: string }[] = [
    { value: 'GENERAL', label: 'General enquiry' },
    { value: 'PARTNERSHIP', label: 'Partnership' },
    { value: 'ORGANISATION_REGISTRATION', label: 'Register my organisation' },
    { value: 'MEDIA', label: 'Media & press' },
    { value: 'TOURNAMENT_SUPPORT', label: 'Tournament organiser support' },
];

const VALID_SUBJECT_VALUES = SUBJECT_OPTIONS.map((opt) => opt.value);

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
    const [searchParams] = useSearchParams();
    const [submitted, setSubmitted] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    const resolveSubjectFromQuery = (): ContactSubjectValue => {
        const querySubject = searchParams.get('subject')?.toUpperCase();
        if (querySubject && VALID_SUBJECT_VALUES.includes(querySubject as ContactSubjectValue)) {
            return querySubject as ContactSubjectValue;
        }
        return 'GENERAL';
    };

    const {
        register,
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
    }, [searchParams, setValue]);

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
                    ? `Message not sent. Please try again later or email us at ${CONTACT_EMAIL}.`
                    : 'Message not sent. Please try again later.';
                setServerError(fallback);
            }
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                if (err.response?.status === 429) {
                    const message =
                        err.response.data?.message || 'Too many messages. Please try again later.';
                    setServerError(message);
                } else {
                    const fallback = CONTACT_EMAIL_LIVE
                        ? `Message not sent. Please try again later or email us at ${CONTACT_EMAIL}.`
                        : 'Message not sent. Please try again later.';
                    setServerError(fallback);
                }
            } else {
                const fallback = CONTACT_EMAIL_LIVE
                    ? `Message not sent. Please try again later or email us at ${CONTACT_EMAIL}.`
                    : 'Message not sent. Please try again later.';
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
                    <h2 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">Message sent</h2>
                    <p className="text-black/72 dark:text-white/72 max-w-md mx-auto">
                        Thanks for reaching out. We have received your message and will reply by email.
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
                            Send another message
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl font-bold text-black dark:text-white tracking-tight">
                    Contact us
                </h1>
                <p className="text-base sm:text-lg text-black/72 dark:text-white/72">
                    Questions, partnership enquiries, or registering your organisation's interest. We reply by email.
                </p>
                {CONTACT_EMAIL_LIVE && (
                    <p className="text-sm text-black/72 dark:text-white/72">
                        Or email us at{' '}
                        <a
                            href={`mailto:${CONTACT_EMAIL}`}
                            className="text-navy dark:text-navy-tint hover:underline transition-colors"
                        >
                            {CONTACT_EMAIL}
                        </a>
                    </p>
                )}
            </div>

            {/* Contact form card */}
            <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-deep-navy border border-black/10 dark:border-white/12">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
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
                            className="p-4 rounded-xl border border-crimson/30 bg-crimson/10 text-crimson dark:text-crimson-tint text-sm font-medium"
                        >
                            {serverError}
                        </div>
                    )}

                    {/* Full name */}
                    <div>
                        <label
                            htmlFor="name"
                            className="block text-sm font-medium text-black dark:text-white mb-1.5"
                        >
                            Full name
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
                    <div>
                        <label
                            htmlFor="email"
                            className="block text-sm font-medium text-black dark:text-white mb-1.5"
                        >
                            Email
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
                            className="block text-sm font-medium text-black dark:text-white mb-1.5"
                        >
                            Organisation{' '}
                            <span className="text-xs text-black/60 dark:text-white/60 font-normal">
                                (optional)
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
                        <label
                            htmlFor="subject"
                            className="block text-sm font-medium text-black dark:text-white mb-1.5"
                        >
                            Subject
                        </label>
                        <div className="relative">
                            <select
                                id="subject"
                                aria-invalid={!!errors.subject}
                                className={`w-full min-h-[44px] px-4 py-2.5 pr-10 rounded-xl border appearance-none bg-black/4 dark:bg-deep-navy text-black dark:text-white text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-navy dark:focus:ring-navy-tint transition-colors ${
                                    errors.subject
                                        ? 'border-crimson dark:border-crimson-tint'
                                        : 'border-black/24 dark:border-white/28'
                                }`}
                                {...register('subject')}
                            >
                                {SUBJECT_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                            <CaretDown
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none text-black/60 dark:text-white/60"
                                aria-hidden="true"
 />
                        </div>
                        {errors.subject && (
                            <p className="text-xs text-crimson dark:text-crimson-tint mt-1.5">
                                {errors.subject.message}
                            </p>
                        )}
                    </div>

                    {/* Message */}
                    <div>
                        <label
                            htmlFor="message"
                            className="block text-sm font-medium text-black dark:text-white mb-1.5"
                        >
                            Message
                        </label>
                        <textarea
                            id="message"
                            rows={6}
                            aria-invalid={!!errors.message}
                            className={`w-full px-4 py-2.5 rounded-xl border bg-black/4 dark:bg-white/6 text-black dark:text-white text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-navy dark:focus:ring-navy-tint transition-colors resize-y ${
                                errors.message
                                    ? 'border-crimson dark:border-crimson-tint'
                                    : 'border-black/24 dark:border-white/28'
                            }`}
                            {...register('message')}
                        />
                        <div className="flex items-center justify-between mt-1.5">
                            {errors.message ? (
                                <p className="text-xs text-crimson dark:text-crimson-tint">
                                    {errors.message.message}
                                </p>
                            ) : (
                                <span />
                            )}
                            <span className="text-xs text-black/60 dark:text-white/60 tabular-nums">
                                {messageValue.length} / 4000
                            </span>
                        </div>
                    </div>

                    {/* Submit button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] text-base font-semibold rounded-xl bg-navy hover:bg-deep-navy dark:hover:bg-navy/80 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                        <span>{isSubmitting ? 'Sending...' : 'Send message'}</span>
                    </button>
                </form>
            </div>
        </div>
    );
}
