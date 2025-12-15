import { Trophy, Calendar, ChevronRight, ChevronLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { publicTournamentApi, PublicTournamentSummary } from '@/api/public.api';

export const TournamentPill = () => {
    const [tournaments, setTournaments] = useState<PublicTournamentSummary[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadTournaments = async () => {
            try {
                setLoading(true);
                // Fetch public tournaments
                const fetchedTournaments = await publicTournamentApi.getTournaments();

                if (fetchedTournaments.length > 0) {
                    // Sort tournaments by date - closest to today first
                    const today = new Date();
                    const sorted = [...fetchedTournaments].sort((a, b) => {
                        const dateA = new Date(a.startDate);
                        const dateB = new Date(b.startDate);

                        // Calculate absolute difference from today
                        const diffA = Math.abs(dateA.getTime() - today.getTime());
                        const diffB = Math.abs(dateB.getTime() - today.getTime());

                        return diffA - diffB;
                    });

                    setTournaments(sorted);
                    setCurrentIndex(0);
                }
            } catch (error) {
                console.error("Failed to load tournaments for pill", error);
            } finally {
                setLoading(false);
            }
        };
        loadTournaments();
    }, []);

    const handlePrevious = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : tournaments.length - 1));
    };

    const handleNext = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentIndex((prev) => (prev < tournaments.length - 1 ? prev + 1 : 0));
    };

    // Always show the pill, even if loading or no tournaments
    const tournament = tournaments[currentIndex];
    const hasMultipleTournaments = tournaments.length > 1;

    // Show loading state
    if (loading) {
        return (
            <div className={clsx(
                "relative flex items-center gap-4 pl-2 pr-4 py-2 rounded-full",
                "bg-white/10 backdrop-blur-xl border border-white/10 shadow-lg",
                "w-full"
            )}>
                <div className="flex items-center justify-center w-10 h-10 rounded-full shrink-0 bg-blue-500/20">
                    <Trophy className="w-5 h-5 text-blue-500 animate-pulse" />
                </div>
                <div className="flex-1">
                    <span className="text-xs text-muted-foreground">Loading tournaments...</span>
                </div>
            </div>
        );
    }

    // Show empty state if no tournaments
    if (!tournament) {
        return (
            <div className={clsx(
                "relative flex items-center gap-4 pl-2 pr-4 py-2 rounded-full",
                "bg-white/10 backdrop-blur-xl border border-white/10 shadow-lg",
                "w-full"
            )}>
                <div className="flex items-center justify-center w-10 h-10 rounded-full shrink-0 bg-gray-500/20">
                    <Trophy className="w-5 h-5 text-gray-500" />
                </div>
                <div className="flex-1">
                    <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                        NO TOURNAMENTS
                    </span>
                    <span className="text-sm font-medium text-foreground block">
                        No tournaments scheduled
                    </span>
                </div>
            </div>
        );
    }

    const status = tournament.live ? 'LIVE' : (tournament.completed ? 'COMPLETED' : 'UPCOMING');

    return (
        <div className="relative w-full">
            <Link
                to={`/tournaments/${tournament.slug || tournament.id}`}
                className={clsx(
                    "group relative flex items-center gap-4 pl-2 pr-4 py-2 rounded-full",
                    "bg-white/10 backdrop-blur-xl border border-white/10 shadow-lg",
                    "hover:bg-white/15 transition-all duration-300",
                    "w-full"
                )}
            >
                {/* Previous Button */}
                {hasMultipleTournaments && (
                    <button
                        onClick={handlePrevious}
                        className={clsx(
                            "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3",
                            "w-8 h-8 rounded-full",
                            "bg-white/10 dark:bg-black/20 backdrop-blur-xl border border-white/20",
                            "hover:bg-white/20 dark:hover:bg-black/30 transition-all",
                            "flex items-center justify-center",
                            "text-foreground hover:text-primary",
                            "z-10"
                        )}
                        title="Previous tournament"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                )}

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
                            {hasMultipleTournaments && (
                                <span className="text-[10px] opacity-60">
                                    {currentIndex + 1}/{tournaments.length}
                                </span>
                            )}
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

                {/* Next Button */}
                {hasMultipleTournaments && (
                    <button
                        onClick={handleNext}
                        className={clsx(
                            "absolute right-0 top-1/2 -translate-y-1/2 translate-x-3",
                            "w-8 h-8 rounded-full",
                            "bg-white/10 dark:bg-black/20 backdrop-blur-xl border border-white/20",
                            "hover:bg-white/20 dark:hover:bg-black/30 transition-all",
                            "flex items-center justify-center",
                            "text-foreground hover:text-primary",
                            "z-10"
                        )}
                        title="Next tournament"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                )}
            </Link>
        </div>
    );
};
