import { useMemo } from 'react';
import { PublicMatchSummary } from '../../../api/public.api';
import { Trophy } from 'lucide-react';

interface PublicTournamentBracketProps {
    matches: PublicMatchSummary[];
}

// Simple visual brackets for MVP
// Groups matches by knockout stage name
export function PublicTournamentBracket({ matches }: PublicTournamentBracketProps) {
    const bracketMatches = useMemo(() => {
        // Filter out pool matches usually
        return matches.filter(m => {
            const stage = m.stage?.toLowerCase() || '';
            return !stage.includes('pool') && !stage.includes('group');
        });
    }, [matches]);

    // Group by stage name
    const grouped = useMemo(() => {
        const g: Record<string, PublicMatchSummary[]> = {};
        bracketMatches.forEach(m => {
            const stage = m.stage || 'Unassigned';
            if (!g[stage]) g[stage] = [];
            g[stage].push(m);
        });
        return g;
    }, [bracketMatches]);

    // Sort stages typically: Round of 16 -> Quarter Final -> Semi Final -> Final
    // Heuristic sort based on keywords
    const stageOrder = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('final') && !n.includes('semi') && !n.includes('quarter')) return 100;
        if (n.includes('third') || n.includes('3rd')) return 90;
        if (n.includes('semi')) return 50;
        if (n.includes('quarter')) return 25;
        if (n.includes('16')) return 16;
        return 0;
    };

    const sortedStageNames = Object.keys(grouped).sort((a, b) => stageOrder(a) - stageOrder(b));

    if (sortedStageNames.length === 0) {
        return (
            <div className="text-center py-12 text-slate-500">
                No knockout stages found.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto pb-4">
            <div className="flex gap-8 min-w-max px-4">
                {sortedStageNames.map(stageName => (
                    <div key={stageName} className="flex flex-col gap-4 min-w-[280px]">
                        <div className="text-center font-bold text-slate-900 dark:text-white uppercase tracking-wider text-sm border-b pb-2 border-slate-200 dark:border-slate-800">
                            {stageName}
                        </div>
                        <div className="flex flex-col justify-center gap-6 h-full">
                            {grouped[stageName].map(match => (
                                <div
                                    key={match.id}
                                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm p-3 relative"
                                >
                                    <div className="flex justify-between items-center mb-2 text-xs text-slate-500">
                                        <span>{match.code || 'TBD'}</span>
                                        <span>{new Date(match.matchDate).toLocaleDateString()}</span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className={`font-medium truncate ${match.homeScore! > match.awayScore! ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                                                {match.homeTeamName}
                                            </span>
                                            <span className="font-mono">{match.homeScore ?? '-'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className={`font-medium truncate ${match.awayScore! > match.homeScore! ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                                                {match.awayTeamName}
                                            </span>
                                            <span className="font-mono">{match.awayScore ?? '-'}</span>
                                        </div>
                                    </div>
                                    {stageName.toLowerCase().includes('final') && !stageName.toLowerCase().includes('semi') && match.status === 'COMPLETED' && (
                                        <div className="absolute -top-3 -right-3 bg-yellow-400 text-yellow-900 p-1 rounded-full shadow-md">
                                            <Trophy className="w-4 h-4" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
