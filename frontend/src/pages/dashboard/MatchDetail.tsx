
import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, Trash2, RotateCcw } from 'lucide-react';
import { useMatchesStore, MatchStatus, MatchEventItem } from '@/store/matches.store';
import { Button } from '@/components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/Table';
import { Input } from '@/components/Input';
import { useAuthStore } from '@/store/auth.store';
import { updateMatch, updateMatchStatus } from '@/api/matches.api';
import { Toast } from '@/components/Toast';
import { ConfirmModal } from '@/components/ConfirmModal';
import { MatchControls } from '@/components/MatchControls';
import { rosterService } from '@/services/rosterService';
import { LineupHintsDTO } from '@/types/roster.types';

// Rugby scoring rules
const SCORING_RULES: Record<string, number> = {
    'TRY': 5,
    'CONVERSION': 2,
    'PENALTY': 3,
    'DROP_GOAL': 3,
    'YELLOW_CARD': 0,
    'RED_CARD': 0,
    'SUBSTITUTION': 0,
};

// Helper to get status color
const getStatusColor = (status: MatchStatus, isHalfTime: boolean) => {
    if (status === 'ONGOING' && !isHalfTime) return 'success';
    if (isHalfTime) return 'info';
    switch (status) {
        case 'SCHEDULED': return 'primary';
        case 'COMPLETED': return 'secondary';
        case 'CANCELLED': return 'destructive';
        default: return 'secondary';
    }
};

// Helper to get status label
const getStatusLabel = (status: MatchStatus, isHalfTime: boolean) => {
    if (status === 'ONGOING' && isHalfTime) return 'HALF-TIME';
    if (status === 'ONGOING') return 'LIVE';
    return status;
};

// Helper for event icons
const getEventIcon = (type: string) => {
    switch (type) {
        case 'TRY': return '🏉';
        case 'CONVERSION': return '🎯';
        case 'PENALTY': return '⚡';
        case 'DROP_GOAL': return '🎯';
        case 'YELLOW_CARD': return '🟨';
        case 'RED_CARD': return '🔴';
        case 'SUBSTITUTION': return '🔄';
        default: return '📝';
    }
};

