import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicProfileApi, PublicTeamDetailResponse } from '../../api/public.api';
import { ArrowLeft, Users, Trophy, Shield, Hash, TrendingUp, Target, Zap } from 'lucide-react';

export function PublicTeamProfile() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [team, setTeam] = useState<PublicTeamDetailResponse | null>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [playerSearch, setPlayerSearch] = useState('');

    useEffect(() => {
        const fetchTeam = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const [data, statsData] = await Promise.all([
                    publicProfileApi.getTeam(id),
                    publicProfileApi.getTeamStats(id).catch(() => null),
                ]);
                setTeam(data);
                setStats(statsData);
            } catch (err: any) {
                console.error('Error fetching team:', err);
                setError(err.response?.data?.message || 'Failed to load team details');
            } finally {
                setLoading(false);
            }
        };

        fetchTeam();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !team) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6">
                <div className="bg-red-50 text-red-500 p-4 rounded-xl max-w-lg text-center">
                    <h2 className="text-xl font-bold mb-2">Team Not Found</h2>
                    <p>{error}</p>
                    <button 
                        onClick={() => navigate(-1)}
                        className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const filteredPlayers = team.players?.filter(p => {
        if (!playerSearch) return true;
        const search = playerSearch.toLowerCase();
        return (
            p.firstName.toLowerCase().includes(search) ||
            p.lastName.toLowerCase().includes(search) ||
            (p.position && p.position.toLowerCase().includes(search)) ||
            (p.jerseyNumber && String(p.jerseyNumber).includes(search))
        );
    }) || [];

    const hasStats = stats && (stats.matchesPlayed > 0 || stats.wins > 0 || stats.triesScored > 0);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12">
            {/* Header Banner */}
            <div className="relative pt-20 pb-0 min-h-[16rem] sm:h-72 md:h-80 overflow-hidden bg-gradient-to-br from-slate-200 via-blue-100 to-indigo-100 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900 flex flex-col justify-end">
                <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-300 via-transparent to-transparent dark:from-blue-600 dark:via-transparent dark:to-transparent"></div>
                <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-blue-200/30 dark:bg-blue-500/10 blur-2xl"></div>
                <div className="absolute -bottom-24 -left-12 w-48 h-48 rounded-full bg-indigo-200/40 dark:bg-indigo-500/10 blur-2xl"></div>

                <button 
                    onClick={() => navigate(-1)}
                    className="absolute top-6 left-6 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/40 dark:bg-white/10 hover:bg-white/60 dark:hover:bg-white/20 text-slate-700 dark:text-white backdrop-blur-md transition-colors text-sm font-medium border border-white/30 dark:border-white/10"
                >
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>

                {/* Glassmorphism card inside banner */}
                <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 mt-auto">
                    <div className="max-w-7xl mx-auto">
                        <div className="bg-white/50 dark:bg-slate-800/40 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-t-2xl p-6 sm:p-8 shadow-lg">
                            <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-center">
                                <div className="relative flex-shrink-0">
                                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white dark:bg-slate-800 p-2 shadow-xl ring-4 ring-white/80 dark:ring-slate-700 overflow-hidden">
                                        {team.logoUrl ? (
                                            <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                                            />
                                        ) : null}
                                        <div className={`w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-xl ${team.logoUrl ? 'hidden' : ''}`}>
                                            <Shield className="w-10 h-10 text-slate-400" />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 text-center md:text-left">
                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                                        {team.category && (
                                            <span className="px-3 py-1 bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold uppercase tracking-wider">{team.category}</span>
                                        )}
                                        {team.ageGroup && (
                                            <span className="px-3 py-1 bg-violet-500/10 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 rounded-full text-xs font-bold uppercase tracking-wider">{team.ageGroup}</span>
                                        )}
                                    </div>
                                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-1 leading-tight">{team.name}</h1>
                                    <p className="text-base text-slate-500 dark:text-slate-400 font-medium">
                                        {team.organisationName || team.shortName || 'Independent Team'}
                                        {team.state && ` • ${team.state}`}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">

                {/* Team Stats */}
                {hasStats && (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-700/50 mb-8">
                        <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                            <TrendingUp className="w-5 h-5 text-blue-500" /> Team Statistics
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                            <TeamStatCard label="Played" value={stats.matchesPlayed} />
                            <TeamStatCard label="Wins" value={stats.wins} highlight />
                            <TeamStatCard label="Draws" value={stats.draws} />
                            <TeamStatCard label="Losses" value={stats.losses} color="red" />
                            <TeamStatCard label="Tries" value={stats.triesScored} icon={<span className="text-sm">🏉</span>} />
                            <TeamStatCard label="Points For" value={stats.pointsFor} icon={<Target className="w-4 h-4 text-green-500" />} />
                            <TeamStatCard label="Points Against" value={stats.pointsAgainst} icon={<Zap className="w-4 h-4 text-orange-500" />} />
                            <TeamStatCard label="Pts Diff" value={stats.pointsDifference} highlight={stats.pointsDifference > 0} color={stats.pointsDifference < 0 ? 'red' : undefined} />
                            <TeamStatCard label="Yellow Cards" value={stats.yellowCards} icon={<div className="w-3 h-4 bg-yellow-400 rounded-[2px]" />} color="yellow" />
                            <TeamStatCard label="Red Cards" value={stats.redCards} icon={<div className="w-3 h-4 bg-red-500 rounded-[2px]" />} color="red" />
                        </div>
                    </div>
                )}

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Main Content (Roster) */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-700/50">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                                    <Users className="w-5 h-5 text-primary" /> Active Roster
                                </h2>
                                <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full text-sm font-medium">
                                    {team.players?.length || 0} Players
                                </span>
                            </div>

                            {/* Searchable Player Filter */}
                            {team.players && team.players.length > 5 && (
                                <div className="mb-5 relative">
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="Search players by name, position, or jersey..."
                                        value={playerSearch}
                                        onChange={(e) => setPlayerSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                    {playerSearch && (
                                        <button 
                                            onClick={() => setPlayerSearch('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            )}

                            {filteredPlayers.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {filteredPlayers.map((player) => (
                                        <div 
                                            key={player.id} 
                                            onClick={() => navigate(`/players/${player.id}`)}
                                            className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 hover:shadow-md transition-all cursor-pointer group"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center overflow-hidden relative">
                                                {player.profilePictureUrl ? (
                                                    <img src={player.profilePictureUrl} alt={player.firstName} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-lg font-bold text-slate-500">{player.firstName.charAt(0)}{player.lastName.charAt(0)}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
                                                    {player.firstName} {player.lastName}
                                                </div>
                                                <div className="text-sm text-slate-500 truncate flex items-center gap-2">
                                                    {player.position && <span>{player.position}</span>}
                                                    {player.jerseyNumber && (
                                                        <span className="inline-flex items-center gap-0.5 text-xs text-slate-400">
                                                            <Hash className="w-3 h-3" />{player.jerseyNumber}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : playerSearch ? (
                                <div className="text-center py-12 text-slate-500">
                                    No players matching "{playerSearch}"
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-500">
                                    No roster data available for this team.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/50">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                                <Trophy className="w-5 h-5 text-yellow-500" /> Team Info
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <div className="text-sm text-slate-500">Division</div>
                                    <div className="font-medium text-slate-900 dark:text-white">{team.division || 'Unassigned'}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-slate-500">Age Group</div>
                                    <div className="font-medium text-slate-900 dark:text-white">{team.ageGroup}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-slate-500">Short Name</div>
                                    <div className="font-medium text-slate-900 dark:text-white">{team.shortName || '-'}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-slate-500">Association / Organiser</div>
                                    <div className="font-medium text-slate-900 dark:text-white">{team.organisationName || '-'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TeamStatCard({ label, value, icon, highlight, color }: { label: string; value: number; icon?: React.ReactNode; highlight?: boolean; color?: string }) {
    return (
        <div className={`rounded-2xl p-3 text-center border ${
            color === 'yellow' ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800/30' :
            color === 'red' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30' :
            highlight ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30' :
            'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50'
        }`}>
            {icon && <div className="flex justify-center mb-1">{icon}</div>}
            <div className={`text-xl font-black ${
                color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
                color === 'red' ? 'text-red-600 dark:text-red-400' :
                highlight ? 'text-blue-700 dark:text-blue-300' :
                'text-slate-900 dark:text-white'
            }`}>{value}</div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">{label}</div>
        </div>
    );
}
