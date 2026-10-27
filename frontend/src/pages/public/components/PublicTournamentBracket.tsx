import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PublicMatchSummary } from '../../../api/public.api';
import { Trophy, CaretRight } from '@phosphor-icons/react';
import { formatPoolPositionPlaceholder } from '@/utils/formatters';
import { groupMatchesIntoBrackets } from '@/utils/bracketUtils';
import { formatOfficialRole } from '@/utils/rugbyPositions';
import { formatCalendarDate, getDateLocale, formatKickOff } from '@/utils/malaysiaDate';
import { LogoImage } from '@/components/public/LogoImage';
import { enumLabel } from '@/utils/enumLabel';

interface PublicTournamentBracketProps {
    matches: PublicMatchSummary[];
}

export function PublicTournamentBracket({ matches }: PublicTournamentBracketProps) {
    const { t, i18n } = useTranslation(['tournament', 'common', 'match']);

    const bracketGroups = useMemo(() => {
        return groupMatchesIntoBrackets(matches);
    }, [matches]);

    if (bracketGroups.length === 0) {
        return (
            <div className="text-center py-12 text-slate-500 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                {t('tournament:bracket.empty')}
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {bracketGroups.map((bracket) => (
                <div
                    key={bracket.id}
                    className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-md overflow-hidden"
                >
                    {/* Bracket Header */}
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200/60 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-navy dark:text-navy-tint flex items-center justify-center font-bold text-sm">
                                <Trophy className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">
                                    {enumLabel(t, 'stage', bracket.title)}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    {t('tournament:bracket.progression')}
                                </p>
                            </div>
                        </div>

                        <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full shrink-0">
                            <span>{t('tournament:bracket.stageBadge')}</span>
                        </div>
                    </div>

                    {/* Bracket Tree View */}
                    <div className="overflow-x-auto pb-4 scrollbar-thin">
                        <div className="flex gap-10 min-w-max px-2 py-4">
                            {bracket.rounds.map((round, roundIdx) => (
                                <div key={round.id} className="flex flex-col min-w-[280px] max-w-[320px]">
                                    {/* Round Header */}
                                    <div className="text-center font-black uppercase text-xs tracking-wider text-navy dark:text-navy-tint bg-blue-50 dark:bg-blue-950/50 border border-blue-200/50 dark:border-blue-900/50 py-2 rounded-xl mb-6 shadow-sm flex items-center justify-center gap-2">
                                        <span>{enumLabel(t, 'stage', round.name)}</span>
                                        {roundIdx < bracket.rounds.length - 1 && (
                                            <CaretRight className="w-4 h-4 opacity-60" />
                                        )}
                                    </div>

                                    {/* Matches Column */}
                                    <div className="flex flex-col justify-around flex-1 gap-6">
                                        {round.matches.map((match) => {
                                            const isHomeWinner = match.homeScore != null && match.awayScore != null && match.homeScore > match.awayScore;
                                            const isAwayWinner = match.homeScore != null && match.awayScore != null && match.awayScore > match.homeScore;
                                            const isFinal = round.name.toLowerCase().includes('final') && !round.name.toLowerCase().includes('semi');

                                            return (
                                                <div
                                                    key={match.id}
                                                    className={`
                                                        relative bg-slate-50/90 dark:bg-slate-800/80 border rounded-2xl p-3.5 shadow-md hover:shadow-lg transition-all duration-200 group
                                                        ${isFinal ? 'border-amber-400/60 dark:border-amber-500/40 bg-gradient-to-br from-amber-500/5 to-transparent' : 'border-slate-200 dark:border-slate-700/80'}
                                                    `}
                                                >
                                                    {/* Match Code & Date Header */}
                                                    <div className="flex justify-between items-center mb-2.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                                        <span className="bg-slate-200/60 dark:bg-slate-700/60 px-2 py-0.5 rounded-md font-mono text-slate-700 dark:text-slate-300">
                                                            {match.code && match.code.length < 12 ? match.code : t('tournament:bracket.match')}
                                                        </span>
                                                        {/* An awarded result must read as one publicly too, not as an ordinary 28-0. */}
                                                        {match.resultType && match.resultType !== 'NORMAL' ? (
                                                            <span className="text-amber-600 dark:text-amber-400">
                                                                {match.resultType === 'BYE' ? t('tournament:bracket.bye') : t('tournament:bracket.walkover')}
                                                            </span>
                                                        ) : (
                                                            <span>
                                                                {formatCalendarDate(match.matchDate, 'd MMM', { locale: getDateLocale(i18n.language) })}
                                                                {match.matchTime ? ` • ${formatKickOff(match.matchTime, i18n.language)}` : ''}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Teams and Scores */}
                                                    <div className="space-y-2">
                                                        {/* Home Team */}
                                                        <div className={`flex items-center justify-between p-2 rounded-xl transition-colors ${isHomeWinner ? 'bg-emerald-500/10 dark:bg-emerald-500/20 font-bold' : 'bg-white/60 dark:bg-slate-900/40'}`}>
                                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                                                                    <LogoImage
                                                                        src={match.homeTeamLogoUrl}
                                                                        name={match.homeTeamName || ''}
                                                                        size="sm"
                                                                        className="w-full h-full object-contain p-0.5"
                                                                    />
                                                                </div>
                                                                <span className={`text-xs truncate ${isHomeWinner ? 'text-slate-900 dark:text-white font-extrabold' : 'text-slate-700 dark:text-slate-300'}`}>
                                                                    {match.homeTeamName ? formatPoolPositionPlaceholder(match.homeTeamName) : t('tournament:bracket.tbd')}
                                                                </span>
                                                            </div>
                                                            <span className={`font-mono text-xs px-2 py-0.5 rounded-md ${isHomeWinner ? 'bg-emerald-500 text-white font-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold'}`}>
                                                                {match.homeScore ?? '-'}
                                                            </span>
                                                        </div>

                                                        {/* Away Team */}
                                                        <div className={`flex items-center justify-between p-2 rounded-xl transition-colors ${isAwayWinner ? 'bg-emerald-500/10 dark:bg-emerald-500/20 font-bold' : 'bg-white/60 dark:bg-slate-900/40'}`}>
                                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                                                                    <LogoImage
                                                                        src={match.awayTeamLogoUrl}
                                                                        name={match.awayTeamName || ''}
                                                                        size="sm"
                                                                        className="w-full h-full object-contain p-0.5"
                                                                    />
                                                                </div>
                                                                <span className={`text-xs truncate ${isAwayWinner ? 'text-slate-900 dark:text-white font-extrabold' : 'text-slate-700 dark:text-slate-300'}`}>
                                                                    {match.awayTeamName ? formatPoolPositionPlaceholder(match.awayTeamName) : t('tournament:bracket.tbd')}
                                                                </span>
                                                            </div>
                                                            <span className={`font-mono text-xs px-2 py-0.5 rounded-md ${isAwayWinner ? 'bg-emerald-500 text-white font-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold'}`}>
                                                                {match.awayScore ?? '-'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Officials Footer */}
                                                    {match.officials && match.officials.length > 0 && (
                                                        <div className="mt-2.5 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex flex-wrap gap-1">
                                                            {match.officials.map((o, idx) => (
                                                                <div key={idx} className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 bg-white/40 dark:bg-slate-900/40 px-1.5 py-0.5 rounded">
                                                                    <span className="font-semibold text-slate-400 uppercase text-[11px]">
                                                                        {formatOfficialRole(o.assignedRole, t)}:
                                                                    </span>
                                                                    <span className="truncate max-w-[100px] font-medium">{o.officialName}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Winner Trophy Badge for Final */}
                                                    {isFinal && match.status === 'COMPLETED' && (
                                                        <div className="absolute -top-3 -right-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 p-1.5 rounded-full shadow-lg border-2 border-white dark:border-slate-900">
                                                            <Trophy className="w-4 h-4" />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

