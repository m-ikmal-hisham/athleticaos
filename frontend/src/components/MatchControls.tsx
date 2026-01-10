import { Button } from '@/components/Button';
import { MatchItem } from '@/store/matches.store';
import { Play, Pause, StopCircle, XCircle, FastForward, Rewind } from '@phosphor-icons/react';

interface MatchControlsProps {
    match: MatchItem;
    isHalfTime: boolean;
    onStartMatch: () => void;
    onHalfTime: () => void;
    onResume: () => void;
    onFullTime: () => void;
    onCancelMatch: () => void;
    isAdmin: boolean;
    // Timer props
    // Timer props
    matchTimeSeconds: number; // Changed from matchTime (minutes) to seconds for MM:SS display
    isTimerRunning: boolean;
    onTimerStart: () => void;
    onTimerPause: () => void;
    onTimerAdjust: (adjustment: number) => void;
    onTimeUpdate: (newSeconds: number) => void; // Direct edit

    // Validation
    canStartMatch?: boolean;
    startMatchDisabledReason?: string;
}

export const MatchControls = ({
    match,
    isHalfTime,
    onStartMatch,
    onHalfTime,
    onResume,
    onFullTime,
    onCancelMatch,
    isAdmin,
    matchTimeSeconds,
    isTimerRunning,
    onTimerStart,
    onTimerPause,
    onTimerAdjust,
    onTimeUpdate,
    canStartMatch = true,
    startMatchDisabledReason
}: MatchControlsProps) => {
    if (!isAdmin) return null;

    const isScheduled = match.status === 'SCHEDULED';
    const isOngoing = match.status === 'ONGOING' && !isHalfTime;
    const isCompleted = match.status === 'COMPLETED';
    const isCancelled = match.status === 'CANCELLED';

    return (

        <div className="flex flex-col items-end gap-2 w-full max-w-[200px]">
            {/* Timer Controls First */}
            {(!isScheduled && !isCancelled && !isCompleted) && (
                <div className="flex items-center justify-between w-full bg-slate-100 dark:bg-white/5 rounded-lg p-2 border border-slate-200 dark:border-white/10 mb-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onTimerAdjust(-1)}
                        className="w-8 h-8 p-0 hover:bg-white dark:hover:bg-white/10 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        title="-1 Minute"
                    >
                        <Rewind className="w-4 h-4" />
                    </Button>

                    {/* Manual Time Input & Display */}
                    <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center bg-white/50 dark:bg-black/20 rounded px-2 py-1 border border-slate-200/50 dark:border-white/5">
                            <input
                                type="number"
                                min="0"
                                className="w-8 bg-transparent text-right font-mono font-bold text-lg text-slate-700 dark:text-white focus:outline-none focus:ring-0 appearance-none m-0 p-0 leading-none"
                                value={Math.floor(matchTimeSeconds / 60)}
                                onChange={(e) => {
                                    const newMin = parseInt(e.target.value) || 0;
                                    const currentSec = matchTimeSeconds % 60;
                                    onTimeUpdate((newMin * 60) + currentSec);
                                }}
                                title="Edit Minutes"
                            />
                            <span className="text-slate-400 font-mono font-bold text-lg mx-[1px]">:</span>
                            <div className="w-[2ch] font-mono font-bold text-lg text-slate-500 dark:text-slate-400 leading-none">
                                {(matchTimeSeconds % 60).toString().padStart(2, '0')}
                            </div>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onTimerAdjust(1)}
                        className="w-8 h-8 p-0 hover:bg-white dark:hover:bg-white/10 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        title="+1 Minute"
                    >
                        <FastForward className="w-4 h-4" />
                    </Button>
                </div>
            )}

            {/* Play/Pause Button - Centralized if timer is active */}
            {(!isScheduled && !isCancelled && !isCompleted) && (
                <Button
                    variant={isTimerRunning ? "outline" : "primary"}
                    size="sm"
                    onClick={isTimerRunning ? onTimerPause : onTimerStart}
                    className={`w-full justify-center mb-2 ${isTimerRunning ? "animate-pulse border-orange-500 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/10" : "bg-green-600 hover:bg-green-700 text-white"}`}
                >
                    {isTimerRunning ? <Pause className="w-4 h-4 mr-2" weight="fill" /> : <Play className="w-4 h-4 mr-2" weight="fill" />}
                    {isTimerRunning ? "Pause Timer" : "Resume Timer"}
                </Button>
            )}

            <div className="flex flex-col w-full gap-2">
                {/* Start Match */}
                {isScheduled && (
                    <div className="flex flex-col gap-1">
                        <Button
                            variant="primary"
                            size="sm"
                            disabled={canStartMatch === false}
                            onClick={onStartMatch}
                            className="w-full justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Play className="w-4 h-4" />
                            Start Match
                        </Button>
                        {startMatchDisabledReason && (
                            <div className="text-[10px] text-red-500 bg-red-50 dark:bg-red-900/10 p-1.5 rounded border border-red-100 dark:border-red-900/20 flex items-start gap-1">
                                <span className="font-bold">!</span> {startMatchDisabledReason}
                            </div>
                        )}
                    </div>
                )}

                {/* Half Time */}
                {isOngoing && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onHalfTime}
                        className="w-full justify-center gap-2"
                    >
                        <Pause className="w-4 h-4" />
                        Half Time
                    </Button>
                )}

                {/* Resume Match (from Half Time) */}
                {isHalfTime && (
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={onResume}
                        className="w-full justify-center gap-2"
                    >
                        <Play className="w-4 h-4" />
                        Resume Match
                    </Button>
                )}

                {/* Full Time */}
                {(isOngoing || isHalfTime) && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onFullTime}
                        className="w-full justify-center gap-2"
                    >
                        <StopCircle className="w-4 h-4" />
                        Full Time
                    </Button>
                )}

                {/* Cancel Match */}
                {!isCompleted && !isCancelled && (
                    <Button
                        variant="tertiary"
                        size="sm"
                        onClick={onCancelMatch}
                        className="w-full justify-center gap-2 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/10"
                    >
                        <XCircle className="w-4 h-4" />
                        Cancel Match
                    </Button>
                )}
            </div>
        </div>
    );
};
