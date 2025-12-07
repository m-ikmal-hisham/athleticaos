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
                <div key={poolName} className="glass-panel overflow-hidden">
                    <div className="px-6 py-4 border-b border-light-white/10">
                        <h3 className="text-xl font-display font-bold text-white uppercase tracking-wider">
                            {poolName}
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-light-white/5 text-left text-xs uppercase text-light-gray font-semibold tracking-wider">
                                    <th className="px-6 py-4 whitespace-nowrap">Pos</th>
                                    <th className="px-6 py-4 w-full">Team</th>
                                    <th className="px-4 py-4 text-center">Pld</th>
                                    <th className="px-4 py-4 text-center">W</th>
                                    <th className="px-4 py-4 text-center">D</th>
                                    <th className="px-4 py-4 text-center">L</th>
                                    <th className="px-4 py-4 text-center">PF</th>
                                    <th className="px-4 py-4 text-center">PA</th>
                                    <th className="px-4 py-4 text-center">+/-</th>
                                    <th className="px-6 py-4 text-center font-bold text-white">Pts</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-light-white/5">
                                {poolStandings.map((team, index) => (
                                    <tr key={team.teamId} className="hover:bg-light-white/5 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-light-gray font-medium">
                                            {index + 1}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-light-white/10 flex items-center justify-center text-sm font-bold text-brand-yellow">
                                                    {team.teamName.charAt(0)}
                                                </div>
                                                <span className="font-semibold text-white">{team.teamName}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-light-gray">{team.played}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-light-gray">{team.won}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-light-gray">{team.drawn}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-light-gray">{team.lost}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-light-gray">{team.pointsFor}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-light-gray">{team.pointsAgainst}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-light-gray">{team.pointsDiff}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-brand-yellow font-bold text-lg">
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
