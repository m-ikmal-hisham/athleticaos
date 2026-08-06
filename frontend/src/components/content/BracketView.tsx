import React, { useMemo } from 'react';
import { MatchResponse, TournamentStageResponse } from '../../types';
import { Trophy, CaretRight } from '@phosphor-icons/react';
import { buildBracketGroups, getWinningSide } from '@/utils/bracketUtils';

interface BracketViewProps {
    stages: TournamentStageResponse[];
    matches: MatchResponse[];
}

/**
 * Read-only bracket for the organiser's Bracket tab.
 *
 * Shares `buildBracketGroups` with the editor and the public site so all three agree on how a
 * tournament is grouped. This view previously laid stages out flat in display order, which
 * meant an organiser previewing their own bracket saw a different structure from the one
 * published to the public page.
 */
const BracketView: React.FC<BracketViewProps> = ({ stages, matches }) => {
    const bracketGroups = useMemo(
        () => buildBracketGroups(matches, stages.filter(s => s.knockoutStage)),
        [matches, stages],
    );

    if (bracketGroups.length === 0) {
        return (
            <div className="text-center py-12 text-slate-500 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <Trophy className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No bracket stages found.</p>
                <p className="text-sm text-slate-400 mt-1">Ensure stages are marked as "Knockout" in Format settings.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {bracketGroups.map((bracket) => (
                <div
                    key={bracket.id}
                    className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5"
                >
                    <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
                        <Trophy className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-white">
                            {bracket.title}
                        </h3>
                    </div>

                    <div className="overflow-x-auto pb-2">
                        <div className="flex gap-8 min-w-max">
                            {bracket.rounds.map((round, roundIdx) => (
                                <div key={round.id} className="min-w-[280px] flex flex-col gap-4">
                                    <div className="text-center font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs border-b pb-2 border-slate-200 dark:border-slate-800 flex items-center justify-center gap-1.5">
                                        <span>{round.name}</span>
                                        {roundIdx < bracket.rounds.length - 1 && (
                                            <CaretRight className="w-3.5 h-3.5 opacity-50" />
                                        )}
                                    </div>

                                    <div className="flex flex-col justify-center gap-6 h-full">
                                        {round.matches.length > 0 ? (
                                            round.matches.map((match) => {
                                                const winningSide = getWinningSide(match);
                                                const isDecided = match.status === 'COMPLETED';
                                                const isFinal = round.name.toLowerCase().includes('final')
                                                    && !round.name.toLowerCase().includes('semi');

                                                return (
                                                    <div
                                                        key={match.id}
                                                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm p-3 relative"
                                                    >
                                                        <div className="flex justify-between items-center mb-2 text-xs text-slate-500 dark:text-slate-400">
                                                            <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                                                                {match.matchNumber ? `Match ${match.matchNumber}` : (match.matchCode && match.matchCode.length < 10 ? match.matchCode : 'Match')}
                                                            </span>
                                                            {match.resultType && match.resultType !== 'NORMAL' ? (
                                                                <span className="uppercase text-[10px] font-bold tracking-wider text-amber-600 dark:text-amber-400">
                                                                    {match.resultType === 'BYE' ? 'Bye' : 'Walkover'}
                                                                </span>
                                                            ) : (
                                                                <span>{match.matchDate ? new Date(match.matchDate).toLocaleDateString() : ''}</span>
                                                            )}
                                                        </div>

                                                        <div className="space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <span className={`font-medium truncate max-w-[160px] ${winningSide === 'home' ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                                                                    {match.homeTeamName || match.homeTeamPlaceholder || 'TBD'}
                                                                </span>
                                                                <span className="font-mono text-slate-900 dark:text-slate-200">
                                                                    {isDecided && match.homeScore != null ? match.homeScore : '-'}
                                                                </span>
                                                            </div>

                                                            <div className="flex justify-between items-center">
                                                                <span className={`font-medium truncate max-w-[160px] ${winningSide === 'away' ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                                                                    {match.awayTeamName || match.awayTeamPlaceholder || 'TBD'}
                                                                </span>
                                                                <span className="font-mono text-slate-900 dark:text-slate-200">
                                                                    {isDecided && match.awayScore != null ? match.awayScore : '-'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {match.status === 'LIVE' && (
                                                            <div className="absolute top-2 right-2 flex gap-1">
                                                                <span className="animate-pulse w-2 h-2 rounded-full bg-red-500"></span>
                                                            </div>
                                                        )}

                                                        {isFinal && match.status === 'COMPLETED' && (
                                                            <div className="absolute -top-3 -right-3 bg-yellow-400 text-yellow-900 p-1 rounded-full shadow-md z-10">
                                                                <Trophy className="w-4 h-4" weight="fill" />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center text-center opacity-70">
                                                <span className="text-slate-400 text-xs font-medium italic">
                                                    No matches yet
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default BracketView;
