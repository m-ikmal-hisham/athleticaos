import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PublicMatchSummary, PublicPlacementRoundRobin, PlacementStandingRow } from '../../../api/public.api';
import { Trophy, CaretRight } from '@phosphor-icons/react';
import { formatPoolPositionPlaceholder } from '@/utils/formatters';
import { groupMatchesIntoBrackets } from '@/utils/bracketUtils';
import { formatOfficialRole } from '@/utils/rugbyPositions';
import { formatCalendarDate, getDateLocale, formatKickOff } from '@/utils/malaysiaDate';
import { LogoImage } from '@/components/public/LogoImage';
import { enumLabel } from '@/utils/enumLabel';
import { MatchCard } from '@/components/public/match';

interface PublicTournamentBracketProps {
    matches: PublicMatchSummary[];
    placementRoundRobins?: PublicPlacementRoundRobin[];
}

function formatPlace(place: number, lang: string): string {
    if (lang?.startsWith('ms')) {
        return `Ke-${place}`;
    }
    const s = ['th', 'st', 'nd', 'rd'];
    const v = place % 100;
    return `${place}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export function PublicTournamentBracket({ matches, placementRoundRobins = [] }: PublicTournamentBracketProps) {
    const { t, i18n } = useTranslation(['tournament', 'common', 'match']);

    const bracketGroups = useMemo(() => {
        return groupMatchesIntoBrackets(matches);
    }, [matches]);

    const hasAnyContent = bracketGroups.length > 0 || placementRoundRobins.length > 0;

    if (!hasAnyContent) {
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
                                            const isHomeWinner = match.homeScore != null && match.awayScore != null && (
                                                match.homeScore > match.awayScore ||
                                                (match.homeScore === match.awayScore && Boolean(match.winnerTeamId && match.homeTeamId && match.winnerTeamId === match.homeTeamId))
                                            );
                                            const isAwayWinner = match.homeScore != null && match.awayScore != null && (
                                                match.awayScore > match.homeScore ||
                                                (match.homeScore === match.awayScore && Boolean(match.winnerTeamId && match.awayTeamId && match.winnerTeamId === match.awayTeamId))
                                            );
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
                                                        {match.decidedBy ? (
                                                            <span className="text-blue-600 dark:text-blue-400 font-bold">
                                                                {match.decidedBy === 'FIRST_TRY' && t('match:tieBreak.shortFirstTry')}
                                                                {match.decidedBy === 'EXTRA_TIME' && t('match:tieBreak.shortExtraTime')}
                                                                {match.decidedBy === 'DROP_KICKS' && t('match:tieBreak.shortDropKicks', { home: match.dropKicksHome ?? 0, away: match.dropKicksAway ?? 0 })}
                                                                {match.decidedBy === 'COIN_TOSS' && t('match:tieBreak.shortCoinToss')}
                                                            </span>
                                                        ) : match.resultType && match.resultType !== 'NORMAL' ? (
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

            {placementRoundRobins.map((rr) => {
                const hasBonusPoints = rr.table.some((row: PlacementStandingRow) => (row.bonusPoints ?? 0) > 0);
                const stageMatches = matches.filter(m => (rr.matchIds && rr.matchIds.includes(m.id)) || (m.stageId && m.stageId === rr.stageId));

                return (
                    <div
                        key={rr.stageId}
                        className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-md overflow-hidden space-y-6"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-navy dark:text-navy-tint flex items-center justify-center font-bold text-sm">
                                    <Trophy className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">
                                        {rr.stageName}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                        {t('tournament:bracket.placementStage')}
                                    </p>
                                </div>
                            </div>

                            <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full shrink-0">
                                <span>{t('tournament:bracket.placementRoundRobin')}</span>
                            </div>
                        </div>

                        {/* Standings Table */}
                        <div className="overflow-x-auto rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-100/50 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-xs">
                                    <tr>
                                        <th className="px-2 sm:px-4 py-3 text-left w-12 sm:w-16">{t('tournament:pools.pos')}</th>
                                        <th className="px-1.5 sm:px-3 py-3 text-left">{t('tournament:pools.team')}</th>
                                        <th className="px-1.5 sm:px-3 py-3 text-center">{t('tournament:pools.pld')}</th>
                                        <th className="px-3 py-3 text-center hidden sm:table-cell">{t('tournament:pools.won')}</th>
                                        <th className="px-3 py-3 text-center hidden sm:table-cell">{t('tournament:pools.drawn')}</th>
                                        <th className="px-3 py-3 text-center hidden sm:table-cell">{t('tournament:pools.lost')}</th>
                                        <th className="px-3 py-3 text-center hidden sm:table-cell">{t('tournament:pools.pointsFor')}</th>
                                        <th className="px-3 py-3 text-center hidden sm:table-cell">{t('tournament:pools.pointsAgainst')}</th>
                                        <th className="px-3 py-3 text-center hidden sm:table-cell">{t('tournament:pools.diff')}</th>
                                        {hasBonusPoints && <th className="px-3 py-3 text-center hidden sm:table-cell">{t('tournament:pools.bonusPoints')}</th>}
                                        <th className="px-1.5 sm:px-3 py-3 text-center">{t('tournament:pools.points')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {rr.table.map((row: PlacementStandingRow) => (
                                        <tr key={row.teamId || row.teamName} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                                            <td className="px-2 sm:px-4 py-2.5 sm:py-3.5 font-mono font-bold text-navy dark:text-navy-tint">
                                                {formatPlace(row.place, i18n.language)}
                                            </td>
                                            <td className="px-1.5 sm:px-3 py-2.5 sm:py-3.5 max-w-0 w-full">
                                                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                                    <div className="w-7 h-7 sm:w-9 sm:h-9 flex-shrink-0 flex items-center justify-center">
                                                        <LogoImage
                                                            src={row.teamLogoUrl}
                                                            name={row.teamShortName || row.teamName}
                                                            size="sm"
                                                            className="w-full h-full object-contain filter drop-shadow-sm"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white truncate">
                                                            {row.teamShortName || row.teamName}
                                                        </span>
                                                        {row.teamShortName && row.teamShortName !== row.teamName && (
                                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                                                {row.teamName}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-1.5 sm:px-3 py-2.5 sm:py-3.5 text-center text-slate-600 dark:text-slate-400 font-medium">{row.played}</td>
                                            <td className="px-3 py-3.5 text-center hidden sm:table-cell text-slate-600 dark:text-slate-400">{row.won}</td>
                                            <td className="px-3 py-3.5 text-center hidden sm:table-cell text-slate-600 dark:text-slate-400">{row.drawn}</td>
                                            <td className="px-3 py-3.5 text-center hidden sm:table-cell text-slate-600 dark:text-slate-400">{row.lost}</td>
                                            <td className="px-3 py-3.5 text-center hidden sm:table-cell text-slate-600 dark:text-slate-400">{row.pointsFor}</td>
                                            <td className="px-3 py-3.5 text-center hidden sm:table-cell text-slate-600 dark:text-slate-400">{row.pointsAgainst}</td>
                                            <td className="px-3 py-3.5 text-center hidden sm:table-cell text-slate-600 dark:text-slate-400 font-mono">
                                                {row.pointsDiff > 0 ? `+${row.pointsDiff}` : row.pointsDiff}
                                            </td>
                                            {hasBonusPoints && (
                                                <td className="px-3 py-3.5 text-center hidden sm:table-cell text-slate-600 dark:text-slate-400 font-mono">{row.bonusPoints}</td>
                                            )}
                                            <td className="px-1.5 sm:px-3 py-2.5 sm:py-3.5 text-center font-bold text-slate-900 dark:text-white">{row.points}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Fixtures / Matches */}
                        {stageMatches.length > 0 && (
                            <div className="space-y-3 pt-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    {t('tournament:bracket.fixtures')}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {stageMatches.map(m => (
                                        <MatchCard key={m.id} match={m} compact />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

