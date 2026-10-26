import { useTranslation } from 'react-i18next';
import { PublicMatchSummary } from '@/api/public.api';
import { formatKickOff } from '@/utils/formatters';

interface MatchStatusBadgeProps {
    match: PublicMatchSummary;
    className?: string;
}

export function MatchStatusBadge({ match, className = '' }: MatchStatusBadgeProps) {
    const { t, i18n } = useTranslation(['common', 'calendar']);
    const status = (match.status || '').toUpperCase();

    // 1. Walkover / Bye check
    if (match.resultType === 'WALKOVER') {
        return (
            <span
                className={`inline-flex items-center px-2 py-0.5 rounded bg-surface-sunken text-accent-text border border-line-subtle text-xs font-bold uppercase tracking-wider select-none ${className}`}
            >
                {t('common:status.walkover', { defaultValue: 'W/O' })}
            </span>
        );
    }
    if (match.resultType === 'BYE') {
        return (
            <span
                className={`inline-flex items-center px-2 py-0.5 rounded bg-surface-sunken text-content-secondary border border-line-subtle text-xs font-semibold uppercase select-none ${className}`}
            >
                {t('common:status.bye', { defaultValue: 'Bye' })}
            </span>
        );
    }

    // 2. LIVE / ONGOING
    if (['LIVE', 'ONGOING', 'IN_PROGRESS'].includes(status)) {
        return (
            <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-crimson text-white text-xs font-bold uppercase tracking-wider select-none shadow-xs ${className}`}
            >
                <span className="w-1.5 h-1.5 rounded-full bg-white motion-safe:animate-pulse" aria-hidden="true" />
                {t('common:status.live', { defaultValue: 'LIVE' })}
            </span>
        );
    }

    // 3. CANCELLED / ABANDONED
    if (['CANCELLED', 'ABANDONED'].includes(status)) {
        return (
            <span
                className={`inline-flex items-center px-2 py-0.5 rounded bg-surface-sunken text-content-secondary border border-line-subtle text-xs font-semibold select-none ${className}`}
            >
                {t('common:status.cancelled', { defaultValue: 'Cancelled' })}
            </span>
        );
    }

    // 4. COMPLETED / FULL_TIME
    if (['COMPLETED', 'FULL_TIME', 'FINISHED'].includes(status)) {
        return (
            <span
                className={`inline-flex items-center px-2 py-0.5 rounded bg-surface-sunken text-content-primary border border-line-subtle text-xs font-semibold select-none ${className}`}
            >
                {t('common:status.fullTime', { defaultValue: 'FT' })}
            </span>
        );
    }

    // 5. SCHEDULED (default)
    const formattedTime = formatKickOff(match.matchTime, i18n.language);
    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded bg-surface-sunken text-content-secondary border border-line-subtle text-xs font-semibold select-none ${className}`}
        >
            {formattedTime || t('calendar:venueTbc', { defaultValue: 'TBC' })}
        </span>
    );
}
