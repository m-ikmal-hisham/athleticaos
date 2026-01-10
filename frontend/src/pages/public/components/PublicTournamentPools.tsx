import { useMemo, useState } from 'react';
import { PublicStanding } from '../../../api/public.api';
import { CaretDown, CaretUp, CaretUpDown } from '@phosphor-icons/react';

interface PublicTournamentPoolsProps {
    standings: PublicStanding[];
}

type SortField = 'played' | 'won' | 'drawn' | 'lost' | 'pointsFor' | 'pointsAgainst' | 'pointsDiff' | 'points' | 'teamName';
type SortDirection = 'asc' | 'desc';

export function PublicTournamentPools({ standings }: PublicTournamentPoolsProps) {
    const [sortConfig, setSortConfig] = useState<{ field: SortField; direction: SortDirection }>({
        field: 'points',
        direction: 'desc'
    });

    const handleSort = (field: SortField) => {
        setSortConfig(current => ({
            field,
            direction: current.field === field && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    // Group by Pool Name
    const groupedStandings = useMemo(() => {
        const groups: Record<string, PublicStanding[]> = {};

        // Sort standings first based on config
        const sortedStandings = [...standings].sort((a, b) => {
            const field = sortConfig.field;
            let comparison = 0;

            if (field === 'teamName') {
                comparison = a.teamName.localeCompare(b.teamName);
            } else {
                comparison = (a[field] as number) - (b[field] as number);
            }

            return sortConfig.direction === 'asc' ? comparison : -comparison;
        });

        sortedStandings.forEach(s => {
            const poolName = s.poolName || 'Unassigned';
            if (!groups[poolName]) groups[poolName] = [];
            groups[poolName].push(s);
        });
        return groups;
    }, [standings, sortConfig]);

    const sortedPoolNames = Object.keys(groupedStandings).sort();

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortConfig.field !== field) return <CaretUpDown className="w-3 h-3 opacity-30" />;
        return sortConfig.direction === 'asc' ? <CaretUp className="w-3 h-3 text-blue-500" /> : <CaretDown className="w-3 h-3 text-blue-500" />;
    };

    const SortableHeader = ({ field, label, align = 'center', hiddenOnMobile = false }: { field: SortField, label: string, align?: 'left' | 'center', hiddenOnMobile?: boolean }) => (
        <th
            className={`px-3 py-3 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/5 transition-colors select-none ${align === 'left' ? 'text-left' : 'text-center'} ${hiddenOnMobile ? 'hidden sm:table-cell' : ''}`}
            onClick={() => handleSort(field)}
        >
            <div className={`flex items-center gap-1 ${align === 'center' ? 'justify-center' : ''}`}>
                {label}
                <SortIcon field={field} />
            </div>
        </th>
    );

    if (sortedPoolNames.length === 0) {
        return (
            <div className="text-center py-12 text-slate-500 glass-panel bg-white/50 backdrop-blur-sm rounded-xl border border-dashed border-slate-300 dark:border-white/10">
                No pool standings available.
            </div>
        );
    }

    return (
        <div className="space-y-12">
            {sortedPoolNames.map(poolName => {
                const poolStandings = groupedStandings[poolName];
                return (
                    <div key={poolName} className="glass-panel overflow-hidden bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-2xl shadow-xl shadow-slate-200/20 dark:shadow-none">
                        <div className="px-6 py-4 border-b border-slate-200/50 dark:border-white/5 bg-gradient-to-r from-slate-50/80 to-transparent dark:from-white/5 dark:to-transparent">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-blue-500 rounded-full" />
                                {poolName}
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-100/50 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-xs">
                                    <tr>
                                        <th className="px-4 py-3 text-left w-12">Pos</th>
                                        <SortableHeader field="teamName" label="Team" align="left" />
                                        <SortableHeader field="played" label="Pwd" />
                                        <SortableHeader field="won" label="W" />
                                        <SortableHeader field="drawn" label="D" />
                                        <SortableHeader field="lost" label="L" />
                                        <SortableHeader field="pointsFor" label="PF" hiddenOnMobile />
                                        <SortableHeader field="pointsAgainst" label="PA" hiddenOnMobile />
                                        <SortableHeader field="pointsDiff" label="+/-" />
                                        <SortableHeader field="points" label="Pts" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {poolStandings.map((team, idx) => (
                                        <tr key={team.teamName} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group">
                                            <td className="px-4 py-4 font-mono font-bold text-slate-400 dark:text-slate-500">
                                                {idx + 1}
                                            </td>
                                            <td className="px-3 py-4">
                                                <div className="flex items-center gap-4">
                                                    {/* Transparent Logo Placeholder */}
                                                    <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center">
                                                        {team.teamLogoUrl ? (
                                                            <img
                                                                src={team.teamLogoUrl.startsWith('http') ? team.teamLogoUrl : `${(import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1').replace('/api/v1', '')}${team.teamLogoUrl}`}
                                                                alt={team.teamName}
                                                                className="w-full h-full object-contain filter drop-shadow-md group-hover:scale-110 transition-transform duration-300"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                                                                <span className="text-sm font-bold text-slate-400">{team.teamName.charAt(0)}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Text Logic: Priority Short Name, Small Full Name */}
                                                    <div className="flex flex-col">
                                                        <span className="text-lg font-black text-slate-800 dark:text-white leading-none">
                                                            {team.teamShortName || team.teamName}
                                                        </span>
                                                        {team.teamShortName && (
                                                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[150px] sm:max-w-[200px]">
                                                                {team.teamName}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 text-center text-slate-600 dark:text-slate-400 font-medium">{team.played}</td>
                                            <td className="px-3 py-4 text-center text-slate-600 dark:text-slate-400">{team.won}</td>
                                            <td className="px-3 py-4 text-center text-slate-600 dark:text-slate-400">{team.drawn}</td>
                                            <td className="px-3 py-4 text-center text-slate-600 dark:text-slate-400">{team.lost}</td>
                                            <td className="px-3 py-4 text-center hidden sm:table-cell text-slate-500">{team.pointsFor}</td>
                                            <td className="px-3 py-4 text-center hidden sm:table-cell text-slate-500">{team.pointsAgainst}</td>
                                            <td className="px-3 py-4 text-center font-medium">
                                                <span className={`${team.pointsDiff > 0 ? "text-green-600 dark:text-green-400" : (team.pointsDiff < 0 ? "text-red-500 dark:text-red-400" : "text-slate-500")}`}>
                                                    {team.pointsDiff > 0 ? `+${team.pointsDiff}` : team.pointsDiff}
                                                </span>
                                            </td>
                                            <td className="px-3 py-4 text-center">
                                                <span className="inline-block min-w-[2rem] py-1 px-2 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white font-black">
                                                    {team.points}
                                                </span>
                                            </td>
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
