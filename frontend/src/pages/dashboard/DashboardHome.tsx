import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UsersThree, Buildings, Trophy, Calendar, ChartLineUp } from '@phosphor-icons/react';
import { GlassCard } from '@/components/GlassCard';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { useStatsStore } from '@/store/stats.store';
import { useMatchesStore } from '@/store/matches.store';
import { fetchDashboardStats } from '@/api/dashboard.api';
import { publicTournamentApi, PublicTournamentSummary } from '@/api/public.api';
import { RecentActivityWidget } from '@/components/RecentActivityWidget';
import { BentoGrid, BentoItem } from '@/components/dashboard/BentoGrid';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { FeaturedTournamentCard } from '@/components/dashboard/FeaturedTournamentCard';

// Custom hook for counter animation
const useCountUp = (end: number, duration: number = 2000) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - percentage, 4);
            setCount(Math.floor(end * easeOutQuart));

            if (percentage < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [end, duration]);

    return count;
};

interface GlobalDashboardStats {
    totalPlayers: number;
    totalTeams: number;
    totalMatches: number;
    totalOrganisations: number;
    activeTournaments: number;
    upcomingMatches: number;
}

export const DashboardHome = () => {
    const { user } = useAuthStore();
    const { activeTournamentId } = useUIStore();
    const navigate = useNavigate();

    // Global Stats State
    const [globalStats, setGlobalStats] = useState<GlobalDashboardStats | null>(null);

    // Tournament Specific Stores
    const { summary: tournamentSummary, loadStatsForTournament } = useStatsStore();
    const { matches, loadMatches } = useMatchesStore();

    // Derived State for Featured Tournament Card
    const [activeTournamentDetails, setActiveTournamentDetails] = useState<PublicTournamentSummary | null>(null);

    // 1. Fetch Global Stats on Mount
    useEffect(() => {
        const loadGlobal = async () => {
            try {
                const response = await fetchDashboardStats();
                setGlobalStats(response.data);
            } catch (error) {
                console.error('Failed to load global stats:', error);

                // Fallback zeroes
                setGlobalStats({
                    totalPlayers: 0,
                    totalTeams: 0,
                    totalMatches: 0,
                    totalOrganisations: 0,
                    activeTournaments: 0,
                    upcomingMatches: 0
                });
            }
        };
        loadGlobal();
    }, []);

    // 2. Sync Active Tournament Data
    useEffect(() => {
        if (activeTournamentId) {
            // Load stats and matches for the selected tournament
            loadStatsForTournament(activeTournamentId);
            useMatchesStore.getState().setFilters({ tournamentId: activeTournamentId, status: "ALL" }); // Directly set without triggering loop
            loadMatches(); // Load all matches for trend analysis

            // Fetch details for the card (using public API for simplicity)
            // Ideally this could come from a cached store list, but fetch is cheap
            publicTournamentApi.getTournamentById(activeTournamentId).then(res => {
                setActiveTournamentDetails(res as unknown as PublicTournamentSummary); // Cast because Detail extends Summary roughly or strictly
            }).catch(console.error);
        } else {
            setActiveTournamentDetails(null);
        }
    }, [activeTournamentId, loadStatsForTournament, loadMatches]);

    // 3. Client-Side Aggregation for Trend Chart
    const matchTrendData = useMemo(() => {
        if (!matches || matches.length === 0) return [];

        // Group matches by date
        const counts: Record<string, number> = {};
        matches.forEach(m => {
            const date = m.matchDate.split('T')[0]; // Simple ISO date check
            counts[date] = (counts[date] || 0) + 1;
        });

        // Convert to array and sort
        return Object.entries(counts)
            .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
            .map(([date, count]) => ({
                name: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                value: count
            }));
    }, [matches]);


    // Determine scope for Recent Activity
    const isSuperAdmin = user?.roles?.includes('ROLE_SUPER_ADMIN');
    const isOrgAdmin = user?.roles?.includes('ROLE_ORG_ADMIN') || user?.roles?.includes('ROLE_CLUB_ADMIN');

    let activityScope: 'global' | 'org' | 'user' = 'user';
    let activityEntityId = user?.id;

    if (isSuperAdmin) {
        activityScope = 'global';
        activityEntityId = undefined;
    } else if (isOrgAdmin && user?.organisationId) {
        activityScope = 'org';
        activityEntityId = user.organisationId;
    }

    // Animated Counters
    const playersCount = useCountUp(globalStats?.totalPlayers || 0);
    const orgsCount = useCountUp(globalStats?.totalOrganisations || 0);
    const tournamentsCount = useCountUp(globalStats?.activeTournaments || 0);

    return (
        <div className="space-y-6 pt-2 pb-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col gap-1 mb-8">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-[#D32F2F] dark:from-[#D32F2F] dark:to-blue-600 pb-1">
                            {activeTournamentId ? "Tournament Overview" : "Dashboard"}
                        </h1>
                        <p className="text-slate-600 dark:text-slate-300 text-lg mt-1">
                            {activeTournamentId
                                ? "Real-time insights for the selected competition."
                                : "Welcome back, " + (user?.firstName || 'User') + "."}
                        </p>
                    </div>
                </div>
            </div>

            <BentoGrid>
                {/* 1. Global KPI: Active Players */}
                <BentoItem colSpan={1} rowSpan={1}>
                    <GlassCard
                        className="h-full flex flex-col justify-between p-6 hover:bg-white/5 transition-all duration-300 cursor-pointer group hover:-translate-y-1 hover:shadow-glass-lg hover:border-blue-500"
                        onClick={() => navigate('/dashboard/players')}
                    >
                        <div className="flex justify-between items-start">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                                <Users className="w-5 h-5" weight="fill" />
                            </div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-foreground tracking-tight mt-4">{playersCount.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground font-medium mt-1">Active Players</div>
                        </div>
                    </GlassCard>
                </BentoItem>

                {/* 2. Global KPI: Active Tournaments */}
                <BentoItem colSpan={1} rowSpan={1}>
                    <GlassCard
                        className="h-full flex flex-col justify-between p-6 hover:bg-white/5 transition-all duration-300 cursor-pointer group hover:-translate-y-1 hover:shadow-glass-lg hover:border-amber-500"
                        onClick={() => navigate('/dashboard/tournaments')}
                    >
                        <div className="flex justify-between items-start">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
                                <Trophy className="w-5 h-5" weight="fill" />
                            </div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-foreground tracking-tight mt-4">{tournamentsCount.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground font-medium mt-1">Active Tournaments</div>
                        </div>
                    </GlassCard>
                </BentoItem>

                {/* 3. Featured Tournament Context Card (Takes 2x1) */}
                <BentoItem colSpan={2} rowSpan={1} className={!activeTournamentId ? "opacity-60 grayscale transition-all duration-500 hover:grayscale-0 hover:opacity-100" : ""}>
                    <FeaturedTournamentCard
                        tournament={activeTournamentDetails}
                        loading={activeTournamentId ? !activeTournamentDetails : false}
                    />
                </BentoItem>

                {/* 4. Match Activity Chart (2x2) - Only shows if tournament selected */}
                <BentoItem colSpan={2} rowSpan={2} className="relative group">
                    <GlassCard className="h-full p-0 overflow-hidden flex flex-col hover:border-primary-500 transition-colors duration-500">
                        <div className="p-6 pb-2 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-foreground flex items-center gap-2">
                                    <ChartLineUp className="w-4 h-4 text-primary-500" weight="fill" />
                                    Match Activity
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {activeTournamentId ? "Matches scheduled per day" : "Select a tournament to view trends"}
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 w-full min-h-[160px] flex items-end pb-0 relative">
                            {/* Subtle grid background */}
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

                            {activeTournamentId && matchTrendData.length > 0 ? (
                                <TrendChart data={matchTrendData} height={200} />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground text-sm p-8 bg-black/5 dark:bg-white/5 backdrop-blur-sm z-10">
                                    <ChartLineUp className="w-12 h-12 opacity-20 mb-3" />
                                    <span>No match data for this period</span>
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </BentoItem>

                <BentoItem colSpan={1} rowSpan={1}>
                    <GlassCard
                        className="h-full flex flex-col justify-between p-6 hover:bg-white/5 transition-all duration-300 cursor-pointer group hover:-translate-y-1 hover:shadow-glass-lg hover:border-purple-500"
                        onClick={() => navigate('/dashboard/matches')}
                    >
                        <div className="flex justify-between items-start">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-500/10 text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors duration-300">
                                <Calendar className="w-5 h-5" weight="fill" />
                            </div>
                            {activeTournamentId && tournamentSummary && (
                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-[10px] font-bold text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider border border-purple-500/20">
                                        {tournamentSummary.totalMatches - tournamentSummary.completedMatches} Scheduled
                                    </span>
                                    {tournamentSummary.completedMatches > 0 && (
                                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider border border-emerald-500/20">
                                            {tournamentSummary.completedMatches} Completed
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-foreground tracking-tight mt-4">
                                {activeTournamentId && tournamentSummary
                                    ? tournamentSummary.totalMatches.toLocaleString()
                                    : globalStats?.upcomingMatches.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground font-medium mt-1">
                                {activeTournamentId ? "Total Matches" : "Upcoming Matches"}
                            </div>
                        </div>
                    </GlassCard>
                </BentoItem>

                {/* 6. Discipline / Stats KPI */}
                <BentoItem colSpan={1} rowSpan={1}>
                    <GlassCard
                        className="h-full flex flex-col justify-between p-6 group hover:bg-white/5 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-glass-lg hover:border-red-500"
                        onClick={() => navigate('/dashboard/stats')}
                    >
                        <div className="flex justify-between items-start">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500/10 text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors duration-300">
                                <UsersThree className="w-5 h-5" weight="fill" />
                            </div>
                            {tournamentSummary && (
                                <div className="flex gap-1 text-[10px] font-bold uppercase tracking-wider">
                                    <span className="bg-yellow-500/20 text-yellow-600 px-1.5 py-0.5 rounded border border-yellow-500/20">{tournamentSummary.totalYellowCards} YC</span>
                                    <span className="bg-red-500/20 text-red-600 px-1.5 py-0.5 rounded border border-red-500/20">{tournamentSummary.totalRedCards} RC</span>
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-foreground tracking-tight mt-4">
                                {tournamentSummary ? tournamentSummary.totalTries : globalStats?.totalTeams.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground font-medium mt-1">
                                {tournamentSummary ? "Total Tries Scored" : "Total Teams Registered"}
                            </div>
                        </div>
                    </GlassCard>
                </BentoItem>

                {/* 7. Recent Activity (2x2) */}
                <BentoItem colSpan={2} rowSpan={1} className="lg:col-span-1 lg:row-span-1">
                    <RecentActivityWidget
                        scope={activityScope}
                        entityId={activityEntityId}
                        limit={5}
                        title="Recent Updates"
                    />
                </BentoItem>

                {/* 8. Extra Space / Fallback */}
                <BentoItem colSpan={1} rowSpan={1}>
                    <GlassCard
                        className="h-full flex flex-col justify-between p-6 hover:bg-white/5 transition-all duration-300 cursor-pointer group hover:-translate-y-1 hover:shadow-glass-lg hover:border-orange-500"
                        onClick={() => navigate('/dashboard/organisations')}
                    >
                        <div className="flex justify-between items-start">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors duration-300">
                                <Buildings className="w-5 h-5" weight="fill" />
                            </div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-foreground tracking-tight mt-4">{orgsCount.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground font-medium mt-1">Organisations</div>
                        </div>
                    </GlassCard>
                </BentoItem>

            </BentoGrid>

        </div>
    );
};
