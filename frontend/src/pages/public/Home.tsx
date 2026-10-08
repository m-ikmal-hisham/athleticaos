import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarBlank, MapPin, Trophy, ArrowRight } from '@phosphor-icons/react';
import { publicTournamentApi, PublicTournamentSummary } from '../../api/public.api';
import { GlassCard } from '@/components/GlassCard';
import { formatTournamentLevel, formatCompetitionType } from '@/utils/formatters';

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
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-navy/8 dark:bg-navy-tint/12 text-navy dark:text-navy-tint text-sm font-medium border border-navy/20 dark:border-navy-tint/30">
                    <Trophy className="w-4 h-4" />
                    <span>Malaysia Rugby Competitions</span>
                </div>

                <h1 className="text-5xl md:text-6xl font-bold text-black dark:text-white">
                    Live Scores, Fixtures
                    <br />
                    <span className="text-navy dark:text-navy-tint">
                        & Results
                    </span>
                </h1>

                <p className="text-xl text-black/72 dark:text-white/72 max-w-2xl mx-auto">
                    Follow all rugby competitions across Malaysia in real-time. Powered by AthleticaOS Rugby.
                </p>

                <div className="flex items-center justify-center gap-4 pt-4">
                    <Link
                        to="/tournaments"
                        className="px-6 py-3 bg-navy hover:bg-deep-navy dark:hover:bg-[#1F5BB3] text-white font-medium rounded-[10px] transition-colors flex items-center gap-2"
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
                        className="text-sm text-navy dark:text-navy-tint hover:text-[#D32F2F] dark:hover:text-[#D32F2F] hover:underline transition-colors"
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
                        <Trophy className="w-12 h-12 mx-auto text-black/60 dark:text-white/60 mb-4" />
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
                                className="block group"
                            >
                                <GlassCard className="h-full relative overflow-hidden transition-all hover:shadow-xl hover:shadow-[var(--highlight-glow)] hover:border-[var(--highlight-color)]">
                                    <div className="p-6 space-y-4 relative z-10">
                                        {/* Status Badge */}
                                        {tournament.live && (
                                            <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-crimson text-white text-xs font-bold uppercase tracking-wider z-20 shadow-sm">
                                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                LIVE NOW
                                            </div>
                                        )}

                                        {/* Tournament Info */}
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-[var(--highlight-color)] transition-colors">
                                                {tournament.name}
                                            </h3>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                {formatTournamentLevel(tournament.level)}
                                                {tournament.competitionType && ` • ${formatCompetitionType(tournament.competitionType)}`}
                                            </p>
                                        </div>

                                        {/* Details */}
                                        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                            <div className="flex items-center gap-2">
                                                <CalendarBlank className="w-4 h-4" />
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
                                    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-[var(--highlight-color)] opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none" />
                                </GlassCard>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
