import React from 'react';
import { MatchResponse, TournamentStageResponse } from '../../types';
import { Trophy } from '@phosphor-icons/react';

interface BracketViewProps {
    stages: TournamentStageResponse[];
    matches: MatchResponse[];
}

const BracketView: React.FC<BracketViewProps> = ({ stages, matches }) => {
    // Filter for knockout stages only
    const knockoutStages = stages
        .filter(s => s.knockoutStage)
        .sort((a, b) => a.displayOrder - b.displayOrder);

    const getMatchesForStage = (stageId: string) => {
        const stage = knockoutStages.find(s => s.id === stageId);
        if (!stage) return [];

        return matches
            .filter(m => m.phase === stage.name) // Legacy fallback: check backend if phase vs stage.name is reliable
            .sort((a, b) => (a.matchCode || '').localeCompare(b.matchCode || ''));
    };

    if (knockoutStages.length === 0) {
        return (
            <div className="text-center py-12 text-slate-500 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <Trophy className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No bracket stages found.</p>
                <p className="text-sm text-slate-400 mt-1">Ensure stages are marked as "Knockout" in Format settings.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto pb-4">
            <div className="flex gap-8 min-w-max px-4">
                {knockoutStages.map((stage) => {
                    const stageMatches = getMatchesForStage(stage.id);

                    return (
                        <div key={stage.id} className="min-w-[280px] flex flex-col gap-4">
                            <div className="text-center font-bold text-slate-900 dark:text-white uppercase tracking-wider text-sm border-b pb-2 border-slate-200 dark:border-slate-800">
                                {stage.name}
                            </div>

                            <div className="flex flex-col justify-center gap-6 h-full">
                                {stageMatches.length > 0 ? (
                                    stageMatches.map((match) => (
                                        <div
                                            key={match.id}
                                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm p-3 relative"
                                        >
                                            <div className="flex justify-between items-center mb-2 text-xs text-slate-500 dark:text-slate-400">
                                                <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                                                    {match.matchCode && match.matchCode.length < 10 ? match.matchCode : 'Match'}
                                                </span>
                                                <span>{new Date(match.matchDate).toLocaleDateString()}</span>
                                            </div>

                                            <div className="space-y-2">
                                                {/* Home Team */}
                                                <div className="flex justify-between items-center">
                                                    <span className={`font-medium truncate max-w-[160px] ${(match.homeScore ?? 0) > (match.awayScore ?? 0) ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                                                        {match.homeTeamName || 'TBD'}
                                                    </span>
                                                    <span className="font-mono text-slate-900 dark:text-slate-200">{match.status === 'SCHEDULED' ? '-' : match.homeScore ?? 0}</span>
                                                </div>

                                                {/* Away Team */}
                                                <div className="flex justify-between items-center">
                                                    <span className={`font-medium truncate max-w-[160px] ${(match.awayScore ?? 0) > (match.homeScore ?? 0) ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                                                        {match.awayTeamName || 'TBD'}
                                                    </span>
                                                    <span className="font-mono text-slate-900 dark:text-slate-200">{match.status === 'SCHEDULED' ? '-' : match.awayScore ?? 0}</span>
                                                </div>
                                            </div>

                                            {/* Status Badge */}
                                            {match.status === 'LIVE' && (
                                                <div className="absolute top-2 right-2 flex gap-1">
                                                    <span className="animate-pulse w-2 h-2 rounded-full bg-red-500"></span>
                                                </div>
                                            )}

                                            {stage.name.toLowerCase().includes('final') && !stage.name.toLowerCase().includes('semi') && match.status === 'COMPLETED' && (
                                                <div className="absolute -top-3 -right-3 bg-yellow-400 text-yellow-900 p-1 rounded-full shadow-md z-10">
                                                    <Trophy className="w-4 h-4" weight="fill" />
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    // Empty state placeholders
                                    Array.from({ length: stage.name.includes('Final') ? 1 : 2 }).map((_, i) => (
                                        <div key={i} className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center text-center opacity-70">
                                            <span className="text-slate-400 text-xs font-medium italic">
                                                Waiting for Results
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default BracketView;
