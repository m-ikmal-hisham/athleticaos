import { useState, useMemo, useEffect, useRef } from 'react';
import { Football, Target, Lightning, ArrowsLeftRight, Notebook, ShieldWarning, Play, Pause, Rewind } from '@phosphor-icons/react';
import { GlassCard } from '@/components/GlassCard';
import { PublicMatchDetail } from '../../../api/public.api';

interface MatchMomentsProps {
    match: PublicMatchDetail;
}

export const MatchMoments = ({ match }: MatchMomentsProps) => {
    const [replayMode, setReplayMode] = useState(false);
    const [currentMinute, setCurrentMinute] = useState(80);
    const [isPlaying, setIsPlaying] = useState(false);
    const timerRef = useRef<number | null>(null);

    // Auto-play logic
    useEffect(() => {
        if (isPlaying) {
            timerRef.current = window.setInterval(() => {
                setCurrentMinute(prev => {
                    if (prev >= 80) {
                        setIsPlaying(false);
                        return 80;
                    }
                    return prev + 1;
                });
            }, 200); // Fast forward speed
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isPlaying]);

    // Reset minute when entering replay mode
    useEffect(() => {
        if (replayMode) {
            setCurrentMinute(0);
            setIsPlaying(true);
        } else {
            setCurrentMinute(80);
            setIsPlaying(false);
        }
    }, [replayMode]);

    const sortedEvents = useMemo(() => {
        if (!match.events) return [];
        // Sort descending usually, but for replay logic handling visual "stack", we might just want to filter
        // Standard view: Descending (newest first)
        // Replay view: Descending (newest first), but filtered by minute <= currentMinute
        return [...match.events]
            .filter(e => !replayMode || (e.minute || 0) <= currentMinute)
            .sort((a, b) => (b.minute ?? 0) - (a.minute ?? 0));
    }, [match.events, replayMode, currentMinute]);

    // Calculate score at current minute
    const currentScore = useMemo(() => {
        if (!replayMode) return { home: match.homeScore, away: match.awayScore };

        let home = 0;
        let away = 0;
        match.events?.forEach(e => {
            if ((e.minute || 0) <= currentMinute && e.points) {
                if (e.teamName === match.homeTeamName) home += e.points;
                else away += e.points;
            }
        });
        return { home, away };
    }, [match.events, currentMinute, replayMode, match.homeTeamName, match.homeScore, match.awayScore]);


    if (!match.events || match.events.length === 0) {
        return (
            <GlassCard className="p-8 text-center">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Match Moments</h3>
                <p className="text-slate-500 dark:text-slate-400">No events recorded yet.</p>
            </GlassCard>
        );
    }

    const getEventStyle = (type: string) => {
        switch (type) {
            case 'TRY':
                return {
                    icon: <Football className="w-5 h-5" weight="fill" />,
                    bg: 'bg-blue-50 dark:bg-blue-900/20',
                    border: 'border-blue-200 dark:border-blue-800',
                    text: 'text-blue-700 dark:text-blue-400',
                    size: 'large'
                };
            case 'CONVERSION':
                return {
                    icon: <Target className="w-4 h-4" weight="bold" />,
                    bg: 'bg-green-50 dark:bg-green-900/20',
                    border: 'border-green-200 dark:border-green-800',
                    text: 'text-green-700 dark:text-green-400',
                    size: 'medium'
                };
            case 'PENALTY':
                return {
                    icon: <Lightning className="w-4 h-4" weight="fill" />,
                    bg: 'bg-purple-50 dark:bg-purple-900/20',
                    border: 'border-purple-200 dark:border-purple-800',
                    text: 'text-purple-700 dark:text-purple-400',
                    size: 'medium'
                };
            case 'DROP_GOAL':
                return {
                    icon: <Target className="w-4 h-4" weight="duotone" />,
                    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
                    border: 'border-indigo-200 dark:border-indigo-800',
                    text: 'text-indigo-700 dark:text-indigo-400',
                    size: 'medium'
                };
            case 'YELLOW_CARD':
                return {
                    icon: <ShieldWarning className="w-4 h-4" weight="fill" />,
                    bg: 'bg-yellow-50 dark:bg-yellow-900/10',
                    border: 'border-yellow-200 dark:border-yellow-800',
                    text: 'text-yellow-700 dark:text-yellow-500',
                    size: 'small'
                };
            case 'RED_CARD':
                return {
                    icon: <ShieldWarning className="w-4 h-4" weight="fill" />,
                    bg: 'bg-red-50 dark:bg-red-900/10',
                    border: 'border-red-200 dark:border-red-800',
                    text: 'text-red-700 dark:text-red-500',
                    size: 'small'
                };
            case 'SUBSTITUTION':
                return {
                    icon: <ArrowsLeftRight className="w-4 h-4" />,
                    bg: 'bg-slate-50 dark:bg-slate-900/30',
                    border: 'border-slate-100 dark:border-slate-800',
                    text: 'text-slate-500 dark:text-slate-400',
                    size: 'muted'
                };
            default:
                return {
                    icon: <Notebook className="w-4 h-4" />,
                    bg: 'bg-slate-50 dark:bg-slate-900/30',
                    border: 'border-slate-100 dark:border-slate-800',
                    text: 'text-slate-600 dark:text-slate-400',
                    size: 'small'
                };
        }
    };

    return (
        <GlassCard className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Match Moments</h3>
                    {replayMode && (
                        <div className="text-xs font-bold text-blue-500 uppercase tracking-widest mt-1 animate-pulse">
                            Replay Mode • {currentMinute}'
                        </div>
                    )}
                </div>

                <button
                    onClick={() => setReplayMode(!replayMode)}
                    className={`
                        px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all
                        ${replayMode
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                            : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20'
                        }
                    `}
                >
                    {replayMode ? 'Exit Replay' : 'Watch Replay'}
                </button>
            </div>

            {/* Replay Controls - Only visible in Replay Mode */}
            {replayMode && (
                <div className="mb-8 p-4 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 space-y-4">
                    {/* Score Display (simulated) */}
                    <div className="flex justify-center items-center gap-8 text-2xl font-black text-slate-900 dark:text-white pb-4 border-b border-slate-200 dark:border-white/5">
                        <div className="text-center">
                            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{match.homeTeamName}</span>
                            {currentScore.home}
                        </div>
                        <div className="text-sm font-bold text-slate-400 bg-slate-200 dark:bg-white/10 px-2 py-1 rounded">
                            {currentMinute}'
                        </div>
                        <div className="text-center">
                            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{match.awayTeamName}</span>
                            {currentScore.away}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            aria-label={isPlaying ? 'Pause Replay' : 'Play Replay'}
                            title={isPlaying ? 'Pause Replay' : 'Play Replay'}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 transition"
                        >
                            {isPlaying ? <Pause weight="fill" /> : <Play weight="fill" />}
                        </button>

                        <button
                            onClick={() => {
                                setCurrentMinute(0);
                                setIsPlaying(false);
                            }}
                            aria-label="Restart Replay"
                            title="Restart Replay"
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-300 transition"
                        >
                            <Rewind weight="fill" />
                        </button>

                        <div className="flex-1">
                            <input
                                type="range"
                                min="0"
                                max="80"
                                value={currentMinute}
                                onChange={(e) => {
                                    setCurrentMinute(Number(e.target.value));
                                }}
                                aria-label="Replay Timeline"
                                title="Replay Timeline"
                                className="w-full accent-blue-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                                <span>Kick Off</span>
                                <span>Half Time</span>
                                <span>Full Time</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="relative space-y-0">
                {/* Vertical Timeline Line */}
                <div className="absolute top-4 bottom-4 left-[2.45rem] w-px bg-slate-200 dark:bg-slate-800 z-0" />

                {sortedEvents.length === 0 && replayMode && (
                    <div className="py-12 text-center text-slate-400 italic">
                        No moments yet at this point in the match...
                    </div>
                )}

                {sortedEvents.map((event, index) => {
                    const style = getEventStyle(event.eventType);
                    const isScore = event.points && event.points > 0;

                    return (
                        <div key={index} className="relative z-10 flex gap-4 group py-3 first:pt-0 last:pb-0 animate-fade-in-up">
                            {/* Time Badge */}
                            <div className="flex-shrink-0 w-20 flex flex-col items-center">
                                <div className={`
                                    w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shadow-sm border
                                    ${style.bg} ${style.border} ${style.text}
                                `}>
                                    {event.minute}'
                                </div>
                            </div>

                            {/* Content Card */}
                            <div className={`
                                flex-1 rounded-xl border p-4 transition-all hover:shadow-md
                                ${style.bg} ${style.border}
                                ${style.size === 'large' ? 'shadow-sm' : ''}
                                ${style.size === 'muted' ? 'opacity-80 hover:opacity-100' : ''}
                            `}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-bold ${style.size === 'large' ? 'text-lg' : 'text-base'} text-slate-900 dark:text-white`}>
                                                {event.teamName}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full border uppercase tracking-wider font-semibold ${style.text} border-current opacity-70`}>
                                                {event.eventType.replace(/_/g, ' ')}
                                            </span>
                                        </div>

                                        {event.playerName && (
                                            <div className="text-slate-600 dark:text-slate-300 font-medium">
                                                {event.playerName}
                                            </div>
                                        )}
                                    </div>

                                    {/* Score Delta */}
                                    {isScore && (
                                        <div className="flex-shrink-0 flex items-center gap-1 text-xl font-black text-slate-900 dark:text-white">
                                            <span>+{event.points}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </GlassCard>
    );
};

