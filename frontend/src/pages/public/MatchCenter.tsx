import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clock, Users, ChartBar, FilmStrip } from '@phosphor-icons/react';
import { publicTournamentApi, PublicMatchDetail } from '../../api/public.api';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { MatchHeroCard } from './match/MatchHeroCard';
import { MatchStatsSection } from './match/MatchStatsSection';
import { MatchMoments } from './match/MatchMoments';
import { MomentumIndicator } from './match/MomentumIndicator';
import { DisciplineImpactCard } from './match/DisciplineImpactCard';
import { ScoringBreakdown } from './match/ScoringBreakdown';
import { MatchLineups } from './match/MatchLineups';
import { SponsorsSection } from '@/components/public/SponsorsSection';

type MatchTab = 'lineups' | 'stats' | 'moments';

const TAB_CONFIG: { key: MatchTab; label: string; icon: typeof Users }[] = [
    { key: 'lineups', label: 'Lineups', icon: Users },
    { key: 'stats', label: 'Match Stats', icon: ChartBar },
    { key: 'moments', label: 'Moments', icon: FilmStrip },
];

export default function MatchCenter() {
    const { matchId } = useParams<{ matchId: string }>();
    const [match, setMatch] = useState<PublicMatchDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [tournamentName, setTournamentName] = useState<string>('');
    const [activeTab, setActiveTab] = useState<MatchTab>('lineups');
    const intervalRef = useRef<number | null>(null);

    useEffect(() => {
        if (matchId) {
            loadMatch();

            // Set up polling for live matches
            if (match?.status === 'LIVE' || match?.status === 'ONGOING') {
                intervalRef.current = window.setInterval(() => {
                    loadMatch(true);
                }, 15000); // Poll every 15 seconds
            }

            return () => {
                if (intervalRef.current) {
                    window.clearInterval(intervalRef.current);
                }
            };
        }
    }, [matchId, match?.status]);

    // Apply branding
    useEffect(() => {
        if (match?.organiserBranding?.primaryColor) {
            const root = document.documentElement;
            const { primaryColor, secondaryColor, accentColor } = match.organiserBranding;

            root.style.setProperty('--brand-primary', primaryColor);
            if (secondaryColor) root.style.setProperty('--brand-secondary', secondaryColor);
            if (accentColor) root.style.setProperty('--brand-accent', accentColor);

            return () => {
                root.style.removeProperty('--brand-primary');
                root.style.removeProperty('--brand-secondary');
                root.style.removeProperty('--brand-accent');
            };
        }
    }, [match]);


    const loadMatch = async (silent = false) => {
        if (!matchId) return;

        if (!silent) setLoading(true);

        try {
            const data = await publicTournamentApi.getMatch(matchId);
            setMatch(data);
            setLastUpdated(new Date());

            // Fetch tournament name if we have a slug/id
            if (data.tournamentSlug || data.tournamentId) {
                try {
                    const tournamentData = await publicTournamentApi.getTournament(data.tournamentSlug || data.tournamentId!);
                    setTournamentName(tournamentData.name);
                } catch (tError) {
                    console.error('Failed to load tournament details:', tError);
                }
            }
        } catch (error) {
            console.error('Failed to load match:', error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    if (loading && !match) {
        return (
            <div className="space-y-6 animate-pulse">
                {/* Hero Skeleton */}
                <div className="h-64 md:h-80 w-full bg-white/20 dark:bg-slate-800/40 rounded-3xl" />
                {/* Content Skeleton */}
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 h-96 bg-white/20 dark:bg-slate-800/40 rounded-2xl" />
                    <div className="md:col-span-1 h-96 bg-white/20 dark:bg-slate-800/40 rounded-2xl" />
                </div>
            </div>
        );
    }

    if (!match) {
        return (
            <div className="text-center py-24">
                <Clock className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Match Not Found</h2>
                <p className="text-slate-500 mb-8">The match you are looking for does not exist or has been removed.</p>
                <Link to="/tournaments" className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition">
                    Browse Matches
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* Nav Back */}
            <div className="flex items-center justify-between">
                <Breadcrumbs
                    items={[
                        { label: 'Tournaments', path: '/tournaments' },
                        ...(match.tournamentSlug ? [{
                            label: tournamentName || 'Tournament',
                            path: `/tournaments/${match.tournamentSlug}`
                        }] : []),
                        { label: 'Match Center' }
                    ]}
                />
            </div>

            {/* Match Hero Container — Always Visible */}
            <div className="space-y-4">
                <MatchHeroCard
                    match={match}
                    lastUpdated={lastUpdated}
                    tournamentName={tournamentName}
                />

                {/* Sponsors (Compact) */}
                <div className="flex justify-center">
                    <SponsorsSection variant="compact" />
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex justify-center">
                <div className="inline-flex p-1 bg-white/60 dark:bg-white/5 rounded-2xl border border-slate-200/50 dark:border-white/10 backdrop-blur-md shadow-sm">
                    {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            id={`tab-${key}`}
                            onClick={() => setActiveTab(key)}
                            className={`
                                relative px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all duration-300
                                ${activeTab === key
                                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-md ring-1 ring-slate-200/50 dark:ring-white/10'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/40 dark:hover:bg-white/5'}
                            `}
                        >
                            <Icon className={`w-4 h-4 transition-colors ${activeTab === key ? 'text-blue-500' : ''}`} weight={activeTab === key ? 'fill' : 'regular'} />
                            <span className="hidden sm:inline">{label}</span>
                            {/* Active indicator dot — mobile only (when label is hidden) */}
                            {activeTab === key && (
                                <span className="sm:hidden absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="animate-fade-in">
                {/* Lineups Tab */}
                {activeTab === 'lineups' && (
                    <MatchLineups match={match} />
                )}

                {/* Match Stats Tab */}
                {activeTab === 'stats' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                        {/* Left Column: Momentum */}
                        <div className="lg:col-span-7 space-y-6">
                            <MomentumIndicator match={match} />
                            <ScoringBreakdown match={match} />
                        </div>

                        {/* Right Column: Stats & Extras */}
                        <div className="lg:col-span-5 space-y-6">
                            <MatchStatsSection match={match} />
                            <DisciplineImpactCard match={match} />
                        </div>
                    </div>
                )}

                {/* Moments Tab */}
                {activeTab === 'moments' && (
                    <MatchMoments
                        match={match}
                        fullTimeMinutes={match.matchDuration || 80}
                        isOneWay={match.isOneWayMatch || false}
                    />
                )}
            </div>

            {/* Footer Sponsors */}
            <div className="pt-8 border-t border-slate-200/50 dark:border-white/5">
                <SponsorsSection />
            </div>
        </div>
    );
}
