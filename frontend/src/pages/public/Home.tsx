import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Trophy, ArrowRight } from 'lucide-react';
import { publicTournamentApi, PublicTournamentSummary } from '../../api/public.api';

export default function Home() {
    const [tournaments, setTournaments] = useState<PublicTournamentSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTournaments();
    }, []);

    const loadTournaments = async () => {
        try {
            const data = await publicTournamentApi.getTournaments();
            // Show only live and upcoming tournaments on home page
            const featured = data.filter(t => t.live || !t.completed).slice(0, 6);
            setTournaments(featured);
        } catch (error) {
            console.error('Failed to load tournaments:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-12">
            {/* Hero Section */}
            <div className="text-center space-y-6 py-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium">
                    <Trophy className="w-4 h-4" />
                    <span>Malaysia Rugby Competitions</span>
                </div>

                <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white">
                    Live Scores, Fixtures
                    <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">
                        & Results
                    </span>
                </h1>

                <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    Follow all rugby competitions across Malaysia in real-time. Powered by AthleticaOS Rugby.
                </p>

                <div className="flex items-center justify-center gap-4 pt-4">
                    <Link
                        to="/tournaments"
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                        View All Tournaments
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>

            {/* Featured Tournaments */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Featured Tournaments
                    </h2>
                    <Link
                        to="/tournaments"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        View all →
                    </Link>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div
                                key={i}
                                className="h-48 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl animate-pulse"
                            />
                        ))}
                    </div>
                ) : tournaments.length === 0 ? (
                    <div className="text-center py-12 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50">
                        <Trophy className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                        <p className="text-slate-600 dark:text-slate-400">
                            No active tournaments at the moment
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tournaments.map(tournament => (
                            <Link
                                key={tournament.id}
                                to={`/tournaments/${tournament.slug || tournament.id}`}
                                className="group relative overflow-hidden rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 hover:border-blue-500/50 transition-all hover:shadow-xl hover:shadow-blue-500/10"
                            >
                                <div className="p-6 space-y-4">
                                    {/* Status Badge */}
                                    {tournament.live && (
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium">
                                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                            LIVE NOW
                                        </div>
                                    )}

                                    {/* Tournament Info */}
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {tournament.name}
                                        </h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                            {tournament.level}
                                            {tournament.competitionType && ` • ${tournament.competitionType}`}
                                        </p>
                                    </div>

                                    {/* Details */}
                                    <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            <span>
                                                {new Date(tournament.startDate).toLocaleDateString()} -{' '}
                                                {new Date(tournament.endDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4" />
                                            <span>{tournament.venue}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Hover Effect */}
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-600/0 group-hover:from-blue-500/5 group-hover:to-blue-600/10 transition-all" />
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
