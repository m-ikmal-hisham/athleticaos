import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, MapPin, Trophy, ArrowLeft, Clock } from 'lucide-react';
import {
    publicTournamentApi,
    PublicTournamentDetail,
    PublicMatchSummary,
} from '../../api/public.api';

export default function TournamentDetail() {
    const { id } = useParams<{ id: string }>();
    const [tournament, setTournament] = useState<PublicTournamentDetail | null>(null);
    const [matches, setMatches] = useState<PublicMatchSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'fixtures' | 'results'>('fixtures');

    useEffect(() => {
        if (id) {
            loadTournamentData();
        }
    }, [id]);

    const loadTournamentData = async () => {
        if (!id) return;

        try {
            const [tournamentData, matchesData] = await Promise.all([
                publicTournamentApi.getTournamentById(id),
                publicTournamentApi.getTournamentMatches(id),
            ]);
            setTournament(tournamentData);
            setMatches(matchesData);
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

            {/* Tournament Header */}
            <div className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-8">
                <div className="space-y-4">
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
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200/50 dark:border-slate-700/50">
                <button
                    onClick={() => setActiveTab('fixtures')}
                    className={`px-4 py-2 font-medium text-sm transition-colors relative ${activeTab === 'fixtures'
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
                    className={`px-4 py-2 font-medium text-sm transition-colors relative ${activeTab === 'results'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                >
                    Results ({resultsMatches.length})
                    {activeTab === 'results' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                    )}
                </button>
            </div>

            {/* Matches */}
            {groupedMatches.length === 0 ? (
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
                                        to={`/matches/${match.id}`}
                                        className="block rounded-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 hover:border-blue-500/50 transition-all hover:shadow-lg p-4"
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
            )}
        </div>
    );
}
