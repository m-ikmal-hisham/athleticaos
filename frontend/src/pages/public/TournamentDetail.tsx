import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Trophy, Clock, VideoCamera, ShareNetwork, CaretRight, CaretDown, Star, Table, Users, UserCircle, MagnifyingGlass } from '@phosphor-icons/react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { GlassCard } from '@/components/GlassCard';
import { Badge } from '@/components/Badge';

import { TournamentLogo } from '@/components/common/TournamentLogo';
import {
    publicTournamentApi,
    publicProfileApi,
    PublicTournamentDetail,
    PublicMatchSummary,
    PublicStanding,
    PublicPlayerSummary,
} from '../../api/public.api';
import { PublicTournamentPools } from './components/PublicTournamentPools';
import { PublicTournamentBracket } from './components/PublicTournamentBracket';
import { PublicStats } from './components/PublicStats';
import { formatTournamentLevel, formatTeamShortName } from '@/utils/formatters';

export default function TournamentDetail() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [tournament, setTournament] = useState<PublicTournamentDetail | null>(null);
    const [matches, setMatches] = useState<PublicMatchSummary[]>([]);
    const [standings, setStandings] = useState<PublicStanding[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'fixtures' | 'results' | 'standings' | 'bracket' | 'stats' | 'teams' | 'players'>('fixtures');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});
    const [teamRosters, setTeamRosters] = useState<Record<string, PublicPlayerSummary[]>>({});
    const [teamSearch, setTeamSearch] = useState('');

    useEffect(() => {
        if (id) loadTournamentData();
    }, [id]);

    useEffect(() => {
        if (id && tournament) { // Only fetch if tournament is loaded
            loadCategoryData();
        }
    }, [selectedCategoryId]);

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
            const tournamentData = await publicTournamentApi.getTournament(id);
            setTournament(tournamentData);

            // Set default category if available
            if (tournamentData.categories && tournamentData.categories.length > 0) {
                setSelectedCategoryId(tournamentData.categories[0].id);
            } else {
                // Load all if no categories
                const [matchesData, standingsData] = await Promise.all([
                    publicTournamentApi.getTournamentMatches(id),
                    publicTournamentApi.getTournamentStandings(id).catch(() => []),
                ]);
                setMatches(matchesData);
                setStandings(standingsData || []);
            }
        } catch (error) {
            console.error('Failed to load tournament:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadCategoryData = async () => {
        if (!id) return;
        setLoading(true); // Maybe use a separate loading state for data refresh?
        try {
            const [matchesData, standingsData] = await Promise.all([
                publicTournamentApi.getTournamentMatches(id, selectedCategoryId || undefined),
                publicTournamentApi.getTournamentStandings(id, selectedCategoryId || undefined).catch(() => []),
            ]);
            setMatches(matchesData);
            setStandings(standingsData || []);
        } catch (error) {
            console.error('Failed to load category data:', error);
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


    if (loading && !tournament) return <div className="space-y-6 animate-pulse p-8"><div className="h-64 bg-slate-800/10 rounded-2xl"></div></div>;
    if (!tournament) return <div className="text-center py-20 text-slate-500">Tournament not found</div>;

    return (
        <div className="space-y-8 pb-20">

            {/* Nav & Context */}
            <Breadcrumbs
                items={[
                    { label: 'Tournaments', path: '/tournaments' },
                    { label: tournament.name }
                ]}
                className="mb-4"
            />

            {/* Hero / Header Section */}
            <div className="relative">
                {/* Background Decoration */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-3xl blur-3xl -z-10" />

                <GlassCard className="p-0 overflow-hidden border-0 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl group">
                    <div className="relative min-h-[16rem] flex flex-col justify-end">
                        {/* Cover Image or Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 overflow-hidden">
                            {tournament.organiserBranding?.coverImageUrl && (
                                <img src={tournament.organiserBranding.coverImageUrl} alt="Cover" className="w-full h-full object-cover opacity-60" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                        </div>

                        {/* Content Overlay */}
                        <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-6">
                            {/* Logo */}
                            <div className="relative shrink-0">
                                <TournamentLogo
                                    tournamentId={tournament.id}
                                    logoUrl={tournament.logoUrl || tournament.organiserBranding?.logoUrl}
                                    className="w-20 h-20 md:w-32 md:h-32 bg-white dark:bg-slate-950 rounded-2xl shadow-xl p-2 object-contain border-4 border-white dark:border-slate-900"
                                />
                            </div>

                            {/* Text Info */}
                            <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-3 mb-2">
                                    <Badge variant="outline" className="bg-white/10 text-white border-white/20 backdrop-blur-md">
                                        {formatTournamentLevel(tournament.level)}
                                    </Badge>
                                    {tournament.live && <Badge variant="destructive" className="animate-pulse">LIVE NOW</Badge>}
                                    {tournament.completed && <Badge variant="secondary">Completed</Badge>}
                                </div>
                                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-lg mb-2 leading-tight">
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

            {/* Category Filter */}
            {tournament.categories && tournament.categories.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {tournament.categories.map(category => (
                        <button
                            key={category.id}
                            onClick={() => setSelectedCategoryId(category.id)}
                            className={`
                                px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors
                                ${selectedCategoryId === category.id
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}
                            `}
                        >
                            {category.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                {/* Left Nav (Tabs as Sidebar on Desktop, Scroll on Mobile) - spans 1 */}
                <div className="lg:col-span-1">
                    <nav className="flex lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0 sticky top-24">
                        {[
                            { id: 'fixtures', label: 'Fixtures', icon: Calendar, count: fixturesMatches.length },
                            { id: 'results', label: 'Results', icon: Trophy, count: resultsMatches.length },
                            { id: 'stats', label: 'Stats', icon: Star, count: null },
                            ...(showPoolTab ? [{ id: 'standings', label: 'Standings', icon: Table, count: null }] : []),
                            ...(hasKnockoutMatches ? [{ id: 'bracket', label: 'Bracket', icon: ShareNetwork, count: null }] : []),
                            { id: 'teams', label: 'Teams', icon: Users, count: tournament.teams?.length || null },
                            { id: 'players', label: 'Players', icon: UserCircle, count: null },
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
                        {loading ? (
                            <div className="space-y-6 animate-pulse pt-4">
                                <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                                <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                                <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                            </div>
                        ) : activeTab === 'standings' ? (
                            <PublicTournamentPools standings={standings} />
                        ) : activeTab === 'stats' ? (
                            <PublicStats tournamentId={tournament.id} categoryId={selectedCategoryId || undefined} />
                        ) : activeTab === 'bracket' ? (
                            <PublicTournamentBracket matches={matches} />
                        ) : activeTab === 'teams' ? (
                            /* Teams Tab Content */
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <Users className="w-5 h-5 text-blue-500" weight="fill" />
                                        Participating Teams
                                        <span className="ml-2 text-sm font-normal text-slate-400">{tournament.teams?.length || 0} teams</span>
                                    </h2>
                                    {tournament.teams && tournament.teams.length > 5 && (
                                        <div className="relative w-full sm:w-64">
                                            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Search teams..."
                                                value={teamSearch}
                                                onChange={(e) => setTeamSearch(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            />
                                        </div>
                                    )}
                                </div>
                                {tournament.teams && tournament.teams.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {tournament.teams
                                            .filter(t => !teamSearch || t.name.toLowerCase().includes(teamSearch.toLowerCase()) || t.shortName?.toLowerCase().includes(teamSearch.toLowerCase()))
                                            .map((team) => (
                                            <div
                                                key={team.id}
                                                onClick={() => navigate(`/teams/${team.slug || team.id}`)}
                                                className="group flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer"
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center overflow-hidden shrink-0">
                                                    {team.logoUrl ? (
                                                        <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain p-1" />
                                                    ) : (
                                                        <span className="text-sm font-bold text-slate-400">{team.name?.slice(0, 2)?.toUpperCase()}</span>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                        {team.name}
                                                    </div>
                                                    {team.shortName && (
                                                        <div className="text-xs text-slate-400 truncate">{team.shortName}</div>
                                                    )}
                                                </div>
                                                <CaretRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                                        <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                                        <p className="text-slate-500 font-medium">No teams registered yet.</p>
                                    </div>
                                )}
                            </div>
                        ) : activeTab === 'players' ? (
                            /* Players Tab Content - Expandable Team Accordions */
                            <div className="space-y-4">
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <UserCircle className="w-5 h-5 text-emerald-500" weight="fill" />
                                    Tournament Players
                                </h2>
                                {tournament.teams && tournament.teams.length > 0 ? (
                                    <div className="space-y-3">
                                        {tournament.teams.map((team) => {
                                            const isExpanded = expandedTeams[team.id] || false;
                                            const roster = teamRosters[team.id];

                                            const toggleTeam = async () => {
                                                const newExpanded = !isExpanded;
                                                setExpandedTeams(prev => ({ ...prev, [team.id]: newExpanded }));
                                                // Fetch roster if expanding and not already fetched
                                                if (newExpanded && !roster) {
                                                    try {
                                                        const teamData = await publicProfileApi.getTeam(team.slug || team.id);
                                                        setTeamRosters(prev => ({ ...prev, [team.id]: teamData.players || [] }));
                                                    } catch (err) {
                                                        console.error('Failed to fetch roster for', team.name, err);
                                                        setTeamRosters(prev => ({ ...prev, [team.id]: [] }));
                                                    }
                                                }
                                            };

                                            return (
                                                <div key={team.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden transition-all">
                                                    {/* Team Header (Click to Expand) */}
                                                    <button
                                                        onClick={toggleTeam}
                                                        className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                                                    >
                                                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                                                            {team.logoUrl ? (
                                                                <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain p-0.5" />
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-slate-400">{team.name?.slice(0, 2)?.toUpperCase()}</span>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="text-sm font-bold text-slate-800 dark:text-white truncate">{team.name}</h3>
                                                            {team.shortName && <span className="text-xs text-slate-400">{team.shortName}</span>}
                                                        </div>
                                                        {roster && <span className="text-xs text-slate-400 mr-1">{roster.length} players</span>}
                                                        <CaretDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                                    </button>

                                                    {/* Expanded Roster */}
                                                    {isExpanded && (
                                                        <div className="border-t border-slate-200 dark:border-slate-800">
                                                            {!roster ? (
                                                                <div className="p-6 flex justify-center">
                                                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                                                                </div>
                                                            ) : roster.length === 0 ? (
                                                                <div className="p-6 text-center text-sm text-slate-400">No players found for this team.</div>
                                                            ) : (
                                                                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                    {roster.map((player) => (
                                                                        <div
                                                                            key={player.id}
                                                                            onClick={() => navigate(`/players/${player.id}`)}
                                                                            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
                                                                        >
                                                                            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 text-xs font-bold text-slate-400">
                                                                                {player.firstName.charAt(0)}{player.lastName.charAt(0)}
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="text-sm font-semibold text-slate-800 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                                                    {player.firstName} {player.lastName}
                                                                                </div>
                                                                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                                                                    {player.position && <span>{player.position}</span>}
                                                                                    {player.jerseyNumber != null && (
                                                                                        <span className="text-blue-500 font-medium">#{player.jerseyNumber}</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {/* Link to full team page */}
                                                            <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-2.5">
                                                                <button
                                                                    onClick={() => navigate(`/teams/${team.slug || team.id}`)}
                                                                    className="text-xs text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1 transition-colors"
                                                                >
                                                                    View full team profile <CaretRight className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                                        <UserCircle className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                                        <p className="text-slate-500 font-medium">No players registered yet.</p>
                                    </div>
                                )}
                            </div>
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
                                                            <div className="flex-1 flex items-center gap-2 min-w-0">
                                                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center overflow-hidden shrink-0">
                                                                    {match.homeTeamLogoUrl ? (
                                                                        <img src={match.homeTeamLogoUrl} alt={match.homeTeamName} className="w-full h-full object-contain p-0.5" />
                                                                    ) : (
                                                                        <span className="text-[10px] font-bold text-slate-400">{match.homeTeamName?.slice(0, 2)?.toUpperCase()}</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex flex-col gap-0.5 min-w-0">
                                                                    <span className="font-bold text-slate-900 dark:text-white text-base leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                                                        {formatTeamShortName(match.homeTeamShortName, match.homeTeamName)}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Home</span>
                                                                </div>
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
                                                            <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
                                                                <div className="flex flex-col items-end gap-0.5 min-w-0">
                                                                    <span className="font-bold text-slate-900 dark:text-white text-base leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate text-right">
                                                                        {formatTeamShortName(match.awayTeamShortName, match.awayTeamName)}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Away</span>
                                                                </div>
                                                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center overflow-hidden shrink-0">
                                                                    {match.awayTeamLogoUrl ? (
                                                                        <img src={match.awayTeamLogoUrl} alt={match.awayTeamName} className="w-full h-full object-contain p-0.5" />
                                                                    ) : (
                                                                        <span className="text-[10px] font-bold text-slate-400">{match.awayTeamName?.slice(0, 2)?.toUpperCase()}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Match Officials */}
                                                        {match.officials && match.officials.length > 0 && (
                                                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/50 flex flex-wrap gap-2">
                                                                {match.officials.map((official, idx) => (
                                                                    <div key={official.id || idx} className="flex flex-col flex-1 min-w-[100px] bg-slate-50 dark:bg-slate-800/80 rounded py-1.5 px-2 border border-slate-200 dark:border-slate-700/50">
                                                                        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-0.5">
                                                                            {(official.officialRoleName || official.assignedRole || '').replace(/_/g, ' ')}
                                                                        </span>
                                                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate w-full" title={official.officialName}>
                                                                            {official.officialName}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
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
