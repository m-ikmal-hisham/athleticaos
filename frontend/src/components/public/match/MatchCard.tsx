import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin } from '@phosphor-icons/react';
import { PublicMatchSummary } from '@/api/public.api';
import { GlassCard } from '@/components/GlassCard';
import { getImageUrl } from '@/utils/image';
import { formatKickOff, formatTeamShortName } from '@/utils/formatters';
import { MatchStatusBadge } from './MatchStatusBadge';

export interface MatchCardProps {
    match: PublicMatchSummary;
    compact?: boolean;
    footer?: React.ReactNode;
    className?: string;
}

export function MatchCard({ match, compact = false, footer, className = '' }: MatchCardProps) {
    const { t, i18n } = useTranslation(['calendar', 'common']);

    const hasScores = match.homeScore !== undefined && match.awayScore !== undefined && match.homeScore !== null && match.awayScore !== null;
    const homeScore = match.homeScore ?? 0;
    const awayScore = match.awayScore ?? 0;

    const isHomeWinner = hasScores && homeScore > awayScore;
    const isAwayWinner = hasScores && awayScore > homeScore;
    const isTie = hasScores && homeScore === awayScore;

    const homeOpacity = isTie || isHomeWinner || !hasScores ? 'opacity-100' : 'opacity-70';
    const awayOpacity = isTie || isAwayWinner || !hasScores ? 'opacity-100' : 'opacity-70';

    const homeDisplayName = formatTeamShortName(match.homeTeamShortName, match.homeTeamName);
    const awayDisplayName = formatTeamShortName(match.awayTeamShortName, match.awayTeamName);

    const homeInitials = (homeDisplayName || 'H').slice(0, 2).toUpperCase();
    const awayInitials = (awayDisplayName || 'A').slice(0, 2).toUpperCase();

    const formattedKickoff = formatKickOff(match.matchTime, i18n.language);
    // The centre cell already shows a scheduled match's kick-off, so the badge is only for live, FT, cancelled, W/O
    const showStatusBadge =
        hasScores ||
        ['CANCELLED', 'ABANDONED'].includes((match.status || '').toUpperCase()) ||
        (!!match.resultType && match.resultType !== 'NORMAL');

    const cardContent = (
        <div className="flex flex-col gap-2.5 w-full">
            {/* Main Score Row: Home Team - Score/Time - Away Team */}
            <div className="flex items-center justify-between gap-2.5 sm:gap-4 min-w-0">
                {/* Home Team */}
                <div className="flex-1 flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-surface-sunken border border-line-subtle shrink-0 flex items-center justify-center overflow-hidden">
                        {match.homeTeamLogoUrl ? (
                            <img
                                src={getImageUrl(match.homeTeamLogoUrl)}
                                alt=""
                                aria-hidden="true"
                                className="w-full h-full object-contain p-0.5"
                            />
                        ) : (
                            <span className="text-[11px] font-bold text-content-secondary select-none">
                                {homeInitials}
                            </span>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <span
                            className={`block text-xs sm:text-sm font-bold text-content-primary break-words leading-tight ${homeOpacity}`}
                            title={match.homeTeamName}
                        >
                            {homeDisplayName}
                        </span>
                    </div>
                </div>

                {/* Center Score / Kick-off cell */}
                <div className="shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] px-2.5 py-1 rounded-[8px] bg-surface-sunken select-none">
                    {hasScores ? (
                        <div className="flex items-center gap-1 font-score tabular-nums text-lg sm:text-xl font-bold leading-none">
                            <span className={homeOpacity}>{homeScore}</span>
                            <span className="text-content-tertiary opacity-40 text-base">:</span>
                            <span className={awayOpacity}>{awayScore}</span>
                        </div>
                    ) : (
                        <span className="font-score tabular-nums text-xs sm:text-sm font-bold text-content-secondary leading-tight">
                            {formattedKickoff || t('calendar:vs', { defaultValue: 'VS' })}
                        </span>
                    )}

                    {match.resultType && match.resultType !== 'NORMAL' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-accent-text mt-0.5">
                            {match.resultType === 'BYE'
                                ? t('common:status.bye', { defaultValue: 'Bye' })
                                : t('common:status.walkover', { defaultValue: 'W/O' })}
                        </span>
                    )}
                </div>

                {/* Away Team */}
                <div className="flex-1 flex items-center justify-end gap-2 min-w-0 text-right">
                    <div className="min-w-0 flex-1">
                        <span
                            className={`block text-xs sm:text-sm font-bold text-content-primary break-words leading-tight ${awayOpacity}`}
                            title={match.awayTeamName}
                        >
                            {awayDisplayName}
                        </span>
                    </div>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-surface-sunken border border-line-subtle shrink-0 flex items-center justify-center overflow-hidden">
                        {match.awayTeamLogoUrl ? (
                            <img
                                src={getImageUrl(match.awayTeamLogoUrl)}
                                alt=""
                                aria-hidden="true"
                                className="w-full h-full object-contain p-0.5"
                            />
                        ) : (
                            <span className="text-[11px] font-bold text-content-secondary select-none">
                                {awayInitials}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Compact: status only when the centre cell can't say it (live, FT, cancelled) */}
            {compact && showStatusBadge && (
                <div className="flex justify-center">
                    <MatchStatusBadge match={match} />
                </div>
            )}

            {/* Meta Line (Non-compact only): Badge · Venue · Code */}
            {!compact && (
                <div className="flex items-center justify-between gap-2 text-xs text-content-secondary pt-2 border-t border-line-subtle/50">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        {showStatusBadge && <MatchStatusBadge match={match} />}
                        {match.venue && (
                            <span className="flex items-center gap-1 truncate text-content-tertiary">
                                {showStatusBadge && <span className="opacity-40" aria-hidden="true">•</span>}
                                <MapPin size={12} className="shrink-0" aria-hidden="true" />
                                <span className="truncate">{match.venue}</span>
                            </span>
                        )}
                    </div>

                    {match.code && (
                        <span className="hidden sm:inline text-[11px] font-mono font-semibold text-content-tertiary shrink-0 uppercase">
                            {match.code}
                        </span>
                    )}
                </div>
            )}

            {/* Optional Footer Slot (e.g. Match Officials in TournamentDetail) */}
            {footer && (
                <div className="pt-2 border-t border-line-subtle/50 text-xs">
                    {footer}
                </div>
            )}
        </div>
    );

    // Compact variant: plain row with hairline divider and hover tint, NO glass surface
    if (compact) {
        return (
            <Link
                to={`/matches/${match.id}`}
                className={`block p-3 rounded-[10px] bg-surface-card border border-line-subtle hover:bg-black/4 dark:hover:bg-white/6 transition-colors group text-content-primary no-underline outline-none focus-visible:ring-2 focus-visible:ring-brand min-h-[44px] ${className}`}
            >
                {cardContent}
            </Link>
        );
    }

    // Full variant: public glass surface
    return (
        <Link
            to={`/matches/${match.id}`}
            className="block group text-content-primary no-underline outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-[14px]"
        >
            <GlassCard surface="glass" hover className={`p-4 rounded-[14px] min-h-[44px] ${className}`}>
                {cardContent}
            </GlassCard>
        </Link>
    );
}
