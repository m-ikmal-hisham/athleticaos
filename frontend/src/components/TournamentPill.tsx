import { Trophy, Calendar, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { publicTournamentApi, PublicTournamentSummary } from '@/api/public.api';

export const TournamentPill = () => {
    const [tournament, setTournament] = useState<PublicTournamentSummary | null>(null);

    useEffect(() => {
        const loadTournament = async () => {
            try {
                // Fetch public tournaments
                const tournaments = await publicTournamentApi.getTournaments();
                // Find first live one, or first upcoming, or just first one
                const featured = tournaments.find(t => t.live) || tournaments.find(t => !t.completed) || tournaments[0];
                if (featured) {
                    setTournament(featured);
                }
            } catch (error) {
                console.error("Failed to load featured tournament for pill", error);
            }
        };
        loadTournament();
    }, []);

    if (!tournament) return null;

    const status = tournament.live ? 'LIVE' : (tournament.completed ? 'COMPLETED' : 'UPCOMING');

    return (
        <Link
            to={`/tournaments/${tournament.slug || tournament.id}`}
            className={clsx(
                "group relative flex items-center gap-4 pl-2 pr-4 py-2 rounded-full",
                "bg-white/10 backdrop-blur-xl border border-white/10 shadow-lg",
                "hover:bg-white/15 transition-all duration-300",
                "w-full"
            )}
        >
            {/* Status Indicator */}
            <div className={clsx(
                "flex items-center justify-center w-10 h-10 rounded-full shrink-0",
                tournament.live
                    ? "bg-red-500/20 text-red-500 animate-pulse"
                    : "bg-blue-500/20 text-blue-500"
            )}>
                <Trophy className="w-5 h-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground flex items-center gap-2">
                        {tournament.live && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                        )}
                        {status} TOURNAMENT
                    </span>
                    <span className="text-sm font-medium text-foreground truncate">
                        {tournament.name}
                    </span>
                </div>

                <div className="hidden sm:block w-px h-8 bg-white/10" />

                <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-xs">
                        {new Date(tournament.startDate).toLocaleDateString()}
                    </span>
                </div>
            </div>

            {/* Arrow */}
            <div className="shrink-0 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all">
                <ChevronRight className="w-5 h-5" />
            </div>
        </Link>
    );
};
