import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicTournamentApi, PublicTournamentStats } from '../../../api/public.api';
import { Loader2, Trophy, Medal, AlertTriangle, Shield } from 'lucide-react';

interface PublicStatsProps {
    tournamentId: string;
    categoryId?: string;
}

export const PublicStats: React.FC<PublicStatsProps> = ({ tournamentId, categoryId }) => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<PublicTournamentStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const data = await publicTournamentApi.getTournamentStats(tournamentId, categoryId);
                setStats(data);
                setError(null);
            } catch (err) {
                console.error("Failed to load stats", err);
                setError("Failed to load statistics.");
            } finally {
                setLoading(false);
            }
        };

        if (tournamentId) {
            fetchStats();
        }
    }, [tournamentId, categoryId]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-skin-base" />
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="text-center py-12 text-skin-muted">
                {error || "No statistics available."}
            </div>
        );
    }

    // Checking if we have any data to show
    const hasData = stats.topTeams.length > 0 || stats.topScorers.length > 0 || stats.topOffenders.length > 0;

    if (!hasData) {
        return (
            <div className="text-center py-12 text-skin-muted">
                No statistics recorded yet for this category.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            {/* Top Teams - Large Vertical Block */}
            <div className="md:col-span-1 lg:col-span-1 row-span-2 relative group overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-md shadow-xl transition-all duration-300 hover:shadow-2xl">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 dark:from-red-500 dark:to-orange-500" />
                <div className="p-6 h-full flex flex-col">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-skin-base">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        Team Leaderboard
                    </h3>

                    <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {stats.topTeams.map((team, idx) => (
                            <div 
                                key={team.teamId} 
                                className="flex items-center justify-between p-3 rounded-xl bg-white/30 dark:bg-white/5 border border-white/20 dark:border-white/5 hover:bg-white/50 dark:hover:bg-white/10 transition-colors cursor-pointer group"
                                onClick={() => navigate(`/dashboard/teams/${team.teamId}`)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm
                                        ${idx === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                            idx === 1 ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                                                idx === 2 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                                                    'bg-transparent text-skin-muted'}`}>
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-skin-base truncate max-w-[120px]">{team.teamName}</div>
                                        <div className="text-xs text-skin-muted">{team.wins} Wins • {team.triesScored} Tries</div>
                                    </div>
                                </div>
                                <div className="text-lg font-bold text-skin-base">{team.tablePoints} <span className="text-xs font-normal text-skin-muted">pts</span></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top Scorers - Wide Block */}
            <div className="md:col-span-1 lg:col-span-2 relative group overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-md shadow-xl transition-all duration-300 hover:shadow-2xl">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500 dark:from-blue-500 dark:to-cyan-500" />
                <div className="p-6">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-skin-base">
                        <Medal className="w-5 h-5 text-blue-500 dark:text-cyan-400" />
                        Top Point Scorers
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {stats.topScorers.slice(0, 6).map((player) => (
                            <div 
                                key={player.playerId} 
                                className="flex items-center gap-4 p-3 rounded-xl bg-white/30 dark:bg-white/5 border border-white/10 hover:bg-white/40 dark:hover:bg-white/10 transition-colors cursor-pointer group"
                                onClick={() => navigate(`/dashboard/players/${player.playerId}`)}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-skin-base truncate">{player.name}</div>
                                    <div className="text-xs text-skin-muted truncate">{player.teamName}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-skin-base">{player.totalPoints}</div>
                                    <div className="text-[10px] uppercase text-skin-muted font-medium">{player.tries} Tries</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Discipline (Cards) - Square Block */}
            <div className="md:col-span-1 lg:col-span-1 relative group overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-md shadow-xl transition-all duration-300 hover:shadow-2xl">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 to-red-700" />
                <div className="p-6 h-full">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-skin-base">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        Discipline
                    </h3>

                    {stats.topOffenders.length === 0 ? (
                        <div className="h-32 flex flex-col items-center justify-center text-skin-muted opacity-60">
                            <Shield className="w-8 h-8 mb-2" />
                            <span className="text-sm">Clean Play! No cards yet.</span>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {stats.topOffenders.slice(0, 5).map((player) => (
                                <div 
                                    key={player.playerId} 
                                    className="flex items-center justify-between text-sm p-2 -mx-2 rounded-lg hover:bg-white/30 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                                    onClick={() => navigate(`/dashboard/players/${player.playerId}`)}
                                >
                                    <div className="truncate pr-2">
                                        <div className="font-medium text-skin-base">{player.name}</div>
                                        <div className="text-xs text-skin-muted truncate">{player.teamName}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        {player.redCards > 0 && (
                                            <span className="flex items-center justify-center w-6 h-8 bg-red-600 text-white text-xs font-bold rounded-sm shadow-sm" title="Red Cards">
                                                {player.redCards}
                                            </span>
                                        )}
                                        {player.yellowCards > 0 && (
                                            <span className="flex items-center justify-center w-6 h-8 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-sm shadow-sm" title="Yellow Cards">
                                                {player.yellowCards}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Top Try Scorers - Remaining Space (if wanted, or just merge with Top Scorers) */}
            <div className="md:col-span-1 lg:col-span-1 relative group overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-md shadow-xl transition-all duration-300 hover:shadow-2xl">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-green-600" />
                <div className="p-6 h-full">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-skin-base">
                        <span className="text-2xl">🏉</span>
                        Top Try Scorers
                    </h3>
                    <div className="space-y-3">
                        {stats.topScorers
                            .sort((a, b) => b.tries - a.tries) // Re-sort by tries just in case
                            .slice(0, 5)
                            .map((player) => (
                                <div 
                                    key={player.playerId + 'tries'} 
                                    className="flex items-center justify-between text-sm p-2 -mx-2 rounded-lg hover:bg-white/30 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                                    onClick={() => navigate(`/dashboard/players/${player.playerId}`)}
                                >
                                    <div className="truncate pr-2">
                                        <div className="font-medium text-skin-base">{player.name}</div>
                                        <div className="text-xs text-skin-muted truncate">{player.teamName}</div>
                                    </div>
                                    <div className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
                                        {player.tries}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            </div>

        </div>
    );
};
