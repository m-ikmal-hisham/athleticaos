import { Trophy, SkipForward, SkipBack, VideoCamera } from '@phosphor-icons/react';
import { ShareButton } from '@/components/common/ShareButton';
import { TournamentLogo } from '@/components/common/TournamentLogo';
import { clsx } from 'clsx';
import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { publicTournamentApi, PublicTournamentSummary } from '@/api/public.api';
import { useUIStore } from '@/store/ui.store';

export const TournamentPill = () => {
    const [tournaments, setTournaments] = useState<PublicTournamentSummary[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const location = useLocation();
    const { setActiveTournamentId } = useUIStore();

    // Check if we are in the admin dashboard
    const isAdmin = location.pathname.startsWith('/dashboard');

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

    // Sync active tournament to global store
    useEffect(() => {
        if (tournaments.length > 0) {
            const activeId = tournaments[currentIndex].id;
            setActiveTournamentId(activeId);
        } else {
            setActiveTournamentId(null);
        }
    }, [currentIndex, tournaments, setActiveTournamentId]);

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

    // Helper to get the correct link based on context
    const getTournamentLink = () => {
        if (!tournament) return '#';
        if (isAdmin) {
            return `/dashboard/tournaments/${tournament.id}`;
        }
        return `/tournaments/${tournament.slug || tournament.id}`;
    };

    // Show loading state
    if (loading) {
        return (
            <div className={clsx(
                "backdrop-blur-pill relative flex items-center gap-4 pl-2 pr-4 py-2 rounded-full",
                "bg-white/10 dark:bg-black/20",
                "border border-white/20 dark:border-white/10 shadow-lg",
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
                "backdrop-blur-pill relative flex items-center gap-4 pl-2 pr-4 py-2 rounded-full",
                "bg-white/10 dark:bg-black/20",
                "border border-white/20 dark:border-white/10 shadow-lg",
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



    // ... imports ...

    return (
        <div className="relative w-full">
            <div className={clsx(
                "backdrop-blur-pill group relative flex items-center justify-between px-3 md:px-5 py-3 md:py-4 rounded-full", // True Pill shape
                "bg-white/10 dark:bg-black/20", // Glass Background (Glass Only, No Tint)
                "border border-white/20 dark:border-white/10", // Softer border
                "shadow-lg shadow-black/10", // Softer shadow
                "w-full transition-all duration-300 hover:scale-[1.005]"
            )}>
                {/* Progress Bar (Visual only) - Top Edge - hidden for now to clean up look */}
                {/* <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary-500/20 overflow-hidden rounded-t-[20px]">
                    <div className="h-full bg-primary-500 w-[45%] rounded-r-full" />
                </div> */}

                {/* Left Controls - Previous */}
                <div className="hidden sm:flex items-center gap-2">
                    <button
                        onClick={handlePrevious}
                        disabled={!hasMultipleTournaments}
                        className={clsx(
                            "p-2 rounded-full text-foreground/50 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors",
                            !hasMultipleTournaments && "opacity-30 cursor-not-allowed"
                        )}
                        title="Previous tournament"
                    >
                        <SkipBack className="w-5 h-5 fill-current" weight="fill" />
                    </button>
                </div>

                {/* Center Info - Tournament Details (Clickable) */}
                <Link
                    to={getTournamentLink()}
                    className="flex-1 flex items-center gap-3 md:gap-5 mx-2 md:mx-6 min-w-0 group/info cursor-pointer justify-start"
                >
                    {/* Album Art Style Logo */}
                    <div className={clsx(
                        "w-10 h-10 md:w-12 md:h-12 rounded-lg shrink-0 overflow-hidden shadow-md relative",
                        "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border border-white/10"
                    )}>
                        <TournamentLogo
                            tournamentId={tournament.id}
                            logoUrl={tournament.logoUrl || tournament.organiserBranding?.logoUrl}
                            className="w-full h-full"
                        />

                        {/* Live Indicator overlay on artwork */}
                        {tournament.live && (
                            <div className="absolute bottom-0 left-0 right-0 bg-red-600/90 text-white text-[8px] font-bold text-center py-0.5 uppercase tracking-widest backdrop-blur-sm">
                                LIVE
                            </div>
                        )}
                    </div>

                    {/* Meta Data */}
                    <div className="flex flex-col min-w-0 justify-center">
                        <span className="text-sm md:text-base font-semibold text-foreground truncate group-hover/info:text-primary transition-colors leading-tight">
                            {tournament.name}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80 mt-0.5 truncate font-medium">
                            <span className="truncate max-w-[100px] md:max-w-none">{tournament.organiserName || 'Athletica'}</span>
                            <span className="mx-1 opacity-50">•</span>
                            {status === 'LIVE' ? (
                                <span className="text-red-500 font-bold flex items-center gap-1">
                                    Live
                                </span>
                            ) : (
                                <span className="flex items-center gap-1">
                                    {new Date(tournament.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                            )}
                        </div>
                    </div>
                </Link>

                {/* Right Controls - Next & Play */}
                <div className="flex items-center gap-1 md:gap-3">
                    {/* Live Stream Button if available */}
                    {tournament.livestreamUrl && (
                        <a
                            href={tournament.livestreamUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-red-600 hover:bg-red-700 text-white p-1.5 md:p-2 rounded-full transition-colors flex items-center justify-center shadow-lg shadow-red-500/20"
                            title="Watch Live Stream"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <VideoCamera className="w-4 h-4 md:w-5 md:h-5" weight="fill" />
                        </a>
                    )}

                    {/* Share Button - hidden on mobile to save space if needed, or keep small */}
                    <div className="hidden sm:block">
                        <ShareButton
                            title={tournament.name}
                            url={`${window.location.origin}/tournaments/${tournament.slug || tournament.id}`}
                            variant="ghost"
                            size="sm"
                            direction="up"
                            className="rounded-full w-10 h-10 p-0 text-foreground/70 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10"
                        />
                    </div>


                    <button
                        onClick={handleNext}
                        disabled={!hasMultipleTournaments}
                        className={clsx(
                            "p-2 rounded-full text-foreground/50 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors hidden sm:block",
                            !hasMultipleTournaments && "opacity-30 cursor-not-allowed"
                        )}
                        title="Next tournament"
                    >
                        <SkipForward className="w-5 h-5 fill-current" weight="fill" />
                    </button>

                    {/* Mobile Next Button (Replaces the hidden group above on mobile) */}
                    <button
                        onClick={handleNext}
                        disabled={!hasMultipleTournaments}
                        className={clsx(
                            "p-1.5 rounded-full text-foreground/50 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors sm:hidden",
                            !hasMultipleTournaments && "opacity-30 cursor-not-allowed"
                        )}
                        title="Next tournament"
                    >
                        <SkipForward className="w-5 h-5 fill-current" weight="fill" />
                    </button>
                </div>
            </div>
        </div>
    );
};
