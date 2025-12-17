import { useEffect, useState } from 'react';
import { useStatsStore } from '@/store/stats.store';
import { fetchTournaments } from '@/api/tournaments.api';
import { Trophy, Users, Activity, AlertCircle, Flag, Award } from 'lucide-react';

interface Tournament {
    id: string;
    name: string;
    level: string;
}

export default function Stats() {
    const {
        selectedTournamentId,
        summary,
        playerStats,
        teamStats,
        loading,
        error,
        setSelectedTournamentId,
        loadStatsForTournament
    } = useStatsStore();

    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [tournamentsLoading, setTournamentsLoading] = useState(true);

    // Load tournaments on mount
    useEffect(() => {
        const loadTournaments = async () => {
            try {
                const res = await fetchTournaments();
                setTournaments(res.data);
            } catch (err) {
                console.error("Failed to load tournaments", err);
            } finally {
                setTournamentsLoading(false);
            }
        };
        loadTournaments();
    }, []);

    // Load stats when tournament changes
    useEffect(() => {
        if (selectedTournamentId) {
            loadStatsForTournament(selectedTournamentId);
        }
    }, [selectedTournamentId, loadStatsForTournament]);

    const handleTournamentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedTournamentId(e.target.value || null);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Stats & Leaderboards</h1>
                    <p className="text-muted-foreground mt-1">View tournament performance, top players and top teams.</p>
                </div>

                <div className="w-full md:w-64">
                    <select
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer hover:bg-white/10 transition-colors"
                        value={selectedTournamentId || ''}
                        onChange={handleTournamentChange}
                        disabled={tournamentsLoading}
                    >
                        <option value="">Select tournament...</option>
                        {tournaments.map((t) => (
                            <option key={t.id} value={t.id} className="bg-gray-900 text-white">
                                {t.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-500">
                    <AlertCircle className="w-5 h-5" />
                    <p>{error}</p>
                </div>
            )}

            {/* Main Content */}
            {!selectedTournamentId ? (
                <div className="glass-card p-12 text-center rounded-2xl border border-white/5">
                    <Trophy className="w-12 h-12 text-white/20 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground">No Tournament Selected</h3>
                    <p className="text-muted-foreground mt-2">Please select a tournament from the dropdown to view statistics.</p>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <SummaryCard
                            label="Total Matches"
                            value={summary?.totalMatches ?? 0}
                            icon={<Activity className="w-4 h-4 text-blue-400" />}
                        />
                        <SummaryCard
                            label="Completed"
                            value={summary?.completedMatches ?? 0}
                            icon={<Flag className="w-4 h-4 text-green-400" />}
                        />
                        <SummaryCard
                            label="Total Tries"
                            value={summary?.totalTries ?? 0}
                            icon={<Award className="w-4 h-4 text-yellow-400" />}
                        />
                        <SummaryCard
                            label="Total Points"
                            value={summary?.totalPoints ?? 0}
                            icon={<Trophy className="w-4 h-4 text-purple-400" />}
                        />
                        <SummaryCard
                            label="Yellow Cards"
                            value={summary?.totalYellowCards ?? 0}
                            icon={<div className="w-3 h-4 bg-yellow-400 rounded-sm" />}
                        />
                        <SummaryCard
                            label="Red Cards"
                            value={summary?.totalRedCards ?? 0}
                            icon={<div className="w-3 h-4 bg-red-500 rounded-sm" />}
                        />
                    </div>

                    {/* Loading Overlay */}
                    {loading && (
                        <div className="text-center py-8">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <p className="mt-2 text-muted-foreground text-sm">Loading stats...</p>
                        </div>
                    )}

                    {/* Leaderboards */}
                    {!loading && (
                        <div className="grid lg:grid-cols-2 gap-8">
                            {/* Top Players */}
                            <div className="glass-card rounded-2xl border border-white/10 overflow-hidden flex flex-col">
                                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/20 rounded-lg text-primary">
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-bold text-lg text-foreground">Top Players</h3>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-white/10 text-muted-foreground">
                                                <th className="px-6 py-4 font-medium w-16">#</th>
                                                <th className="px-6 py-4 font-medium">Player</th>
                                                <th className="px-6 py-4 font-medium">Team</th>
                                                <th className="px-6 py-4 font-medium text-right">Tries</th>
                                                <th className="px-6 py-4 font-medium text-right">Pts</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {playerStats.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                                        No player stats available yet.
                                                    </td>
                                                </tr>
                                            ) : (
                                                playerStats.map((player, idx) => (
                                                    <tr
                                                        key={player.playerId}
                                                        className="hover:bg-white/5 transition-colors cursor-pointer group"
                                                        onClick={() => window.location.href = `/dashboard/players?player=${player.playerId}`} // Backend response might need to include slug if available, using playerId as fallback or slug if stats response is updated.
                                                    // Actually StatisticsController returns PlayerStatsResponse. Does it include slug?
                                                    >
                                                        <td className="px-6 py-4 font-medium text-muted-foreground">
                                                            {idx + 1}
                                                        </td>
                                                        <td className="px-6 py-4 font-medium text-foreground group-hover:text-primary transition-colors">
                                                            {player.firstName} {player.lastName}
                                                        </td>
                                                        <td className="px-6 py-4 text-muted-foreground">
                                                            {player.teamName || '-'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-foreground font-medium">
                                                            {player.tries}
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-primary font-bold">
                                                            {player.totalPoints}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Top Teams */}
                            <div className="glass-card rounded-2xl border border-white/10 overflow-hidden flex flex-col">
                                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/20 rounded-lg text-primary">
                                            <Trophy className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-bold text-lg text-foreground">Top Teams</h3>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-white/10 text-muted-foreground">
                                                <th className="px-6 py-4 font-medium w-16">#</th>
                                                <th className="px-6 py-4 font-medium">Team</th>
                                                <th className="px-6 py-4 font-medium">Org</th>
                                                <th className="px-6 py-4 font-medium text-right">Wins</th>
                                                <th className="px-6 py-4 font-medium text-right">Pts</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {teamStats.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                                        No team stats available yet.
                                                    </td>
                                                </tr>
                                            ) : (
                                                teamStats.map((team, idx) => (
                                                    <tr key={team.teamId} className="hover:bg-white/5 transition-colors">
                                                        <td className="px-6 py-4 font-medium text-muted-foreground">
                                                            {idx + 1}
                                                        </td>
                                                        <td className="px-6 py-4 font-medium text-foreground">
                                                            {team.teamName}
                                                        </td>
                                                        <td className="px-6 py-4 text-muted-foreground">
                                                            {team.organisationName || '-'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-foreground font-medium">
                                                            {team.wins}
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-primary font-bold">
                                                            {team.tablePoints}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function SummaryCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
    return (
        <div className="glass-card p-4 rounded-xl border border-white/10 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors group">
            <div className="mb-2 p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                {icon}
            </div>
            <span className="text-2xl font-bold text-foreground">{value}</span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">{label}</span>
        </div>
    );
}
