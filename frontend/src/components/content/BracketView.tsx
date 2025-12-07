import React from 'react';
import { MatchResponse, TournamentStageResponse } from '../../types';
import { format } from 'date-fns';

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
        return matches
            .filter(m => m.phase === knockoutStages.find(s => s.id === stageId)?.name)
            .sort((a, b) => (a.matchCode || '').localeCompare(b.matchCode || ''));
    };


    return (
        <div className="overflow-x-auto min-h-[600px] flex gap-8 p-4">
            {knockoutStages.map((stage) => {
                const stageMatches = getMatchesForStage(stage.id);

                return (
                    <div key={stage.id} className="min-w-[300px] flex flex-col gap-6">
                        <div className="text-center pb-4 border-b border-light-white/10">
                            <h3 className="text-lg font-bold text-white uppercase tracking-wider">{stage.name}</h3>
                        </div>

                        <div className="flex flex-col justify-center gap-8 h-full">
                            {stageMatches.length > 0 ? (
                                stageMatches.map((match) => (
                                    <div key={match.id} className="glass-panel p-4 relative group hover:border-brand-yellow/50 transition-colors">
                                        <div className="absolute top-2 right-2 text-xs text-light-gray font-mono">{match.matchCode}</div>

                                        <div className="flex flex-col gap-3 mt-4">
                                            {/* Home Team */}
                                            <div className="flex justify-between items-center p-2 rounded bg-light-white/5">
                                                <span className={`font-semibold ${(match.homeScore ?? 0) > (match.awayScore ?? 0) ? 'text-brand-yellow' : 'text-white'}`}>
                                                    {match.homeTeamName || 'TBD'}
                                                </span>
                                                {match.status === 'COMPLETED' && (
                                                    <span className="font-mono font-bold text-lg">{match.homeScore ?? 0}</span>
                                                )}
                                            </div>

                                            {/* Away Team */}
                                            <div className="flex justify-between items-center p-2 rounded bg-light-white/5">
                                                <span className={`font-semibold ${(match.awayScore ?? 0) > (match.homeScore ?? 0) ? 'text-brand-yellow' : 'text-white'}`}>
                                                    {match.awayTeamName || 'TBD'}
                                                </span>
                                                {match.status === 'COMPLETED' && (
                                                    <span className="font-mono font-bold text-lg">{match.awayScore ?? 0}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-3 flex justify-between items-center text-xs text-light-gray">
                                            <span>{format(new Date(match.matchDate), 'MMM d')} - {match.kickOffTime}</span>
                                            <span className={`px-2 py-0.5 rounded-full ${match.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                                                match.status === 'LIVE' ? 'bg-red-500/20 text-red-400 animate-pulse' :
                                                    'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                {match.status}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                // Empty state (placeholders)
                                Array.from({ length: stage.name.includes('Final') ? 1 : 2 }).map((_, i) => (
                                    <div key={i} className="glass-panel p-4 h-32 flex items-center justify-center border-dashed border-light-white/20">
                                        <span className="text-light-gray text-sm italic">Match TBD</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default BracketView;
