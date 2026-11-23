import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Building,
    CalendarBlank,
    Certificate,
    CheckCircle,
    MapPin,
    Prohibit,
    Trophy,
    Users,
    WarningCircle,
} from '@phosphor-icons/react';
import { certificatesApi, type PublicCertificateVerification } from '@/api/certificates.api';
import { SEO } from '@/components/common/SEO';

function formatDate(dateStr: string | null, lang: string): string {
    if (!dateStr) return '—';
    const parsed = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return dateStr;
    return parsed.toLocaleDateString(lang.startsWith('ms') ? 'ms-MY' : 'en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function formatDateRange(start: string | null, end: string | null, lang: string): string {
    if (!start && !end) return '—';
    if (!start) return formatDate(end, lang);
    if (!end || start === end) return formatDate(start, lang);
    return `${formatDate(start, lang)} – ${formatDate(end, lang)}`;
}

export default function CertificateVerification() {
    const { code } = useParams<{ code: string }>();
    const { t, i18n } = useTranslation('certificates');

    const [data, setData] = useState<PublicCertificateVerification | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!code) {
            setNotFound(true);
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setNotFound(false);

        certificatesApi
            .verifyPublic(code)
            .then((res) => {
                if (!cancelled) {
                    setData(res);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setData(null);
                    setNotFound(true);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [code]);

    const isRevoked = data?.status === 'REVOKED';

    return (
        <div className="max-w-2xl mx-auto py-4 sm:py-8">
            <SEO
                title={t('verify.pageTitle')}
                description={t('verify.pageDescription')}
                noIndex
            />

            {loading ? (
                <div className="rounded-2xl border border-black/10 dark:border-white/12 bg-white/80 dark:bg-deep-navy/70 p-8 text-center">
                    <Certificate className="w-10 h-10 mx-auto text-navy dark:text-navy-tint mb-3 animate-pulse" />
                    <p className="text-sm text-black/70 dark:text-white/70">{t('verify.loading')}</p>
                </div>
            ) : notFound || !data ? (
                <div className="rounded-2xl border border-black/10 dark:border-white/12 bg-white/85 dark:bg-deep-navy/80 p-6 sm:p-8 text-center space-y-4 shadow-sm">
                    <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                        <WarningCircle className="w-7 h-7" weight="duotone" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-black dark:text-white">
                        {t('verify.notFoundTitle')}
                    </h1>
                    <p className="text-sm text-black/70 dark:text-white/70 max-w-md mx-auto">
                        {t('verify.notFoundBody', { code: code ?? '' })}
                    </p>
                    <div className="pt-2">
                        <Link
                            to="/"
                            className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl bg-navy text-white text-sm font-semibold hover:bg-navy/90 transition-colors"
                        >
                            {t('verify.backHome')}
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="rounded-2xl border border-black/10 dark:border-white/12 bg-white/90 dark:bg-deep-navy/85 overflow-hidden shadow-sm">
                    {/* Status Banner */}
                    <div
                        className={
                            isRevoked
                                ? 'px-5 py-4 sm:px-7 sm:py-5 bg-crimson/10 border-b border-crimson/20 flex items-start gap-3'
                                : 'px-5 py-4 sm:px-7 sm:py-5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-start gap-3'
                        }
                    >
                        {isRevoked ? (
                            <Prohibit className="w-7 h-7 text-crimson shrink-0 mt-0.5" weight="fill" />
                        ) : (
                            <CheckCircle className="w-7 h-7 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" weight="fill" />
                        )}
                        <div className="min-w-0">
                            <h1
                                className={
                                    isRevoked
                                        ? 'text-lg sm:text-xl font-bold text-crimson'
                                        : 'text-lg sm:text-xl font-bold text-emerald-800 dark:text-emerald-300'
                                }
                            >
                                {isRevoked ? t('verify.revokedBadge') : t('verify.validBadge')}
                            </h1>
                            <p className="text-xs sm:text-sm text-black/72 dark:text-white/75 mt-0.5">
                                {isRevoked ? t('verify.revokedSubtitle') : t('verify.validSubtitle')}
                            </p>
                        </div>
                    </div>

                    {/* Certificate Details */}
                    <div className="p-5 sm:p-7 space-y-5">
                        <div>
                            <div className="text-xs font-medium uppercase tracking-wider text-black/55 dark:text-white/55">
                                {t('verify.fields.recipient')}
                            </div>
                            <div className="text-2xl sm:text-3xl font-bold text-black dark:text-white mt-1 [overflow-wrap:anywhere]">
                                {data.recipientName}
                            </div>
                            {data.achievementText && (
                                <div className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-navy/10 dark:bg-navy-tint/20 text-navy dark:text-navy-tint">
                                    {data.achievementText}
                                </div>
                            )}
                        </div>

                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-black/8 dark:border-white/10">
                            <div className="flex items-start gap-2.5">
                                <Users className="w-4 h-4 text-navy dark:text-navy-tint mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                    <dt className="text-xs text-black/55 dark:text-white/55">{t('verify.fields.team')}</dt>
                                    <dd className="text-sm font-semibold text-black dark:text-white [overflow-wrap:anywhere]">
                                        {data.teamName}
                                    </dd>
                                </div>
                            </div>

                            {data.categoryName && (
                                <div className="flex items-start gap-2.5">
                                    <Certificate className="w-4 h-4 text-navy dark:text-navy-tint mt-0.5 shrink-0" />
                                    <div className="min-w-0">
                                        <dt className="text-xs text-black/55 dark:text-white/55">{t('verify.fields.category')}</dt>
                                        <dd className="text-sm font-semibold text-black dark:text-white [overflow-wrap:anywhere]">
                                            {data.categoryName}
                                        </dd>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-start gap-2.5 sm:col-span-2">
                                <Trophy className="w-4 h-4 text-navy dark:text-navy-tint mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                    <dt className="text-xs text-black/55 dark:text-white/55">{t('verify.fields.tournament')}</dt>
                                    <dd className="text-sm font-semibold text-black dark:text-white [overflow-wrap:anywhere]">
                                        {data.tournamentName}
                                    </dd>
                                </div>
                            </div>

                            <div className="flex items-start gap-2.5">
                                <CalendarBlank className="w-4 h-4 text-navy dark:text-navy-tint mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                    <dt className="text-xs text-black/55 dark:text-white/55">{t('verify.fields.dates')}</dt>
                                    <dd className="text-sm font-medium text-black dark:text-white">
                                        {formatDateRange(data.tournamentStartDate, data.tournamentEndDate, i18n.language)}
                                    </dd>
                                </div>
                            </div>

                            {data.tournamentVenue && (
                                <div className="flex items-start gap-2.5">
                                    <MapPin className="w-4 h-4 text-navy dark:text-navy-tint mt-0.5 shrink-0" />
                                    <div className="min-w-0">
                                        <dt className="text-xs text-black/55 dark:text-white/55">{t('verify.fields.venue')}</dt>
                                        <dd className="text-sm font-medium text-black dark:text-white [overflow-wrap:anywhere]">
                                            {data.tournamentVenue}
                                        </dd>
                                    </div>
                                </div>
                            )}

                            {data.organiserName && (
                                <div className="flex items-start gap-2.5">
                                    <Building className="w-4 h-4 text-navy dark:text-navy-tint mt-0.5 shrink-0" />
                                    <div className="min-w-0">
                                        <dt className="text-xs text-black/55 dark:text-white/55">{t('verify.fields.organiser')}</dt>
                                        <dd className="text-sm font-medium text-black dark:text-white [overflow-wrap:anywhere]">
                                            {data.organiserName}
                                        </dd>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-start gap-2.5">
                                <CalendarBlank className="w-4 h-4 text-navy dark:text-navy-tint mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                    <dt className="text-xs text-black/55 dark:text-white/55">{t('verify.fields.issueDate')}</dt>
                                    <dd className="text-sm font-medium text-black dark:text-white">
                                        {formatDate(data.issueDate, i18n.language)}
                                    </dd>
                                </div>
                            </div>

                            {isRevoked && data.revokedAt && (
                                <div className="flex items-start gap-2.5">
                                    <Prohibit className="w-4 h-4 text-crimson mt-0.5 shrink-0" />
                                    <div className="min-w-0">
                                        <dt className="text-xs text-black/55 dark:text-white/55">{t('verify.fields.revokedOn')}</dt>
                                        <dd className="text-sm font-medium text-crimson">
                                            {formatDate(data.revokedAt, i18n.language)}
                                        </dd>
                                    </div>
                                </div>
                            )}
                        </dl>

                        <div className="pt-4 border-t border-black/8 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-black/60 dark:text-white/60">
                            <span>{t('verify.fields.code')}</span>
                            <span className="font-mono font-bold text-sm text-black dark:text-white tracking-wider">
                                {data.code}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
