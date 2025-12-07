import { Standings } from '@/types';

interface StandingsTableProps {
    poolName: string;
    standings: Standings[];
}

export function StandingsTable({ poolName, standings }: StandingsTableProps) {
    if (!standings || standings.length === 0) return null;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow border border-slate-200 dark:border-slate-800 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <h3 className="font-semibold text-slate-900 dark:text-white">{poolName}</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                        <tr>
                            <th className="px-6 py-3 font-medium">Pos</th>
                            <th className="px-6 py-3 font-medium">Team</th>
                            <th className="px-4 py-3 font-medium text-center">P</th>
                            <th className="px-4 py-3 font-medium text-center">W</th>
                            <th className="px-4 py-3 font-medium text-center">D</th>
                            <th className="px-4 py-3 font-medium text-center">L</th>
                            <th className="px-4 py-3 font-medium text-center hidden md:table-cell">PF</th>
                            <th className="px-4 py-3 font-medium text-center hidden md:table-cell">PA</th>
                            <th className="px-4 py-3 font-medium text-center">PD</th>
                            <th className="px-6 py-3 font-medium text-center">Pts</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {standings.map((team, index) => (
                            <tr key={team.teamId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="px-6 py-4 font-medium">{index + 1}</td>
                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{team.teamName}</td>
                                <td className="px-4 py-4 text-center">{team.played}</td>
                                <td className="px-4 py-4 text-center">{team.won}</td>
                                <td className="px-4 py-4 text-center">{team.drawn}</td>
                                <td className="px-4 py-4 text-center">{team.lost}</td>
                                <td className="px-4 py-4 text-center hidden md:table-cell">{team.pointsFor}</td>
                                <td className="px-4 py-4 text-center hidden md:table-cell">{team.pointsAgainst}</td>
                                <td className={`px-4 py-4 text-center ${team.pointsDiff > 0 ? 'text-green-600' : team.pointsDiff < 0 ? 'text-red-600' : ''}`}>
                                    {team.pointsDiff > 0 ? '+' : ''}{team.pointsDiff}
                                </td>
                                <td className="px-6 py-4 text-center font-bold text-slate-900 dark:text-white">{team.points}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
