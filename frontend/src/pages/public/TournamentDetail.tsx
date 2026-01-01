
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, MapPin, Trophy, ArrowLeft, Clock, VideoCamera, ShareNetwork, CaretRight, Star } from '@phosphor-icons/react';
import { GlassCard } from '@/components/GlassCard';
import { Badge } from '@/components/Badge';

import { TournamentLogo } from '@/components/common/TournamentLogo';
import {
    publicTournamentApi,
    PublicTournamentDetail,
    PublicMatchSummary,
    PublicStanding,
} from '../../api/public.api';
import { PublicTournamentPools } from './components/PublicTournamentPools';
import { PublicTournamentBracket } from './components/PublicTournamentBracket';

export default function TournamentDetail() {
    const { id } = useParams<{ id: string }>();
    const [tournament, setTournament] = useState<PublicTournamentDetail | null>(null);
    const [matches, setMatches] = useState<PublicMatchSummary[]>([]);
    const [standings, setStandings] = useState<PublicStanding[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'fixtures' | 'results' | 'standings' | 'bracket'>('fixtures');

    useEffect(() => {
        if (id) loadTournamentData();
    }, [id]);

    // Apply branding
    useEffect(() => {
        if (tournament?.organiserBranding?.primaryColor) {
            const root = document.documentElement;
            const { primaryColor, secondaryColor, accentColor } = tournament.organiserBranding;
            root.style.setProperty('--brand-primary', primaryColor);
            if (secondaryColor) root.style.setProperty('--brand-secondary', secondaryColor);
            if (accentColor) root.style.setProperty('--brand-accent', accentColor);
            return () => {
                root.style.removeProperty('--brand-primary');
                root.style.removeProperty('--brand-secondary');
                root.style.removeProperty('--brand-accent');
            };
        }
    }, [tournament]);

    const loadTournamentData = async () => {
        if (!id) return;
        try {
            const [tournamentData, matchesData, standingsData] = await Promise.all([
                publicTournamentApi.getTournament(id),
                publicTournamentApi.getTournamentMatches(id),
                publicTournamentApi.getTournamentStandings(id).catch(() => []),
            ]);
            setTournament(tournamentData);
            setMatches(matchesData);
            setStandings(standingsData || []);
        } catch (error) {
            console.error('Failed to load tournament:', error);
        } finally {
            setLoading(false);
        }
    };

    // Helper: Group matches
    const groupMatchesByDate = (matches: PublicMatchSummary[]) => {
        const grouped = new Map<string, PublicMatchSummary[]>();
        matches.forEach(match => {
            const date = match.matchDate;
            if (!grouped.has(date)) grouped.set(date, []);
            grouped.get(date)!.push(match);
        });
        return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    };

    const fixturesMatches = matches.filter(m => ['SCHEDULED', 'LIVE', 'ONGOING'].includes(m.status));
    const resultsMatches = matches.filter(m => ['COMPLETED', 'FULL_TIME', 'CANCELLED'].includes(m.status));

    // Logic for Tabs
    const displayMatches = activeTab === 'fixtures' ? fixturesMatches : resultsMatches;
    const groupedMatches = groupMatchesByDate(displayMatches);
    const hasStandings = standings.length > 0;
    const hasPoolMatches = matches.some(m => m.stage?.toLowerCase().includes('pool') || m.stage?.toLowerCase().includes('group'));
    const showPoolTab = hasStandings || hasPoolMatches;
    const hasKnockoutMatches = matches.some(m => {
        const stage = m.stage?.toLowerCase() || '';
        return stage && !stage.includes('pool') && !stage.includes('group');
    });


    if (loading) return <div className="space-y-6 animate-pulse p-8"><div className="h-64 bg-slate-800/10 rounded-2xl"></div></div>;
    if (!tournament) return <div className="text-center py-20 text-slate-500">Tournament not found</div>;

    return (
        <div className="space-y-8 pb-20">

            {/* Nav & Context */}
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Link to="/tournaments" className="hover:text-blue-500 transition-colors flex items-center gap-1">
                    <ArrowLeft /> Tournaments
                </Link>
                <span className="opacity-30">/</span>
                <span className="font-semibold text-slate-900 dark:text-white truncate">{tournament.name}</span>
            </div>

            {/* Hero / Header Section */}
            <div className="relative">
                {/* Background Decoration */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-3xl blur-3xl -z-10" />

                <GlassCard className="p-0 overflow-hidden border-0 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                    <div className="relative">
                        {/* Cover Image or Gradient */}
                        <div className="h-48 md:h-64 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
                            {tournament.organiserBranding?.coverImageUrl && (
                                <img src={tournament.organiserBranding.coverImageUrl} alt="Cover" className="w-full h-full object-cover opacity-60" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                        </div>

                        {/* Content Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 flex flex-col md:flex-row items-end md:items-center gap-6">
                            {/* Logo */}
                            <div className="relative -mb-12 md:mb-0 shrink-0">
                                <TournamentLogo
                                    tournamentId={tournament.id}
                                    logoUrl={tournament.logoUrl || tournament.organiserBranding?.logoUrl}
                                    className="w-24 h-24 md:w-32 md:h-32 bg-white dark:bg-slate-950 rounded-2xl shadow-xl p-2 object-contain border-4 border-white dark:border-slate-900"
                                />
                            </div>

                            {/* Text Info */}
                            <div className="flex-1 pb-2">
                                <div className="flex flex-wrap items-center gap-3 mb-2">
                                    <Badge variant="outline" className="bg-white/10 text-white border-white/20 backdrop-blur-md">
                                        {tournament.level}
                                    </Badge>
                                    {tournament.live && <Badge variant="destructive" className="animate-pulse">LIVE NOW</Badge>}
                                    {tournament.completed && <Badge variant="secondary">Completed</Badge>}
                                </div>
                                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-lg mb-2">
                                    {tournament.name}
                                </h1>
                                <div className="flex flex-wrap items-center gap-4 text-slate-300 text-sm font-medium">
                                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-blue-400" /> {new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}</span>
                                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-red-400" /> {tournament.venue}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Livestream Integration (Collapsible or Preview) */}
                    {tournament.livestreamUrl && (
                        <div className="p-4 bg-black/5 border-t border-white/10 flex items-center justify-between">
                            <span className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                                <VideoCamera className="w-4 h-4 text-red-500" /> Official Stream Available
                            </span>
                            <a href={tournament.livestreamUrl} target="_blank" rel="noreferrer" className="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-2 transition-transform hover:scale-105">
                                Watch Live <ShareNetwork />
                            </a>
                        </div>
                    )}
                </GlassCard>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                {/* Left Nav (Tabs as Sidebar on Desktop, Scroll on Mobile) - spans 1 */}
                <div className="lg:col-span-1">
                    <nav className="flex lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0 sticky top-24">
                        {[
                            { id: 'fixtures', label: 'Fixtures', icon: Calendar, count: fixturesMatches.length },
                            { id: 'results', label: 'Results', icon: Trophy, count: resultsMatches.length },
                            ...(showPoolTab ? [{ id: 'standings', label: 'Standings', icon: Star, count: null }] : []),
                            ...(hasKnockoutMatches ? [{ id: 'bracket', label: 'Bracket', icon: ShareNetwork, count: null }] : []),
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`
                                    flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all font-medium text-sm whitespace-nowrap
                                    ${activeTab === tab.id
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 translate-x-1'
                                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }
                                `}
                            >
                                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : 'text-slate-400'}`} weight={activeTab === tab.id ? 'fill' : 'regular'} />
                                <span className="flex-1 text-left">{tab.label}</span>
                                {tab.count !== null && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Right Content Area - spans 3 */}
                <div className="lg:col-span-3 min-h-[500px]">
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {activeTab === 'standings' ? (
                            <PublicTournamentPools standings={standings} />
                        ) : activeTab === 'bracket' ? (
                            <PublicTournamentBracket matches={matches} />
                        ) : (
                            // Matches List (Fixtures or Results)
                            <div className="space-y-8">
                                {groupedMatches.length === 0 ? (
                                    <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                                        <Trophy className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                                        <p className="text-slate-500 font-medium">No matches found for this view.</p>
                                    </div>
                                ) : (
                                    groupedMatches.map(([date, dateMatches]) => (
                                        <div key={date} className="space-y-4">
                                            <div className="flex items-center gap-4">
                                                <h3 className="text-lg font-bold text-slate-800 dark:text-white bg-white/50 dark:bg-slate-900/50 backdrop-blur px-4 py-1 rounded-full border border-slate-200/50 dark:border-slate-700/50">
                                                    {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </h3>
                                                <div className="h-px flex-1 bg-gradient-to-r from-slate-200 dark:from-slate-800 to-transparent" />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {dateMatches.map(match => (
                                                    <Link
                                                        key={match.id}
                                                        to={`/matches/${match.code || match.id}`}
                                                        className="group relative bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-5 transition-all hover:shadow-xl hover:-translate-y-1 block overflow-hidden"
                                                    >
                                                        {/* Status Indicator */}
                                                        {['LIVE', 'ONGOING'].includes(match.status) && (
                                                            <div className="absolute top-0 right-0 px-3 py-1 bg-red-600 text-white text-[10px] font-bold uppercase rounded-bl-xl shadow-lg animate-pulse">
                                                                Live
                                                            </div>
                                                        )}

                                                        <div className="flex justify-between items-center mb-4">
                                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                {match.matchTime}
                                                                {match.venue && <span className="text-slate-500 ml-1">• {match.venue}</span>}
                                                            </div>
                                                            <div className="text-xs text-slate-500 font-medium group-hover:text-blue-500 transition-colors flex items-center gap-1">
                                                                Match Center <CaretRight weight="bold" />
                                                            </div>
                                                        </div>

                                                        {/* Score Block */}
                                                        <div className="flex items-center justify-between gap-4">
                                                            {/* Home */}
                                                            <div className="flex-1 flex flex-col items-start gap-1">
                                                                <span className="font-bold text-slate-900 dark:text-white text-lg leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                                    {match.homeTeamName}
                                                                </span>
                                                                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Home</span>
                                                            </div>

                                                            {/* Score */}
                                                            <div className="flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 min-w-[3.5rem] py-2 rounded-lg font-mono font-black text-xl text-slate-800 dark:text-white shrink-0">
                                                                {(match.homeScore !== undefined && match.awayScore !== undefined) ? (
                                                                    <div className="flex gap-1">
                                                                        <span>{match.homeScore}</span>
                                                                        <span className="text-slate-400 opacity-50">:</span>
                                                                        <span>{match.awayScore}</span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-400 text-sm">VS</span>
                                                                )}
                                                            </div>

                                                            {/* Away */}
                                                            <div className="flex-1 flex flex-col items-end gap-1 text-right">
                                                                <span className="font-bold text-slate-900 dark:text-white text-lg leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                                    {match.awayTeamName}
                                                                </span>
                                                                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Away</span>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
