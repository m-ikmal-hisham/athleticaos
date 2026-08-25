import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicTournamentApi, PublicTournamentStats, PublicPlayerStatEntry } from '../../../api/public.api';
import { Loader2, Trophy, Medal, AlertTriangle, Shield, Target, Zap, Search, ChevronDown, ChevronUp } from 'lucide-react';

interface PublicStatsProps {
    tournamentId: string;
    categoryId?: string;
}

// ─── Reusable expandable player list with search ───────────────────────────
interface PlayerListSectionProps {
    players: PublicPlayerStatEntry[];
    renderRow: (player: PublicPlayerStatEntry, idx: number) => React.ReactNode;
    emptyIcon?: React.ReactNode;
    emptyMessage?: string;
    defaultVisible?: number;
}

const PlayerListSection: React.FC<PlayerListSectionProps> = ({
    players,
    renderRow,
    emptyIcon,
    emptyMessage = 'No data yet.',
    defaultVisible = 5,
}) => {
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState(false);

    const filtered = useMemo(() => {
        if (!search.trim()) return players;
        const q = search.toLowerCase();
        return players.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                (p.teamName && p.teamName.toLowerCase().includes(q))
        );
    }, [players, search]);

    const isSearchActive = search.trim().length > 0;
    const visible = isSearchActive || expanded ? filtered : filtered.slice(0, defaultVisible);
    const hasMore = !isSearchActive && filtered.length > defaultVisible;

    if (players.length === 0) {
        return (
            <div className="h-32 flex flex-col items-center justify-center text-skin-muted opacity-60">
                {emptyIcon || <Shield className="w-8 h-8 mb-2" />}
                <span className="text-sm">{emptyMessage}</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {/* Search input */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-skin-muted pointer-events-none" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search player or team..."
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-white/30 dark:bg-white/5 border border-white/20 dark:border-white/10 text-skin-base placeholder:text-skin-muted/60 focus:outline-none focus:ring-2 focus:ring-blue-400/40 dark:focus:ring-cyan-400/40 transition-all"
                />
            </div>

            {/* Player rows */}
            <div className="space-y-2">
                {visible.map((player, idx) => (
                    <React.Fragment key={player.playerId + '-' + idx}>
                        {renderRow(player, idx)}
                    </React.Fragment>
                ))}
            </div>

            {/* Show more / show less toggle */}
            {hasMore && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="mt-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-500 dark:text-cyan-400 hover:text-blue-600 dark:hover:text-cyan-300 transition-colors py-2 rounded-xl hover:bg-white/20 dark:hover:bg-white/5"
                >
                    {expanded ? (
                        <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            Show Less
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            Show All ({filtered.length})
                        </>
                    )}
                </button>
            )}

            {/* No results from search */}
            {isSearchActive && filtered.length === 0 && (
                <div className="text-center text-sm text-skin-muted py-4 opacity-60">
                    No players match "{search}"
                </div>
            )}
        </div>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────
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

    // Derive try scorers: prefer dedicated list, fallback to re-sorting topScorers
    const tryScorers: PublicPlayerStatEntry[] = (stats.topTryScorers && stats.topTryScorers.length > 0)
        ? stats.topTryScorers
        : [...stats.topScorers].sort((a, b) => b.tries - a.tries).filter(p => p.tries > 0);

    // Checking if we have any data to show
    const hasData = stats.topScorers.length > 0 || stats.topOffenders.length > 0 || tryScorers.length > 0;
    const totalYellowCards = stats.totalYellowCards ?? stats.topOffenders.reduce((total, player) => total + player.yellowCards, 0);
    const totalRedCards = stats.totalRedCards ?? stats.topOffenders.reduce((total, player) => total + player.redCards, 0);
    const disciplinedPlayers = stats.topOffenders.filter(player => player.yellowCards > 0 || player.redCards > 0).length;

    if (!hasData) {
        return (
            <div className="text-center py-12 text-skin-muted">
                No statistics recorded yet for this category.
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Tournament Global Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl border border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-md shadow-sm flex flex-col items-center justify-center text-center">
                    <Medal className="w-6 h-6 text-yellow-500 mb-2" />
                    <div className="text-2xl font-black text-skin-base">{stats.totalTries ?? 0}</div>
                    <div className="text-xs font-semibold text-skin-muted uppercase tracking-wider">Tries</div>
                </div>
                <div className="p-4 rounded-2xl border border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-md shadow-sm flex flex-col items-center justify-center text-center">
                    <Trophy className="w-6 h-6 text-purple-500 mb-2" />
                    <div className="text-2xl font-black text-skin-base">{stats.totalPoints ?? 0}</div>
                    <div className="text-xs font-semibold text-skin-muted uppercase tracking-wider">Points</div>
                </div>
                <div className="p-4 rounded-2xl border border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-md shadow-sm flex flex-col items-center justify-center text-center">
                    <Target className="w-6 h-6 text-green-500 mb-2" />
                    <div className="text-2xl font-black text-skin-base">{stats.totalConversions ?? 0}</div>
                    <div className="text-xs font-semibold text-skin-muted uppercase tracking-wider">Conversions</div>
                </div>
                <div className="p-4 rounded-2xl border border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-md shadow-sm flex flex-col items-center justify-center text-center">
                    <Zap className="w-6 h-6 text-orange-500 mb-2" />
                    <div className="text-2xl font-black text-skin-base">{stats.totalPenalties ?? 0}</div>
                    <div className="text-xs font-semibold text-skin-muted uppercase tracking-wider">Penalties</div>
                </div>
            </div>

            {/* Top Point Scorers — Full Width */}
            <div className="relative group overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-md shadow-xl transition-all duration-300 hover:shadow-2xl">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500 dark:from-blue-500 dark:to-cyan-500" />
                <div className="p-6">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-skin-base">
                        <Medal className="w-5 h-5 text-blue-500 dark:text-cyan-400" />
                        Top Point Scorers
                    </h3>

                    <PlayerListSection
                        players={stats.topScorers}
                        emptyMessage="No scoring data yet."
                        renderRow={(player) => (
                            <div
                                className="flex items-center gap-4 p-3 rounded-xl bg-white/30 dark:bg-white/5 border border-white/10 hover:bg-white/40 dark:hover:bg-white/10 transition-colors cursor-pointer group"
                                onClick={() => navigate(`/players/${player.playerId}`)}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-skin-base truncate">{player.name}</div>
                                    <div className="text-xs text-skin-muted truncate">{player.teamName}</div>
                                    <div className="flex gap-3 mt-1.5 text-[10px] uppercase font-medium text-skin-muted">
                                        <span>{player.tries} T</span>
                                        <span className="text-green-500 dark:text-green-400">{player.conversions} C</span>
                                        <span className="text-orange-500 dark:text-orange-400">{player.penalties} P</span>
                                        {player.dropGoals > 0 && (
                                            <span className="text-purple-500 dark:text-purple-400">{player.dropGoals} DG</span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-skin-base">{player.totalPoints}</div>
                                    <div className="text-[10px] uppercase text-skin-muted font-medium">pts</div>
                                </div>
                            </div>
                        )}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Discipline (Cards) */}
                <div className="relative group overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-md shadow-xl transition-all duration-300 hover:shadow-2xl">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 to-red-700" />
                    <div className="p-6 h-full">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-skin-base">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            Discipline
                        </h3>

                        <div className="grid grid-cols-3 gap-2 mb-4" aria-label="Tournament discipline summary">
                            <div className="rounded-xl border border-yellow-300/50 dark:border-yellow-500/20 bg-yellow-50/70 dark:bg-yellow-500/10 p-3 text-center">
                                <div className="text-xl font-black text-yellow-700 dark:text-yellow-400">{totalYellowCards}</div>
                                <div className="text-[10px] font-bold uppercase tracking-wide text-yellow-700/70 dark:text-yellow-400/70">Yellow</div>
                            </div>
                            <div className="rounded-xl border border-red-300/50 dark:border-red-500/20 bg-red-50/70 dark:bg-red-500/10 p-3 text-center">
                                <div className="text-xl font-black text-red-700 dark:text-red-400">{totalRedCards}</div>
                                <div className="text-[10px] font-bold uppercase tracking-wide text-red-700/70 dark:text-red-400/70">Red</div>
                            </div>
                            <div className="rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/40 dark:bg-white/5 p-3 text-center">
                                <div className="text-xl font-black text-skin-base">{disciplinedPlayers}</div>
                                <div className="text-[10px] font-bold uppercase tracking-wide text-skin-muted">Players</div>
                            </div>
                        </div>

                        <PlayerListSection
                            players={stats.topOffenders}
                            emptyIcon={<Shield className="w-8 h-8 mb-2" />}
                            emptyMessage="Clean Play! No cards yet."
                            renderRow={(player) => (
                                <div
                                    className="flex items-center justify-between text-sm p-2.5 rounded-xl bg-white/20 dark:bg-white/5 border border-white/10 hover:bg-white/30 dark:hover:bg-white/10 transition-colors cursor-pointer group"
                                    onClick={() => navigate(`/players/${player.playerId}`)}
                                >
                                    <div className="truncate pr-2">
                                        <div className="font-medium text-skin-base">{player.name}</div>
                                        <div className="text-xs text-skin-muted truncate">{player.teamName}</div>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
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
                            )}
                        />
                    </div>
                </div>

                {/* Top Try Scorers */}
                <div className="relative group overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-md shadow-xl transition-all duration-300 hover:shadow-2xl">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-green-600" />
                    <div className="p-6 h-full">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-skin-base">
                            <span className="text-2xl">🏉</span>
                            Top Try Scorers
                        </h3>

                        <PlayerListSection
                            players={tryScorers}
                            emptyMessage="No tries scored yet."
                            renderRow={(player) => (
                                <div
                                    className="flex items-center justify-between text-sm p-2.5 rounded-xl bg-white/20 dark:bg-white/5 border border-white/10 hover:bg-white/30 dark:hover:bg-white/10 transition-colors cursor-pointer group"
                                    onClick={() => navigate(`/players/${player.playerId}`)}
                                >
                                    <div className="truncate pr-2">
                                        <div className="font-medium text-skin-base">{player.name}</div>
                                        <div className="text-xs text-skin-muted truncate">{player.teamName}</div>
                                    </div>
                                    <div className="font-bold text-lg text-emerald-600 dark:text-emerald-400 shrink-0">
                                        {player.tries}
                                    </div>
                                </div>
                            )}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
