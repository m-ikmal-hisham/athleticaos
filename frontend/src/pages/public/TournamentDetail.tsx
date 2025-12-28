import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, MapPin, Trophy, ArrowLeft, Clock, VideoCamera, ShareNetwork } from '@phosphor-icons/react';
import { GlassCard } from '@/components/GlassCard';

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
        if (id) {
            loadTournamentData();
        }
    }, [id]);

    // Apply tournament organizer branding to page
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
                publicTournamentApi.getTournamentById(id),
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

    const groupMatchesByDate = (matches: PublicMatchSummary[]) => {
        const grouped = new Map<string, PublicMatchSummary[]>();
        matches.forEach(match => {
            const date = match.matchDate;
            if (!grouped.has(date)) {
                grouped.set(date, []);
            }
            grouped.get(date)!.push(match);
        });
        return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    };

    const fixturesMatches = matches.filter(m =>
        m.status === 'SCHEDULED' || m.status === 'LIVE' || m.status === 'ONGOING'
    );
    const resultsMatches = matches.filter(m =>
        m.status === 'COMPLETED' || m.status === 'FULL_TIME'
    );

    const displayMatches = activeTab === 'fixtures' ? fixturesMatches : resultsMatches;
    const groupedMatches = groupMatchesByDate(displayMatches);

    // Filter relevant matches for Pools and Brackets
    const hasStandings = standings.length > 0;
    const hasPoolMatches = matches.some(m => m.stage?.toLowerCase().includes('pool') || m.stage?.toLowerCase().includes('group'));
    const showPoolTab = hasStandings || hasPoolMatches;

    const hasKnockoutMatches = matches.some(m => {
        const stage = m.stage?.toLowerCase() || '';
        return stage && !stage.includes('pool') && !stage.includes('group');
    });

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-32 bg-white/50 dark:bg-slate-800/50 rounded-lg animate-pulse" />
                <div className="h-48 bg-white/50 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
                <div className="h-96 bg-white/50 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
            </div>
        );
    }

    if (!tournament) {
        return (
            <div className="text-center py-16">
                <Trophy className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                <p className="text-lg font-medium text-slate-900 dark:text-white">
                    Tournament not found
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <Link
                to="/tournaments"
                className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Tournaments
            </Link>

            {/* Live Stream Section */}
            {tournament?.livestreamUrl && (
                <div className="mb-8">
                    <div className="bg-black/95 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 relative aspect-video md:aspect-[21/9]">
                        {(() => {
                            // Robust YouTube ID extraction
                            const getYouTubeId = (url: string) => {
                                if (!url) return null;
                                const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
                                const match = url.match(regExp);
                                return (match && match[7].length === 11) ? match[7] : null;
                            };

                            const videoId = getYouTubeId(tournament.livestreamUrl);

                            if (videoId) {
                                return (
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`}
                                        title="Live Stream"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="absolute inset-0 w-full h-full"
                                    />
                                );
                            } else {
                                // Fallback for non-YouTube links
                                return (
                                    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gradient-to-br from-gray-900 to-black">
                                        <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center mb-4 animate-pulse">
                                            <VideoCamera className="w-8 h-8 text-white" weight="fill" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-2">Watch Live</h3>
                                        <p className="text-gray-400 mb-6 max-w-md">
                                            Follow the action live on our official stream.
                                        </p>
                                        <a
                                            href={tournament.livestreamUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors flex items-center gap-2"
                                        >
                                            <ShareNetwork className="w-5 h-5" />
                                            Open Stream
                                        </a>
                                    </div>
                                );
                            }
                        })()}
                    </div>
                </div>
            )}

            {/* Tournament Header */}
            <GlassCard
                className={`p-8 relative overflow-hidden transition-colors ${tournament.organiserBranding?.primaryColor
                    ? 'border-[color:var(--brand-primary)] border-t-4'
                    : ''
                    }`}
            >
                {/* Background Tint if branding exists */}
                {tournament.organiserBranding?.primaryColor && (
                    <div
                        className="absolute inset-0 opacity-5 pointer-events-none bg-[color:var(--brand-primary)]"
                    />
                )}

                <div className="space-y-4 relative z-10">
                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                        {tournament.live && (
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-medium">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                LIVE NOW
                            </div>
                        )}
                        {tournament.completed && (
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700/30 text-slate-700 dark:text-slate-300 text-sm font-medium">
                                COMPLETED
                            </div>
                        )}
                    </div>

                    {/* Title */}
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
                            {tournament.name}
                        </h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400 mt-2">
                            {tournament.level}
                            {tournament.competitionType && ` • ${tournament.competitionType}`}
                        </p>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                        <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                            <Calendar className="w-5 h-5 text-blue-600" />
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-500">Dates</p>
                                <p className="font-medium">
                                    {new Date(tournament.startDate).toLocaleDateString()} -{' '}
                                    {new Date(tournament.endDate).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                            <MapPin className="w-5 h-5 text-blue-600" />
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-500">Venue</p>
                                <p className="font-medium">{tournament.venue}</p>
                            </div>
                        </div>
                        {tournament.seasonName && (
                            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                                <Trophy className="w-5 h-5 text-blue-600" />
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-500">Season</p>
                                    <p className="font-medium">{tournament.seasonName}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>


                {/* Display Logo independently or within branding if available */}
                <div className="absolute top-8 right-8 hidden md:block">
                    <TournamentLogo
                        tournamentId={tournament.id}
                        logoUrl={tournament.logoUrl || tournament.organiserBranding?.logoUrl}
                        className="w-16 h-16 object-contain rounded-xl shadow-sm bg-white/50 backdrop-blur-sm"
                    />
                </div>
            </GlassCard>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200/50 dark:border-slate-700/50 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('fixtures')}
                    className={`px-4 py-2 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'fixtures'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                >
                    Fixtures ({fixturesMatches.length})
                    {activeTab === 'fixtures' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('results')}
                    className={`px-4 py-2 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'results'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                >
                    Results ({resultsMatches.length})
                    {activeTab === 'results' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                    )}
                </button>
                {showPoolTab && (
                    <button
                        onClick={() => setActiveTab('standings')}
                        className={`px-4 py-2 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'standings'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                    >
                        Pool Standings
                        {activeTab === 'standings' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                        )}
                    </button>
                )}
                {hasKnockoutMatches && (
                    <button
                        onClick={() => setActiveTab('bracket')}
                        className={`px-4 py-2 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'bracket'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                    >
                        Knockout Bracket
                        {activeTab === 'bracket' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                        )}
                    </button>
                )}
            </div>

            {/* Tab Content */}
            <div className="min-h-[300px]">
                {activeTab === 'standings' ? (
                    <PublicTournamentPools standings={standings} />
                ) : activeTab === 'bracket' ? (
                    <PublicTournamentBracket matches={matches} />
                ) : (
                    groupedMatches.length === 0 ? (
                        <div className="text-center py-16 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50">
                            <Trophy className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                            <p className="text-slate-600 dark:text-slate-400">
                                No {activeTab} available
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {groupedMatches.map(([date, dateMatches]) => (
                                <div key={date} className="space-y-3">
                                    {/* Date Header */}
                                    <div className="flex items-center gap-3">
                                        <div className="h-px flex-1 bg-slate-200/50 dark:bg-slate-700/50" />
                                        <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                            {new Date(date).toLocaleDateString('en-US', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </h3>
                                        <div className="h-px flex-1 bg-slate-200/50 dark:bg-slate-700/50" />
                                    </div>

                                    {/* Matches for this date */}
                                    <div className="space-y-3">
                                        {dateMatches.map(match => (
                                            <Link
                                                key={match.id}
                                                to={`/matches/${match.code || match.id}`}
                                                className="block rounded-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 hover:border-blue-500 dark:hover:border-red-500 transition-all hover:shadow-lg p-4"
                                            >
                                                <div className="flex items-center justify-between gap-4">
                                                    {/* Time & Status */}
                                                    <div className="flex items-center gap-3 min-w-[100px]">
                                                        <Clock className="w-4 h-4 text-slate-400" />
                                                        <div className="text-sm">
                                                            {match.status === 'LIVE' || match.status === 'ONGOING' ? (
                                                                <span className="font-medium text-red-600 dark:text-red-400">
                                                                    LIVE
                                                                </span>
                                                            ) : match.status === 'COMPLETED' || match.status === 'FULL_TIME' ? (
                                                                <span className="text-slate-600 dark:text-slate-400">FT</span>
                                                            ) : (
                                                                <span className="text-slate-600 dark:text-slate-400">
                                                                    {match.matchTime}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Teams & Score */}
                                                    <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                                                        <div className="text-right">
                                                            <p className="font-medium text-slate-900 dark:text-white">
                                                                {match.homeTeamName}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-3 px-4">
                                                            {match.homeScore !== null && match.awayScore !== null ? (
                                                                <div className="flex items-center gap-2 text-lg font-bold">
                                                                    <span className="text-slate-900 dark:text-white">
                                                                        {match.homeScore}
                                                                    </span>
                                                                    <span className="text-slate-400">-</span>
                                                                    <span className="text-slate-900 dark:text-white">
                                                                        {match.awayScore}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-400">vs</span>
                                                            )}
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="font-medium text-slate-900 dark:text-white">
                                                                {match.awayTeamName}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Venue */}
                                                    {match.venue && (
                                                        <div className="hidden md:flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 min-w-[150px]">
                                                            <MapPin className="w-4 h-4" />
                                                            <span className="truncate">{match.venue}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
