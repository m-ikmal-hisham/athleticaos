import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { publicProfileApi, PublicPlayerDetailResponse } from '../../api/public.api';
import { ArrowLeft, User, MapPin, Activity, Shield, Calendar, Hash, Trophy, Zap, Target, Clock } from 'lucide-react';
import { calculateAge } from '@/utils/date';

export function PublicPlayerProfile() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [player, setPlayer] = useState<PublicPlayerDetailResponse | null>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchParams] = useSearchParams();
    const initialTournamentId = searchParams.get('tournamentId') || null;
    const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(initialTournamentId);

    useEffect(() => {
        const fetchPlayer = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const [data, statsData] = await Promise.all([
                    publicProfileApi.getPlayer(id, selectedTournamentId || undefined),
                    publicProfileApi.getPlayerStats(id, selectedTournamentId || undefined).catch(() => null),
                ]);
                setPlayer(data);
                setStats(statsData);
            } catch (err: any) {
                console.error('Error fetching player:', err);
                setError(err.response?.data?.message || 'Failed to load player details');
            } finally {
                setLoading(false);
            }
        };

        fetchPlayer();
    }, [id, selectedTournamentId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !player) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6">
                <div className="bg-red-50 text-red-500 p-4 rounded-xl max-w-lg text-center">
                    <h2 className="text-xl font-bold mb-2">Player Not Found</h2>
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

    const age = calculateAge(player.dateOfBirth);
    const hasStats = stats && (stats.matchesPlayed > 0 || stats.totalPoints > 0 || stats.tries > 0);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12">
            {/* Header Banner */}
            <div className="relative pt-20 pb-0 min-h-[16rem] sm:h-72 overflow-hidden bg-gradient-to-br from-slate-200 via-blue-100 to-indigo-100 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900 flex flex-col justify-end">
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
                    <div className="max-w-5xl mx-auto">
                        <div className="bg-white/50 dark:bg-slate-800/40 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-t-2xl p-6 sm:p-8 shadow-lg">
                            <div className="flex flex-col md:flex-row gap-6 items-center md:items-center">
                                {/* Photo */}
                                <div className="relative flex-shrink-0">
                                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white dark:bg-slate-800 p-1 shadow-xl ring-4 ring-white/80 dark:ring-slate-700 overflow-hidden">
                                        {player.profilePictureUrl ? (
                                            <img src={player.profilePictureUrl} alt={player.firstName} className="w-full h-full object-cover rounded-full" />
                                        ) : (
                                            <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-700 flex flex-col items-center justify-center text-slate-400">
                                                <User className="w-10 h-10" />
                                            </div>
                                        )}
                                    </div>
                                    {player.jerseyNumber && (
                                        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-md ring-2 ring-white dark:ring-slate-800">
                                            {player.jerseyNumber}
                                        </div>
                                    )}
                                </div>

                                {/* Basic Info */}
                                <div className="flex-1 text-center md:text-left">
                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                                        {player.position && (
                                            <span className="px-3 py-1 bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold uppercase tracking-wider">{player.position}</span>
                                        )}
                                        {player.position2 && (
                                            <span className="px-3 py-1 bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs font-bold uppercase tracking-wider">{player.position2}</span>
                                        )}
                                    </div>
                                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-1 leading-tight">
                                        {player.firstName} {player.lastName}
                                    </h1>
                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-slate-500 dark:text-slate-400">
                                        {player.currentTeamName && (
                                            <div 
                                                onClick={() => player.currentTeamId ? navigate(`/teams/${player.currentTeamId}`) : null}
                                                className={`inline-flex items-center gap-1.5 font-medium ${player.currentTeamId ? 'hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors' : ''}`}
                                            >
                                                <Shield className="w-4 h-4" /> {player.currentTeamName}
                                            </div>
                                        )}
                                        {player.organisationName && (
                                            <span className="inline-flex items-center gap-1.5 text-slate-400 dark:text-slate-500">• {player.organisationName}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                {/* Quick Stats Row */}
                {(age || player.gender || player.country || player.jerseyNumber) && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                        {age && (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700/50 text-center">
                                <div className="text-2xl font-black text-slate-900 dark:text-white">{age}</div>
                                <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">Age</div>
                            </div>
                        )}
                        {player.gender && (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700/50 text-center">
                                <div className="text-lg font-bold text-slate-900 dark:text-white capitalize">{player.gender?.toLowerCase()}</div>
                                <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">Gender</div>
                            </div>
                        )}
                        {player.country && (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700/50 text-center">
                                <div className="text-lg font-bold text-slate-900 dark:text-white">{player.country}</div>
                                <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">Country</div>
                            </div>
                        )}
                        {player.jerseyNumber && (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700/50 text-center">
                                <div className="text-2xl font-black text-blue-600 dark:text-blue-400">#{player.jerseyNumber}</div>
                                <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">Jersey</div>
                            </div>
                        )}
                    </div>
                )}

                {/* Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Bio & Details */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/50">
                        <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                            <Activity className="w-5 h-5 text-emerald-500" /> Player Details
                        </h2>
                        <div className="space-y-4">
                            {player.position && (
                                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700/50">
                                    <span className="text-slate-500 text-sm flex items-center gap-1.5"><Hash className="w-4 h-4" /> Position</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{player.position}{player.position2 ? ` / ${player.position2}` : ''}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700/50">
                                <span className="text-slate-500 text-sm">Gender</span>
                                <span className="font-medium text-slate-900 dark:text-white capitalize">{player.gender?.toLowerCase() || '-'}</span>
                            </div>
                            {age !== null && (
                                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700/50">
                                    <span className="text-slate-500 text-sm flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Age</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{age} yrs</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700/50">
                                <span className="text-slate-500 text-sm flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Country</span>
                                <span className="font-medium text-slate-900 dark:text-white">{player.country || '-'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700/50">
                                <span className="text-slate-500 text-sm flex items-center gap-1.5"><MapPin className="w-4 h-4" /> State</span>
                                <span className="font-medium text-slate-900 dark:text-white">{player.state || '-'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-slate-500 text-sm">City</span>
                                <span className="font-medium text-slate-900 dark:text-white">{player.city || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Team Info Card */}
                    {player.currentTeamName && (
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/50">
                            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                                <Shield className="w-5 h-5 text-blue-500" /> Team
                            </h2>
                            <div 
                                onClick={() => player.currentTeamId ? navigate(`/teams/${player.currentTeamId}`) : null}
                                className={`flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 ${player.currentTeamId ? 'hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md cursor-pointer transition-all group' : ''}`}
                            >
                                <div className="w-14 h-14 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm">
                                    <Shield className="w-7 h-7 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-slate-900 dark:text-white text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                        {player.currentTeamName}
                                    </div>
                                    {player.organisationName && (
                                        <div className="text-sm text-slate-500 truncate">{player.organisationName}</div>
                                    )}
                                </div>
                            </div>
                            {player.jerseyNumber && (
                                <div className="mt-4 flex items-center justify-between py-3 border-t border-slate-100 dark:border-slate-700/50">
                                    <span className="text-slate-500 text-sm">Jersey Number</span>
                                    <span className="font-bold text-blue-600 dark:text-blue-400 text-lg">#{player.jerseyNumber}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Career Statistics / Tournament Statistics Section */}
                {hasStats && (
                    <div className="mt-8 bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-700/50">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                                <Trophy className="w-5 h-5 text-yellow-500" />
                                {selectedTournamentId ? 'Tournament Performance' : 'Career Statistics'}
                            </h2>
                            {selectedTournamentId && (
                                <button
                                    onClick={() => setSelectedTournamentId(null)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                >
                                    <Trophy className="w-3 h-3" />
                                    View All-Time Career
                                </button>
                            )}
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
                            <StatCard label="Matches" value={stats.matchesPlayed} icon={<Activity className="w-4 h-4 text-blue-500" />} />
                            <StatCard label="Total Minutes" value={stats.totalMinutesPlayed || 0} icon={<Clock className="w-4 h-4 text-indigo-500" />} />
                            <StatCard label="Tries" value={stats.tries} icon={<span className="text-base">🏉</span>} highlight />
                            <StatCard label="Conversions" value={stats.conversions} icon={<Target className="w-4 h-4 text-green-500" />} />
                            <StatCard label="Penalties" value={stats.penalties} icon={<Zap className="w-4 h-4 text-orange-500" />} />
                            <StatCard label="Total Points" value={stats.totalPoints} icon={<Trophy className="w-4 h-4 text-yellow-500" />} highlight />
                            <StatCard label="Drop Goals" value={stats.dropGoals} icon={<Target className="w-4 h-4 text-purple-500" />} />
                            <StatCard label="Yellow Cards" value={stats.yellowCards} color="yellow" icon={<div className="w-3 h-4 bg-yellow-400 rounded-[2px]" />} />
                            <StatCard label="Red Cards" value={stats.redCards} color="red" icon={<div className="w-3 h-4 bg-red-500 rounded-[2px]" />} />
                        </div>

                        {/* Recent Matches */}
                        {stats.recentMatches && stats.recentMatches.length > 0 && (
                            <div>
                                <h3 className="text-base font-bold mb-4 text-slate-700 dark:text-slate-300">Recent Matches</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 text-xs uppercase tracking-wider">
                                                <th className="py-3 px-3 text-left font-medium">Date</th>
                                                <th className="py-3 px-3 text-left font-medium">Team</th>
                                                <th className="py-3 px-3 text-left font-medium">Opponent</th>
                                                <th className="py-3 px-3 text-center font-medium">Result</th>
                                                <th className="py-3 px-3 text-center font-medium">Tries</th>
                                                <th className="py-3 px-3 text-center font-medium">Pts</th>
                                                <th className="py-3 px-3 text-center font-medium">Min</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                            {stats.recentMatches.slice(0, 10).map((match: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                    <td className="py-2.5 px-3 text-slate-500 text-xs whitespace-nowrap">
                                                        {match.matchDate ? new Date(match.matchDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-'}
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-slate-900 dark:text-white text-xs">{match.teamName || '—'}</span>
                                                            {match.tournamentName && (
                                                                <span className="text-slate-400 dark:text-slate-500 text-[10px] truncate max-w-[120px]">{match.tournamentName}</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white truncate max-w-[150px]">{match.opponentName}</td>
                                                    <td className="py-2.5 px-3 text-center">
                                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                                                            match.result?.startsWith('W') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                            match.result?.startsWith('L') ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                            match.result?.startsWith('D') ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' :
                                                            'text-slate-500'
                                                        }`}>
                                                            {match.result || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center font-medium text-emerald-600 dark:text-emerald-400">{match.tries || 0}</td>
                                                    <td className="py-2.5 px-3 text-center font-bold text-blue-600 dark:text-blue-400">{match.points || 0}</td>
                                                    <td className="py-2.5 px-3 text-center text-slate-500 text-xs">{match.minutesPlayed || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, highlight, color }: { label: string; value: number; icon?: React.ReactNode; highlight?: boolean; color?: string }) {
    return (
        <div className={`rounded-2xl p-4 text-center border transition-colors ${
            color === 'yellow' ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800/30' :
            color === 'red' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30' :
            highlight ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30' :
            'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50'
        }`}>
            {icon && <div className="flex justify-center mb-1.5">{icon}</div>}
            <div className={`text-2xl font-black ${
                color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
                color === 'red' ? 'text-red-600 dark:text-red-400' :
                highlight ? 'text-blue-700 dark:text-blue-300' :
                'text-slate-900 dark:text-white'
            }`}>{value}</div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-1">{label}</div>
        </div>
    );
}
