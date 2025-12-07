import { useMemo } from 'react';
import { PublicStanding } from '../../../api/public.api';

interface PublicTournamentPoolsProps {
    standings: PublicStanding[];
}

export function PublicTournamentPools({ standings }: PublicTournamentPoolsProps) {

    // Group by Pool Name
    const groupedStandings = useMemo(() => {
        const groups: Record<string, PublicStanding[]> = {};
        standings.forEach(s => {
            const poolName = s.poolName || 'Unassigned';
            if (!groups[poolName]) groups[poolName] = [];
            groups[poolName].push(s);
        });
        return groups;
    }, [standings]);

    const sortedPoolNames = Object.keys(groupedStandings).sort();

    if (sortedPoolNames.length === 0) {
        return (
            <div className="text-center py-12 text-slate-500">
                No pool standings available.
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {sortedPoolNames.map(poolName => {
                const poolStandings = groupedStandings[poolName];
                return (
                    <div key={poolName} className="space-y-4">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white px-1">
                            {poolName}
                        </h3>
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                                    <tr>
                                        <th className="px-4 py-3">Team</th>
                                        <th className="px-3 py-3 text-center">P</th>
                                        <th className="px-3 py-3 text-center">W</th>
                                        <th className="px-3 py-3 text-center">D</th>
                                        <th className="px-3 py-3 text-center">L</th>
                                        <th className="px-3 py-3 text-center hidden sm:table-cell">PF</th>
                                        <th className="px-3 py-3 text-center hidden sm:table-cell">PA</th>
                                        <th className="px-3 py-3 text-center">Diff</th>
                                        <th className="px-3 py-3 text-center font-bold">Pts</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {poolStandings.map((team, idx) => (
                                        <tr key={team.teamName} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-400 w-4">{idx + 1}</span>
                                                    {team.teamName}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-center text-slate-600 dark:text-slate-400">{team.played}</td>
                                            <td className="px-3 py-3 text-center text-slate-600 dark:text-slate-400">{team.won}</td>
                                            <td className="px-3 py-3 text-center text-slate-600 dark:text-slate-400">{team.drawn}</td>
                                            <td className="px-3 py-3 text-center text-slate-600 dark:text-slate-400">{team.lost}</td>
                                            <td className="px-3 py-3 text-center hidden sm:table-cell text-slate-500">{team.pointsFor}</td>
                                            <td className="px-3 py-3 text-center hidden sm:table-cell text-slate-500">{team.pointsAgainst}</td>
                                            <td className="px-3 py-3 text-center text-slate-600 dark:text-slate-400">
                                                <span className={team.pointsDiff > 0 ? "text-green-600 dark:text-green-400" : (team.pointsDiff < 0 ? "text-red-500 dark:text-red-400" : "")}>
                                                    {team.pointsDiff > 0 ? `+${team.pointsDiff}` : team.pointsDiff}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-center font-bold text-slate-900 dark:text-white">{team.points}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
