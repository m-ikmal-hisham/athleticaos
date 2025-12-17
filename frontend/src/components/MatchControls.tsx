import { Button } from '@/components/Button';
import { MatchItem } from '@/store/matches.store';
import { Play, Pause, StopCircle, XCircle } from 'lucide-react';

interface MatchControlsProps {
    match: MatchItem;
    isHalfTime: boolean;
    onStartMatch: () => void;
    onHalfTime: () => void;
    onResume: () => void;
    onFullTime: () => void;
    onCancelMatch: () => void;
    isAdmin: boolean;
}

export const MatchControls = ({
    match,
    isHalfTime,
    onStartMatch,
    onHalfTime,
    onResume,
    onFullTime,
    onCancelMatch,
    isAdmin
}: MatchControlsProps) => {
    if (!isAdmin) return null;

    const isScheduled = match.status === 'SCHEDULED';
    const isOngoing = match.status === 'ONGOING' && !isHalfTime;
    const isCompleted = match.status === 'COMPLETED';
    const isCancelled = match.status === 'CANCELLED';

    return (
        <div className="flex flex-wrap gap-2">
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
    );
};
