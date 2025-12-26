import { useNavigate } from 'react-router-dom';
import { PublicTournamentSummary } from '@/api/public.api';
import { GlassCard } from '@/components/GlassCard';
import { TournamentLogo } from '@/components/common/TournamentLogo';
import { Trophy, CalendarCheck, MapPin } from '@phosphor-icons/react';
import { Button } from '@/components/Button';

interface FeaturedTournamentCardProps {
    tournament: PublicTournamentSummary | null;
    loading?: boolean;
}

export const FeaturedTournamentCard = ({ tournament, loading }: FeaturedTournamentCardProps) => {
    const navigate = useNavigate();

    if (loading) {
        return (
            <GlassCard className="h-full flex flex-col justify-center items-center p-6 animate-pulse">
                <div className="w-16 h-16 rounded-2xl bg-black/5 dark:bg-white/5 mb-4" />
                <div className="w-32 h-6 bg-black/5 dark:bg-white/5 rounded mb-2" />
                <div className="w-24 h-4 bg-black/5 dark:bg-white/5 rounded" />
            </GlassCard>
        );
    }

    if (!tournament) {
        return (
            <GlassCard className="h-full flex flex-col justify-center items-center p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">No Active Tournament</h3>
                    <p className="text-sm text-muted-foreground">Select a tournament from the menu below to view stats.</p>
                </div>
            </GlassCard>
        );
    }

    const isLive = tournament.live;

    return (
        <GlassCard
            className="h-full relative overflow-hidden group cursor-pointer"
            onClick={() => navigate(`/dashboard/tournaments/${tournament.id}`)}
        >
            {/* Background Ambience */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-50 transition-opacity group-hover:opacity-100" />

            <div className="relative z-10 h-full flex flex-col p-6">
                <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg border border-white/10 bg-white/5 shrink-0">
                            <TournamentLogo
                                tournamentId={tournament.id}
                                logoUrl={tournament.logoUrl || tournament.organiserBranding?.logoUrl}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="pt-1">
                            {isLive && (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-600/10 text-red-500 text-[10px] font-bold uppercase tracking-wider mb-2 border border-red-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                    Live Now
                                </span>
                            )}
                            <h3 className="text-2xl font-bold tracking-tight text-foreground line-clamp-2 leading-tight">
                                {tournament.name}
                            </h3>
                            <p className="text-sm font-medium text-muted-foreground mt-1 flex items-center gap-1.5">
                                {tournament.organiserName}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-auto pt-6 flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <CalendarCheck className="w-4 h-4 text-primary-500" />
                        <span>{new Date(tournament.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                    {tournament.venue && (
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary-500" />
                            <span className="truncate max-w-[120px]">{tournament.venue}</span>
                        </div>
                    )}

                    <Button size="sm" variant="outline" className="ml-auto rounded-full hover:bg-primary-500 hover:text-white hover:border-primary-500 transition-all">
                        Manage
                    </Button>
                </div>
            </div>
        </GlassCard>
    );
};
