import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, CalendarBlank, ArrowsClockwise } from '@phosphor-icons/react';
import { ShareButton } from '@/components/common/ShareButton';
import { publicTournamentApi, PublicMatchDetail } from '../../api/public.api';

export default function MatchCenter() {
    const { matchId } = useParams<{ matchId: string }>();
    const [match, setMatch] = useState<PublicMatchDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
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
            const data = await publicTournamentApi.getMatchById(matchId);
            setMatch(data);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Failed to load match:', error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const getEventIcon = (eventType: string) => {
        switch (eventType) {
            case 'TRY':
                return '🏉';
            case 'CONVERSION':
                return '⚡';
            case 'PENALTY':
                return '🎯';
            case 'DROP_GOAL':
                return '🥅';
            case 'YELLOW_CARD':
                return '🟨';
            case 'RED_CARD':
                return '🟥';
            default:
                return '•';
        }
    };

    const formatEventType = (eventType: string) => {
        return eventType.replace(/_/g, ' ');
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-32 bg-white/50 dark:bg-slate-800/50 rounded-lg animate-pulse" />
                <div className="h-64 bg-white/50 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
                <div className="h-96 bg-white/50 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
            </div>
        );
    }

    if (!match) {
        return (
            <div className="text-center py-16">
                <Clock className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                <p className="text-lg font-medium text-slate-900 dark:text-white">
                    Match not found
                </p>
            </div>
        );
    }

    const isLive = match.status === 'LIVE' || match.status === 'ONGOING';
    const isCompleted = match.status === 'COMPLETED' || match.status === 'FULL_TIME';

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <Link
                to={match.tournamentSlug ? `/tournaments/${match.tournamentSlug}` : '/tournaments'}
                className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                {match.tournamentSlug ? 'Back to Tournament' : 'Back to Tournaments'}
            </Link>

            {/* Match Header */}
            <div
                className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 p-8 relative overflow-hidden border-[color:var(--brand-primary,hsl(var(--border)))]"
                // eslint-disable-next-line
                style={{
                    borderWidth: match.organiserBranding?.primaryColor ? '4px' : '1px'
                }}
            >
                {match.organiserBranding?.primaryColor && (
                    <div
                        className="absolute inset-0 opacity-5 pointer-events-none bg-[color:var(--brand-primary)]"
                    />
                )}

                <div className="space-y-6 relative z-10">
                    {/* Status & Last Updated */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {isLive && (
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-medium">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    LIVE
                                </div>
                            )}
                            {isCompleted && (
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700/30 text-slate-700 dark:text-slate-300 text-sm font-medium">
                                    FULL TIME
                                </div>
                            )}
                            {!isLive && !isCompleted && (
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium">
                                    SCHEDULED
                                </div>
                            )}
                        </div>
                        {isLive && (
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                                <ArrowsClockwise className="w-3 h-3" />
                                <span>Updated {lastUpdated.toLocaleTimeString()}</span>
                            </div>
                        )}
                    </div>

                    {/* Score Display */}
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-8">
                        {/* Home Team */}
                        <div className="text-right space-y-2">
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                                {match.homeTeamName}
                            </h2>
                        </div>

                        {/* Score */}
                        <div className="flex items-center gap-4">
                            <div className="text-center">
                                <div className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white">
                                    {match.homeScore ?? 0}
                                </div>
                            </div>
                            <div className="text-3xl text-slate-400">-</div>
                            <div className="text-center">
                                <div className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white">
                                    {match.awayScore ?? 0}
                                </div>
                            </div>
                        </div>

                        {/* Away Team */}
                        <div className="text-left space-y-2">
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                                {match.awayTeamName}
                            </h2>
                        </div>
                    </div>

                    {/* Match Details */}
                    <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                            <CalendarBlank className="w-4 h-4" />
                            <span>{new Date(match.matchDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{match.matchTime}</span>
                        </div>
                        {match.venue && (
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>{match.venue}</span>
                            </div>
                        )}
                        {match.code && (
                            <div className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700/30 text-xs font-mono">
                                {match.code}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <ShareButton
                    title={`${match.homeTeamName} vs ${match.awayTeamName}`}
                    text={`Follow the match ${match.homeTeamName} vs ${match.awayTeamName} on AthleticaOS!`}
                    url={window.location.href}
                />
            </div>

            {/* Stats */}
            {(match.homeStats || match.awayStats) && (
                <div className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                        Match Statistics
                    </h3>
                    <div className="space-y-3">
                        {[
                            { label: 'Tries', key: 'tries' as const },
                            { label: 'Conversions', key: 'conversions' as const },
                            { label: 'Penalties', key: 'penalties' as const },
                            { label: 'Yellow Cards', key: 'yellowCards' as const },
                            { label: 'Red Cards', key: 'redCards' as const },
                        ].map(({ label, key }) => {
                            const homeValue = match.homeStats?.[key] ?? 0;
                            const awayValue = match.awayStats?.[key] ?? 0;
                            const total = homeValue + awayValue;
                            const homePercent = total > 0 ? (homeValue / total) * 100 : 50;

                            return (
                                <div key={key} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {homeValue}
                                        </span>
                                        <span className="text-slate-600 dark:text-slate-400">{label}</span>
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {awayValue}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-600 transition-all"
                                            // eslint-disable-next-line
                                            style={{ width: `${homePercent}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Timeline */}
            <div className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                    Match Timeline
                </h3>

                {match.events && match.events.length > 0 ? (
                    <div className="space-y-3">
                        {match.events
                            .sort((a, b) => (b.minute ?? 0) - (a.minute ?? 0))
                            .map((event, index) => (
                                <div
                                    key={index}
                                    className="flex items-start gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/30"
                                >
                                    <div className="flex items-center gap-2 min-w-[60px]">
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                            {event.minute}'
                                        </span>
                                    </div>
                                    <div className="text-2xl">{getEventIcon(event.eventType)}</div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-slate-900 dark:text-white">
                                                {event.teamName}
                                            </span>
                                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                                {formatEventType(event.eventType)}
                                            </span>
                                        </div>
                                        {event.playerName && (
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                {event.playerName}
                                            </p>
                                        )}
                                    </div>
                                    {event.points !== undefined && event.points > 0 && (
                                        <div className="text-lg font-bold text-blue-600">
                                            +{event.points}
                                        </div>
                                    )}
                                </div>
                            ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                        No events recorded yet
                    </div>
                )}
            </div>
        </div>
    );
}