export const MatchDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {
        selectedMatch,
        events,
        players,
        loadingDetail,
        error,
        loadMatchDetail,
        addEvent,
        removeEvent,
        cancelMatch,
        loadPlayers
    } = useMatchesStore();
    const { user } = useAuthStore();

    // Local state
    const [newEvent, setNewEvent] = useState<Partial<MatchEventItem>>({
        eventType: 'TRY',
        minute: 0,
        teamId: '',
        playerId: '',
        notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });
    const [isHalfTime, setIsHalfTime] = useState<boolean>(false);
    const [lineupHints, setLineupHints] = useState<LineupHintsDTO | null>(null);

    const timelineRef = useRef<HTMLDivElement>(null);

    const isAdmin = user?.roles?.some(r => ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN'].includes(r));

    useEffect(() => {
        if (id) {
            loadMatchDetail(id);
            loadPlayers();
            loadLineupHints();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, loadMatchDetail, loadPlayers]);

    // Auto-scroll timeline to latest event
    useEffect(() => {
        if (timelineRef.current && events.length > 0) {
            const latestEventElement = timelineRef.current.querySelector('[data-latest="true"]');
            if (latestEventElement) {
                latestEventElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [events]);

    // Calculate live scores based on events
    const calculatedScores = useMemo(() => {
        if (!selectedMatch) return { homeScore: 0, awayScore: 0 };

        let homeScore = 0;
        let awayScore = 0;

        events.forEach(event => {
            const points = SCORING_RULES[event.eventType] || 0;
            if (event.teamId === selectedMatch.homeTeamId) {
                homeScore += points;
            } else if (event.teamId === selectedMatch.awayTeamId) {
                awayScore += points;
            }
        });

        return { homeScore, awayScore };
    }, [events, selectedMatch]);

    const loadLineupHints = async () => {
        if (!id) return;
        try {
            const hints = await rosterService.getLineupHints(id);
            setLineupHints(hints);
        } catch (err) {
            console.error('Failed to load lineup hints:', err);
        }
    };

    const getPlayerSuspensionInfo = (playerId: string, teamId: string) => {
        if (!lineupHints) return null;
        const teamPlayers = teamId === selectedMatch?.homeTeamId ? lineupHints.homeTeamPlayers : lineupHints.awayTeamPlayers;
        return teamPlayers.find(p => p.playerId === playerId);
    };

    if (loadingDetail) {
        return <div className="p-8 text-center">Loading match details...</div>;
    }

    if (error || !selectedMatch) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-500 mb-4">{error || "Match not found"}</p>
                <Button onClick={() => navigate('/dashboard/matches')}>Back to Matches</Button>
            </div>
        );
    }

    const handleAddEvent = async () => {
        if (!id || !newEvent.teamId || !newEvent.eventType) return;

        setIsSubmitting(true);
        try {
            const selectedPlayer = players.find(p => p.id === newEvent.playerId);

            await addEvent(id, {
                matchId: id,
                teamId: newEvent.teamId,
                teamName: newEvent.teamId === selectedMatch.homeTeamId ? selectedMatch.homeTeamName : selectedMatch.awayTeamName,
                playerId: newEvent.playerId || null,
                playerName: selectedPlayer ? `${selectedPlayer.firstName} ${selectedPlayer.lastName}` : null,
                eventType: newEvent.eventType as string,
                minute: Number(newEvent.minute),
                notes: newEvent.notes
            });

            // Reload match to get updated data
            await loadMatchDetail(id);

            // Reset form
            setNewEvent(prev => ({ ...prev, notes: '', playerId: '' }));

            // Show success toast
            setToast({ message: 'Event added successfully!', type: 'success' });
        } catch (error) {
            console.error('Failed to add event', error);
            setToast({ message: 'Failed to add event', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUndoLastEvent = () => {
        if (events.length === 0) return;

        const lastEvent = events[events.length - 1];
        setConfirmModal({
            isOpen: true,
            title: 'Undo Last Event',
            message: `Are you sure you want to undo the last event: ${lastEvent.eventType} by ${lastEvent.playerName || lastEvent.teamName}?`,
            onConfirm: async () => {
                try {
                    await removeEvent(lastEvent.id, selectedMatch.id);
                    await loadMatchDetail(selectedMatch.id);
                    setToast({ message: 'Event undone successfully', type: 'success' });
                } catch (error) {
                    console.error('Failed to undo event', error);
                    setToast({ message: 'Failed to undo event', type: 'error' });
                }
            }
        });
    };

    const handleStartMatch = async () => {
        setConfirmModal({
            isOpen: true,
            title: 'Start Match',
            message: 'Start this match? This will change the status to ONGOING.',
            onConfirm: async () => {
                try {
                    await updateMatchStatus(selectedMatch.id, 'ONGOING');
                    await loadMatchDetail(selectedMatch.id);
                    setIsHalfTime(false);
                    setToast({ message: 'Match started!', type: 'success' });
                } catch (error) {
                    console.error('Failed to start match', error);
                    setToast({ message: 'Failed to start match', type: 'error' });
                }
            }
        });
    };

    const handleHalfTime = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Half Time',
            message: 'Mark this match as half-time?',
            onConfirm: () => {
                setIsHalfTime(true);
                setToast({ message: 'Half-time break', type: 'info' });
            }
        });
    };

    const handleResume = () => {
        setIsHalfTime(false);
        setToast({ message: 'Match resumed', type: 'success' });
    };

    const handleFullTime = async () => {
        setConfirmModal({
            isOpen: true,
            title: 'Full Time',
            message: 'Complete this match? This will finalize the scores and lock event input.',
            onConfirm: async () => {
                try {
                    await updateMatch(selectedMatch.id, {
                        matchDate: selectedMatch.matchDate,
                        kickOffTime: selectedMatch.kickOffTime,
                        venue: selectedMatch.venue,
                        status: 'COMPLETED',
                        homeScore: calculatedScores.homeScore,
                        awayScore: calculatedScores.awayScore,
                        phase: selectedMatch.phase,
                        matchCode: selectedMatch.matchCode
                    });

                    await loadMatchDetail(selectedMatch.id);
                    setIsHalfTime(false);
                    setToast({ message: 'Match completed!', type: 'success' });
                } catch (error) {
                    console.error('Failed to complete match', error);
                    setToast({ message: 'Failed to complete match', type: 'error' });
                }
            }
        });
    };

    const handleCancelMatch = async () => {
        setConfirmModal({
            isOpen: true,
            title: 'Cancel Match',
            message: 'Are you sure you want to cancel this match? This action uses soft delete semantics.',
            onConfirm: async () => {
                try {
                    await cancelMatch(selectedMatch.id);
                    setToast({ message: 'Match cancelled', type: 'success' });
                    setTimeout(() => navigate('/dashboard/matches'), 1500);
                } catch (error) {
                    console.error('Failed to cancel match', error);
                    setToast({ message: 'Failed to cancel match', type: 'error' });
                }
            }
        });
    };

    // Timeline logic
    const timelineEvents = events.filter(e => e.minute !== null && e.minute !== undefined).sort((a, b) => (a.minute || 0) - (b.minute || 0));
    const noMinuteEvents = events.filter(e => e.minute === null || e.minute === undefined);

    // Filter players based on selected team
    const teamPlayers = players.filter(p => {
        if (!newEvent.teamId) return false;
        const teamOrgId = newEvent.teamId === selectedMatch.homeTeamId ? selectedMatch.homeTeamOrgId : selectedMatch.awayTeamOrgId;
        return p.organisationId === teamOrgId;
    });

    const isMatchLocked = selectedMatch.status === 'COMPLETED' || selectedMatch.status === 'CANCELLED';

    return (
        <div className="space-y-6">
            {/* Breadcrumb & Header */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Link to="/dashboard/matches" className="hover:text-primary">Matches</Link>
                <span>/</span>
                <span>{selectedMatch.tournamentName}</span>
                <span>/</span>
                <span className="text-foreground">{selectedMatch.matchCode || 'Match'}</span>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        {selectedMatch.homeTeamName} <span className="text-muted-foreground text-xl">vs</span> {selectedMatch.awayTeamName}
                    </h1>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(selectedMatch.matchDate).toLocaleDateString()}</div>
                        <div className="flex items-center gap-1"><Clock className="w-4 h-4" /> {selectedMatch.kickOffTime}</div>
                        <div className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {selectedMatch.venue || 'TBA'}</div>
                        {selectedMatch.phase && <Badge variant="outline">{selectedMatch.phase}</Badge>}
                    </div>
                </div>
                <div className="flex flex-col gap-3 items-end">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <Badge variant={getStatusColor(selectedMatch.status, isHalfTime) as any} className="text-base px-3 py-1">
                        {getStatusLabel(selectedMatch.status, isHalfTime)}
                    </Badge>
                    <MatchControls
                        match={selectedMatch}
                        isHalfTime={isHalfTime}
                        onStartMatch={handleStartMatch}
                        onHalfTime={handleHalfTime}
                        onResume={handleResume}
                        onFullTime={handleFullTime}
                        onCancelMatch={handleCancelMatch}
                        isAdmin={isAdmin!}
                    />
                </div>
            </div>

            {/* Score Bar */}
            <Card className="bg-glass-bg/50">
                <CardContent className="p-6 flex justify-between items-center">
                    <div className="text-2xl font-bold">{selectedMatch.homeTeamName}</div>
                    <div className="text-4xl font-mono font-bold text-primary">
                        {calculatedScores.homeScore} - {calculatedScores.awayScore}
                    </div>
                    <div className="text-2xl font-bold text-right">{selectedMatch.awayTeamName}</div>
                </CardContent>
            </Card>

            {/* Visual Timeline */}
            <Card>
                <CardHeader>
                    <CardTitle>Match Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                    <div ref={timelineRef} className="relative py-12 px-4 overflow-x-auto">
                        {/* Timeline Line */}
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2 min-w-[600px]" />

                        {/* Markers */}
                        <div className="absolute top-1/2 left-0 w-0.5 h-4 bg-border -translate-y-1/2" />
                        <div className="absolute top-1/2 left-1/2 w-0.5 h-4 bg-border -translate-y-1/2" />
                        <div className="absolute top-1/2 right-0 w-0.5 h-4 bg-border -translate-y-1/2" />

                        {/* Labels */}
                        <div className="absolute top-[60%] left-0 text-xs text-muted-foreground">0'</div>
                        <div className="absolute top-[60%] left-1/2 text-xs text-muted-foreground -translate-x-1/2 font-semibold">HT (40')</div>
                        <div className="absolute top-[60%] right-0 text-xs text-muted-foreground">80'+</div>

                        {/* Events */}
                        <div className="relative h-16 min-w-[600px]">
                            {timelineEvents.map((event, index) => {
                                const position = Math.min(Math.max(((event.minute || 0) / 80) * 100, 0), 100);
                                const isHomeTeam = event.teamId === selectedMatch.homeTeamId;
                                const isLatest = index === timelineEvents.length - 1;

                                return (
                                    <div
                                        key={event.id}
                                        data-latest={isLatest}
                                        className="absolute transform -translate-x-1/2 flex flex-col items-center group cursor-pointer"
                                        style={{ left: `${position}%`, top: isHomeTeam ? '-2rem' : '1rem' }}
                                    >
                                        <div className={`bg-background border-2 rounded-full p-1 shadow-sm text-lg z-10 hover:scale-110 transition-transform ${isHomeTeam ? 'border-blue-500' : 'border-red-500'}`}>
                                            {getEventIcon(event.eventType)}
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 absolute w-32 text-center text-xs bg-popover text-popover-foreground p-2 rounded shadow-lg z-20 transition-opacity pointer-events-none"
                                            style={{ top: isHomeTeam ? '-2.5rem' : '2.5rem' }}>
                                            <div className="font-bold">{event.minute}' {event.eventType}</div>
                                            <div>{event.playerName || event.teamName}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* No Minute Events */}
                    {noMinuteEvents.length > 0 && (
                        <div className="mt-6 border-t pt-4">
                            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Other Events</h4>
                            <div className="flex flex-wrap gap-2">
                                {noMinuteEvents.map(e => (
                                    <Badge key={e.id} variant="secondary" className="gap-1">
                                        {getEventIcon(e.eventType)} {e.eventType} - {e.teamName}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Event List & Management */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Event Log</CardTitle>
                            {isAdmin && events.length > 0 && !isMatchLocked && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleUndoLastEvent}
                                    className="gap-2 text-muted-foreground hover:text-foreground"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Undo Last
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16">Min</TableHead>
                                        <TableHead>Team</TableHead>
                                        <TableHead>Event</TableHead>
                                        <TableHead>Player</TableHead>
                                        <TableHead>Notes</TableHead>
                                        {isAdmin && !isMatchLocked && <TableHead className="w-12"></TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {events.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                No events recorded yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        events.map((event) => (
                                            <TableRow key={event.id}>
                                                <TableCell className="font-mono">{event.minute}'</TableCell>
                                                <TableCell>{event.teamName}</TableCell>
                                                <TableCell>
                                                    <span className="flex items-center gap-2">
                                                        {getEventIcon(event.eventType)} {event.eventType}
                                                        {SCORING_RULES[event.eventType] > 0 && (
                                                            <span className="text-xs text-primary font-semibold">+{SCORING_RULES[event.eventType]}</span>
                                                        )}
                                                    </span>
                                                </TableCell>
                                                <TableCell>{event.playerName || '-'}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{event.notes}</TableCell>
                                                {isAdmin && !isMatchLocked && (
                                                    <TableCell>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 text-destructive hover:text-destructive p-0" onClick={() => removeEvent(event.id, selectedMatch.id)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* Add Stats Form */}
                {isAdmin && !isMatchLocked && (
                    <div>
                        <Card>
                            <CardHeader>
                                <CardTitle>Add Stats</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Team</label>
                                    <select
                                        className="w-full p-2 rounded-md border border-input bg-background"
                                        value={newEvent.teamId}
                                        onChange={(e) => setNewEvent({ ...newEvent, teamId: e.target.value, playerId: '' })}
                                    >
                                        <option value="">Select Team</option>
                                        <option value={selectedMatch.homeTeamId}>{selectedMatch.homeTeamName}</option>
                                        <option value={selectedMatch.awayTeamId}>{selectedMatch.awayTeamName}</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Player (Optional)</label>
                                    <select
                                        className="w-full p-2 rounded-md border border-input bg-background"
                                        value={newEvent.playerId || ''}
                                        onChange={(e) => setNewEvent({ ...newEvent, playerId: e.target.value })}
                                        disabled={!newEvent.teamId}
                                    >
                                        <option value="">Select Player</option>
                                        {teamPlayers.map(p => {
                                            const suspensionInfo = getPlayerSuspensionInfo(p.id, newEvent.teamId!);
                                            const isSuspended = suspensionInfo?.isSuspended;
                                            const isIneligible = suspensionInfo && !suspensionInfo.isEligible;
                                            return (
                                                <option key={p.id} value={p.id}>
                                                    {p.firstName} {p.lastName}
                                                    {isSuspended ? ' 🔴 SUSPENDED' : ''}
                                                    {isIneligible ? ' ⚠️ INELIGIBLE' : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    {newEvent.playerId && (() => {
                                        const suspensionInfo = getPlayerSuspensionInfo(newEvent.playerId, newEvent.teamId!);
                                        if (suspensionInfo?.isSuspended) {
                                            return (
                                                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                                                    <p className="text-sm text-red-700 dark:text-red-300 font-medium flex items-center gap-2">
                                                        🔴 This player is currently suspended
                                                    </p>
                                                    {suspensionInfo.suspensionReason && (
                                                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                                            Reason: {suspensionInfo.suspensionReason} ({suspensionInfo.suspensionMatchesRemaining} matches remaining)
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        }
                                        if (suspensionInfo && !suspensionInfo.isEligible) {
                                            return (
                                                <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                                                    <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium flex items-center gap-2">
                                                        ⚠️ This player is ineligible
                                                    </p>
                                                    {suspensionInfo.eligibilityNote && (
                                                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                                            {suspensionInfo.eligibilityNote}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Event Type</label>
                                    <select
                                        className="w-full p-2 rounded-md border border-input bg-background"
                                        value={newEvent.eventType}
                                        onChange={(e) => setNewEvent({ ...newEvent, eventType: e.target.value })}
                                    >
                                        <option value="TRY">Try (5 pts)</option>
                                        <option value="CONVERSION">Conversion (2 pts)</option>
                                        <option value="PENALTY">Penalty Goal (3 pts)</option>
                                        <option value="DROP_GOAL">Drop Goal (3 pts)</option>
                                        <option value="YELLOW_CARD">Yellow Card</option>
                                        <option value="RED_CARD">Red Card</option>
                                        <option value="SUBSTITUTION">Substitution</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Minute</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={newEvent.minute ?? ''}
                                        onChange={(e) => setNewEvent({ ...newEvent, minute: parseInt(e.target.value) })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Notes</label>
                                    <Input
                                        placeholder="Details..."
                                        value={newEvent.notes || ''}
                                        onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                                    />
                                </div>

                                <Button
                                    className="w-full"
                                    onClick={handleAddEvent}
                                    disabled={!newEvent.teamId || isSubmitting}
                                >
                                    {isSubmitting ? 'Adding...' : 'Add Stats'}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
            />
        </div>
    );
};
