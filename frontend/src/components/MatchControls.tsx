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
    onTimeUpdate
}: MatchControlsProps) => {
    if (!isAdmin) return null;

    const isScheduled = match.status === 'SCHEDULED';
    const isOngoing = match.status === 'ONGOING' && !isHalfTime;
    const isCompleted = match.status === 'COMPLETED';
    const isCancelled = match.status === 'CANCELLED';

    return (
        <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap gap-2 justify-end">
                {/* Start Match */}
                {isScheduled && (
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={onStartMatch}
                        className="gap-2"
                    >
                        <Play className="w-4 h-4" />
                        Start Match
                    </Button>
                )}

                {/* Half Time */}
                {isOngoing && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onHalfTime}
                        className="gap-2"
                    >
                        <Pause className="w-4 h-4" />
                        Half Time
                    </Button>
                )}

                {/* Resume */}
                {isHalfTime && (
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={onResume}
                        className="gap-2"
                    >
                        <Play className="w-4 h-4" />
                        Resume
                    </Button>
                )}

                {/* Full Time */}
                {(isOngoing || isHalfTime) && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onFullTime}
                        className="gap-2"
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
                        className="gap-2"
                    >
                        <XCircle className="w-4 h-4" />
                        Cancel Match
                    </Button>
                )}
            </div>

            {/* Timer Controls */}
            {(!isScheduled && !isCancelled) && (
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 rounded-lg p-1 border border-slate-200 dark:border-white/10">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onTimerAdjust(-1)}
                        className="w-8 h-8 p-0 hover:bg-white dark:hover:bg-white/10 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        title="-1 Minute"
                    >
                        <Rewind className="w-4 h-4" />
                    </Button>

                    {isTimerRunning ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onTimerPause}
                            className="w-8 h-8 p-0 hover:bg-white dark:hover:bg-white/10 text-orange-500 animate-pulse"
                            title="Pause Timer"
                        >
                            <Pause className="w-4 h-4" weight="fill" />
                        </Button>
                    ) : (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onTimerStart}
                            className="w-8 h-8 p-0 hover:bg-white dark:hover:bg-white/10 text-green-500"
                            title="Start Timer"
                        >
                            <Play className="w-4 h-4" weight="fill" />
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onTimerAdjust(1)}
                        className="w-8 h-8 p-0 hover:bg-white dark:hover:bg-white/10 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        title="+1 Minute"
                    >
                        <FastForward className="w-4 h-4" />
                    </Button>

                    {/* Manual Time Input & Display */}
                    <div className="flex items-center px-3 py-1 bg-white/50 dark:bg-black/20 rounded ml-1 border border-slate-200/50 dark:border-white/5">
                        <input
                            type="number"
                            min="0"
                            className="w-12 bg-transparent text-right font-mono font-bold text-sm text-slate-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-0.5 appearance-none m-0 p-0 leading-none"
                            value={Math.floor(matchTimeSeconds / 60)}
                            onChange={(e) => {
                                const newMin = parseInt(e.target.value) || 0;
                                const currentSec = matchTimeSeconds % 60;
                                onTimeUpdate((newMin * 60) + currentSec);
                            }}
                            title="Edit Minutes"
                        />
                        <span className="text-slate-400 font-mono font-bold text-sm mx-[1px] transform -translate-y-[1px]">:</span>
                        <div className="w-[2ch] font-mono font-bold text-sm text-slate-500 dark:text-slate-400 leading-none">
                            {(matchTimeSeconds % 60).toString().padStart(2, '0')}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
