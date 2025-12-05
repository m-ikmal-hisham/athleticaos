import { Trophy, Calendar, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { Link } from 'react-router-dom';

interface TournamentPillProps {
    tournament?: {
        name: string;
        status: 'LIVE' | 'UPCOMING';
        date: string;
        id: string;
    };
}

export const TournamentPill = ({ tournament }: TournamentPillProps) => {
    // Dummy data if no tournament provided
    const data = tournament || {
        name: "Malaysia Rugby Super League 2025",
        status: 'LIVE',
        date: "Week 4 • Matchday 2",
        id: "mrsl-2025"
    };

    return (
        <Link
            to={`/dashboard/tournaments/${data.id}`}
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
                data.status === 'LIVE'
                    ? "bg-red-500/20 text-red-500 animate-pulse"
                    : "bg-blue-500/20 text-blue-500"
            )}>
                <Trophy className="w-5 h-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground flex items-center gap-2">
                        {data.status === 'LIVE' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                        )}
                        {data.status} TOURNAMENT
                    </span>
                    <span className="text-sm font-medium text-foreground truncate">
                        {data.name}
                    </span>
                </div>

                <div className="hidden sm:block w-px h-8 bg-white/10" />

                <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-xs">{data.date}</span>
                </div>
            </div>

            {/* Arrow */}
            <div className="shrink-0 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all">
                <ChevronRight className="w-5 h-5" />
            </div>
        </Link>
    );
};
