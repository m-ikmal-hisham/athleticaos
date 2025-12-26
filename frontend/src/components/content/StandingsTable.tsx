import React from 'react';
import { StandingsResponse } from '../../types';

interface StandingsTableProps {
    standings: StandingsResponse[];
}

const StandingsTable: React.FC<StandingsTableProps> = ({ standings }) => {
    // Group standings by pool
    const pools = standings.reduce((acc, curr) => {
        const pool = curr.poolName || 'Pool A';
        if (!acc[pool]) acc[pool] = [];
        acc[pool].push(curr);
        return acc;
    }, {} as Record<string, StandingsResponse[]>);

    return (
        <div className="space-y-8">
            {Object.entries(pools).map(([poolName, poolStandings]) => (
                <div key={poolName} className="glass-panel overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-2xl">
                    <div className="px-6 py-4 border-b border-slate-200/50 dark:border-white/10 bg-slate-100/30 dark:bg-white/5">
                        <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            {poolName}
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-100/50 dark:bg-white/5 text-left text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold tracking-wider">
                                    <th className="px-6 py-4 whitespace-nowrap">Pos</th>
                                    <th className="px-6 py-4 w-full">Team</th>
                                    <th className="px-4 py-4 text-center">Pld</th>
                                    <th className="px-4 py-4 text-center">W</th>
                                    <th className="px-4 py-4 text-center">D</th>
                                    <th className="px-4 py-4 text-center">L</th>
                                    <th className="px-4 py-4 text-center">PF</th>
                                    <th className="px-4 py-4 text-center">PA</th>
                                    <th className="px-4 py-4 text-center">+/-</th>
                                    <th className="px-6 py-4 text-center font-bold text-slate-900 dark:text-white">Pts</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/50 dark:divide-white/5">
                                {poolStandings.map((team, index) => (
                                    <tr key={team.teamId} className="hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400 font-medium">
                                            {index + 1}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-sm font-bold text-slate-700 dark:text-brand-yellow">
                                                    {team.teamName.charAt(0)}
                                                </div>
                                                <span className="font-semibold text-slate-900 dark:text-white">{team.teamName}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-slate-600 dark:text-slate-400">{team.played}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-slate-600 dark:text-slate-400">{team.won}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-slate-600 dark:text-slate-400">{team.drawn}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-slate-600 dark:text-slate-400">{team.lost}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-slate-600 dark:text-slate-400">{team.pointsFor}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-slate-600 dark:text-slate-400">{team.pointsAgainst}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-slate-600 dark:text-slate-400">{team.pointsDiff}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-blue-600 dark:text-brand-yellow font-bold text-lg">
                                            {team.points}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default StandingsTable;
