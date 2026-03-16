import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicProfileApi, PublicPlayerDetailResponse } from '../../api/public.api';
import { ArrowLeft, User, MapPin, Activity, Shield } from 'lucide-react';

export function PublicPlayerProfile() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [player, setPlayer] = useState<PublicPlayerDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPlayer = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const data = await publicProfileApi.getPlayer(id);
                setPlayer(data);
            } catch (err: any) {
                console.error('Error fetching player:', err);
                setError(err.response?.data?.message || 'Failed to load player details');
            } finally {
                setLoading(false);
            }
        };

        fetchPlayer();
    }, [id]);

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

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12">
            {/* Header Banner */}
            <div className="relative h-48 sm:h-64 bg-slate-900 overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-400 via-slate-900 to-slate-900"></div>
                <button 
                    onClick={() => navigate(-1)}
                    className="absolute top-6 left-6 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors text-sm font-medium"
                >
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
            </div>

            {/* Profile Content */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 sm:-mt-32 relative z-10">
                <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-end">
                    
                    {/* Photo */}
                    <div className="relative">
                        <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-white dark:bg-slate-800 p-1.5 shadow-xl ring-4 ring-slate-50 dark:ring-slate-900 overflow-hidden">
                            {player.profilePictureUrl ? (
                                <img 
                                    src={player.profilePictureUrl} 
                                    alt={player.firstName} 
                                    className="w-full h-full object-cover rounded-full"
                                />
                            ) : (
                                <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-700 flex flex-col items-center justify-center text-slate-400">
                                    <User className="w-12 h-12 mb-1" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Basic Info */}
                    <div className="flex-1 text-center md:text-left pt-4 pb-6">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                            {player.position && (
                                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider">
                                    {player.position}
                                </span>
                            )}
                            {player.position2 && (
                                <span className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs font-bold uppercase tracking-wider">
                                    {player.position2}
                                </span>
                            )}
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-2 leading-tight">
                            {player.firstName} {player.lastName}
                        </h1>
                        {player.currentTeamName && (
                            <div 
                                onClick={() => player.currentTeamId ? navigate(`/teams/${player.currentTeamId}`) : null}
                                className={`inline-flex items-center gap-2 text-lg font-medium text-slate-600 dark:text-slate-400 ${player.currentTeamId ? 'hover:text-primary cursor-pointer transition-colors' : ''}`}
                            >
                                <Shield className="w-5 h-5" /> 
                                {player.currentTeamName}
                            </div>
                        )}
                    </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
                    
                    {/* Bio & Details */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/50">
                        <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                            <Activity className="w-5 h-5 text-emerald-500" /> Player Details
                        </h2>
                        
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700/50">
                                <span className="text-slate-500 text-sm">Gender</span>
                                <span className="font-medium text-slate-900 dark:text-white capitalize">{player.gender?.toLowerCase() || '-'}</span>
                            </div>
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

                </div>
            </div>
        </div>
    );
}
