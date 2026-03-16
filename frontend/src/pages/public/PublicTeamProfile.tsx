import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicProfileApi, PublicTeamDetailResponse } from '../../api/public.api';
import { ArrowLeft, Users, Trophy, Shield } from 'lucide-react';

export function PublicTeamProfile() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [team, setTeam] = useState<PublicTeamDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTeam = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const data = await publicProfileApi.getTeam(id);
                setTeam(data);
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

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12">
            {/* Header Banner */}
            <div className="relative h-48 sm:h-64 md:h-80 bg-gradient-to-br from-blue-900 to-slate-900">
                <div className="absolute inset-0 bg-black/40"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                <button 
                    onClick={() => navigate(-1)}
                    className="absolute top-6 left-6 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors text-sm font-medium"
                >
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
            </div>

            {/* Profile Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 sm:-mt-32 relative z-10">
                <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
                    
                    {/* Logo */}
                    <div className="relative">
                        <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-2xl bg-white dark:bg-slate-800 p-2 shadow-xl ring-4 ring-slate-50 dark:ring-slate-900 overflow-hidden">
                            {team.logoUrl ? (
                                <img 
                                    src={team.logoUrl} 
                                    alt={team.name} 
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                    }}
                                />
                            ) : null}
                            <div className={`w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-xl ${team.logoUrl ? 'hidden' : ''}`}>
                                <Shield className="w-12 h-12 text-slate-400" />
                            </div>
                        </div>
                    </div>

                    {/* Team Info */}
                    <div className="flex-1 pt-2 sm:pt-16 pb-6">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            {team.category && (
                                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold uppercase tracking-wider">
                                    {team.category}
                                </span>
                            )}
                            {team.ageGroup && (
                                <span className="px-3 py-1 bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 rounded-full text-xs font-bold uppercase tracking-wider">
                                    {team.ageGroup}
                                </span>
                            )}
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-2 leading-tight">
                            {team.name}
                        </h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400 font-medium">
                            {team.organisationName || team.shortName || 'Independent Team'}
                            {team.state && ` • ${team.state}`}
                        </p>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                    
                    {/* Main Content (Roster) */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-700/50">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                                    <Users className="w-5 h-5 text-primary" /> Active Roster
                                </h2>
                                <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full text-sm font-medium">
                                    {team.players?.length || 0} Players
                                </span>
                            </div>
                            
                            {team.players && team.players.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {team.players.map((player) => (
                                        <div 
                                            key={player.id} 
                                            onClick={() => navigate(`/players/${player.id}`)}
                                            className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 hover:shadow-md transition-all cursor-pointer group"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
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
                                                <div className="text-sm text-slate-500 truncate flex gap-2">
                                                    {player.position && <span>{player.position}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
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
