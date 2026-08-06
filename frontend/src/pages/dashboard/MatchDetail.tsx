import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CalendarBlank, MapPin, Trash, ArrowCounterClockwise, Target, Lightning, ArrowsLeftRight, Notebook, Football, GameController, Pencil, ArrowUp, ArrowDown } from '@phosphor-icons/react';
import { useMatchesStore } from '@/store/matches.store';
import { MatchIntegrityConsole } from '@/components/admin/match/MatchIntegrityConsole';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/GlassCard';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/Table';
import { useAuthStore } from '@/store/auth.store';
import { updateMatch, updateMatchStatus, updateMatchEvent, recordUnplayedResult } from '@/api/matches.api';
import { getMatchOfficials, MatchOfficialDTO } from '@/api/officials.api';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { MatchControls } from '@/components/MatchControls';
import { showToast } from '@/lib/customToast';
import { MatchOfficialAssignments } from '@/components/admin/match/MatchOfficialAssignments';

// New Operations Components
import { PrimaryActionGrid } from '@/components/match/operations/PrimaryActionGrid';
import { SecondaryActionRow } from '@/components/match/operations/SecondaryActionRow';
import { PlayerPicker } from '@/components/match/operations/PlayerPicker';
import { MatchLineupEditor } from '@/components/MatchLineupEditor';
import { Users, PresentationChart, FilmStrip } from '@phosphor-icons/react';
import { MatchMoments } from '@/pages/public/match/MatchMoments';

// Rugby scoring rules
import { tournamentService } from '@/services/tournamentService';
import { matchLineupService } from '@/services/matchLineupService';
import { MatchLineupEntry, LineupRole, TournamentFormatConfig } from '@/types';
import { Breadcrumbs, BreadcrumbItem } from '@/components/Breadcrumbs';
import { getImageUrl } from '@/utils/image';
import { getPositionName, RugbyFormat } from '@/utils/rugbyPositions';

const SCORING_RULES: Record<string, number> = {
    'TRY': 5,
    'PENALTY_TRY': 7,
    'CONVERSION': 2,
    'PENALTY': 3,
    'DROP_GOAL': 3,
    'YELLOW_CARD': 0,
    'RED_CARD': 0,
    'SUBSTITUTION': 0,
    'INJURY': 0,
    'SCRUM': 0,
    'LINEOUT': 0,
};

// Helper for event icons
const getEventIcon = (type: string) => {
    switch (type) {
        case 'TRY': return <div className="p-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full"><Football className="w-5 h-5" weight="fill" /></div>;
        case 'CONVERSION': return <div className="p-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full"><Target className="w-4 h-4" weight="bold" /></div>;
        case 'PENALTY': return <div className="p-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full"><Lightning className="w-4 h-4" weight="fill" /></div>;
        case 'DROP_GOAL': return <div className="p-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full"><Target className="w-4 h-4" weight="duotone" /></div>;
        case 'YELLOW_CARD': return <div className="w-4 h-5 bg-yellow-400 border border-yellow-500 rounded-sm shadow-sm" />;
        case 'RED_CARD': return <div className="w-4 h-5 bg-red-600 border border-red-700 rounded-sm shadow-sm" />;
        case 'SUBSTITUTION': return <div className="p-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full"><ArrowsLeftRight className="w-4 h-4" /></div>;
        default: return <div className="p-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full"><Notebook className="w-4 h-4" /></div>;
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

    // NOTE: Removed unused states (isSubmitting, lineupHints, activeTab)

    const [walkoverModalOpen, setWalkoverModalOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => Promise<void> | void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const [formatConfig, setFormatConfig] = useState<TournamentFormatConfig | null>(null);

    useEffect(() => {
        if (selectedMatch?.tournamentId) {
            tournamentService.getFormatConfig(selectedMatch.tournamentId)
                .then(setFormatConfig)
                .catch(err => console.error("Failed to load format config", err));
        }
    }, [selectedMatch?.tournamentId]);

    // Timer State
    const [isHalfTime, setIsHalfTime] = useState<boolean>(false);
    // Track match time in SECONDS for smoother updates
    const [matchTimeSeconds, setMatchTimeSeconds] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    const [matchOfficials, setMatchOfficials] = useState<MatchOfficialDTO[]>([]);

    // Operations Interaction State
    const [interactionState, setInteractionState] = useState<'IDLE' | 'SELECT_TEAM' | 'SELECT_PLAYER'>('IDLE');
    const [activeTab, setActiveTab] = useState<'overview' | 'lineups' | 'moments'>('overview');
    const [lineupViewTeam, setLineupViewTeam] = useState<'home' | 'away'>('home');
    const [matchLineups, setMatchLineups] = useState<Record<string, MatchLineupEntry[]>>({ home: [], away: [] }); // Local cache of lineups
    const [draftAction, setDraftAction] = useState<{
        type: string; // 'TRY', 'PENALTY', etc.
        teamId?: string;
        teamName?: string;
        playerId?: string;
        sub_in_playerId?: string; // For substitutions
    } | null>(null);

    // Substitution State
    const [subStep, setSubStep] = useState<'OUT' | 'IN'>('OUT');

    // Event Editing State
    const [editingEvent, setEditingEvent] = useState<{ id: string; minute: number } | null>(null);

    // Detect format from match duration (heuristic)
    const detectFormat = (): RugbyFormat => {
        const duration = selectedMatch?.matchDuration || formatConfig?.matchDurationMinutes || 80;
        if (duration <= 16) return 'SEVENS';
        if (duration <= 30) return 'TENS';
        return 'XV';
    };

    const format = detectFormat();

    const findDashboardLineupEntry = (name: string | null | undefined, teamId: string | null | undefined) => {
        if (!matchLineups || !name || !teamId) return null;
        
        const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
        const targetName = normalize(name);
        
        const isHome = teamId === selectedMatch?.homeTeamId;
        const lineup = isHome ? matchLineups.home : matchLineups.away;
        
        // 1. Try exact match
        let found = lineup.find(p => normalize(p.playerName) === targetName);
        if (found) return found;

        // 2. Try partial match
        found = lineup.find(p => {
            const pName = normalize(p.playerName);
            return pName.includes(targetName) || targetName.includes(pName);
        });
        
        return found || null;
    };

    // Initial Load
    useEffect(() => {
        if (id) {
            loadMatchDetail(id);
            loadPlayers();
            loadOfficials(id);
        }
    }, [id]);

    const loadOfficials = async (matchId: string) => {
        try {
            const data = await getMatchOfficials(matchId);
            setMatchOfficials(data);
        } catch (e) {
            console.error("Failed to load officials", e);
        }
    };

    // Reacting to selectedMatch changes to load lineups once we know team IDs
    // Reacting to selectedMatch changes to load lineups once we know team IDs
    const fetchLineups = async () => {
        if (!selectedMatch?.id) return;
        try {
            const homeL = await matchLineupService.getLineup(selectedMatch.id, selectedMatch.homeTeamId);
            const awayL = await matchLineupService.getLineup(selectedMatch.id, selectedMatch.awayTeamId);

            const normalizeLineup = (lineup: MatchLineupEntry[]) => {
                const starters = lineup.filter(p => p.role === 'STARTER');
                const hasZeroIndex = starters.some(p => p.orderIndex === 0);
                if (hasZeroIndex) {
                    return lineup.map(p => p.role === 'STARTER' ? { ...p, orderIndex: p.orderIndex != null ? p.orderIndex + 1 : undefined } : p);
                }
                return lineup;
            };

            setMatchLineups({
                home: normalizeLineup(homeL),
                away: normalizeLineup(awayL)
            });
        } catch (e) {
            console.error("Failed to load lineups for picker context", e);
        }
    };

    useEffect(() => {
        if (selectedMatch?.id) {
            fetchLineups();
        }
    }, [selectedMatch?.id, selectedMatch?.homeTeamId, selectedMatch?.awayTeamId]);

    // Role Checks
    const assignedRole = useMemo(() => {
        if (!user || !matchOfficials.length) return null;
        const myAssignment = matchOfficials.find(mo => mo.officialName?.includes(user.firstName || ''));
        return myAssignment ? (myAssignment.officialRoleName || myAssignment.assignedRole) : null;
    }, [user, matchOfficials]);

    const canManageEvents = useMemo(() => {
        const isGlobalAdmin = user?.roles.some(r => ['ROLE_SUPER_ADMIN', 'ROLE_MATCH_MANAGER', 'SUPER_ADMIN', 'MATCH_MANAGER'].includes(r));
        if (isGlobalAdmin) return true;
        if (!assignedRole) return false;
        return ['REFEREE', 'MATCH_MANAGER'].includes(assignedRole);
    }, [user, assignedRole]);

    const isAdmin = canManageEvents;

    const isOneWayMatch = selectedMatch?.isOneWayMatch || formatConfig?.isOneWayMatch;

    // --- Robust Timer Logic ---
    // Using a ref to track the interval ID to ensure clear cleanup
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isTimerRunning) {
            timerIntervalRef.current = setInterval(() => {
                setMatchTimeSeconds(prev => prev + 1);
            }, 1000); // Update every second
        } else {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        }
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [isTimerRunning]);

    // Derived display time (Minutes)
    const displayMinute = Math.floor(matchTimeSeconds / 60);

    const handleTimerStart = () => setIsTimerRunning(true);
    const handleTimerPause = () => setIsTimerRunning(false);
    const handleTimerAdjust = (adjMinutes: number) => setMatchTimeSeconds(prev => Math.max(0, prev + (adjMinutes * 60)));


    // --- Interaction Handlers (Refactored from OperationsMatchView) ---

    const handleActionTrigger = (actionType: string) => {
        if (!selectedMatch) return;

        setDraftAction({ type: actionType });
        setInteractionState('SELECT_TEAM');

        if (actionType === 'SUBSTITUTION') {
            setSubStep('OUT');
        }
    };

    const handleTeamSelect = (teamId: string, teamName: string) => {
        if (!draftAction) return;

        const updatedDraft = { ...draftAction, teamId, teamName };
        setDraftAction(updatedDraft);

        // Team-only events skip player selection
        if (['SCRUM', 'LINEOUT'].includes(draftAction.type)) {
            submitEvent({ ...updatedDraft, playerId: null });
            setInteractionState('IDLE');
            setDraftAction(null);
            return;
        }

        setInteractionState('SELECT_PLAYER');
    };

    const handlePlayerSelect = async (playerId: string) => {
        if (!draftAction || !selectedMatch) return;

        // Handle Substitution Flow
        if (draftAction.type === 'SUBSTITUTION') {
            if (subStep === 'OUT') {
                // Selected player coming OFF
                setDraftAction(prev => ({ ...prev!, playerId: playerId })); // This is the OUT player (primary event player)
                setSubStep('IN');
                // Stay in SELECT_PLAYER state, but picker will re-render with "Select Incoming Player"
                return;
            } else {
                // Selected player coming IN
                const finalAction = { ...draftAction, sub_in_playerId: playerId };
                setInteractionState('IDLE');
                setDraftAction(null);
                setSubStep('OUT'); // Reset

                await submitEvent(finalAction);
                return;
            }
        }

        const finalAction = { ...draftAction, playerId };
        setInteractionState('IDLE');
        setDraftAction(null);

        await submitEvent(finalAction);
    };

    const handleSaveEventMinute = async () => {
        if (!editingEvent || !selectedMatch) return;

        try {
            await updateMatchEvent(editingEvent.id, { minute: editingEvent.minute });
            await loadMatchDetail(selectedMatch.id);
            showToast.success('Event updated');
        } catch (error) {
            console.error('Failed to update event:', error);
            showToast.error('Failed to update event');
        } finally {
            setEditingEvent(null);
        }
    };

    const submitEvent = async (action: any) => {
        try {
            // Find player details if available
            const selectedPlayer = players.find(p => p.id === action.playerId);

            // Construct custom notes for Subs
            let eventNotes = action.notes || '';
            let secondaryPlayerName = null;

            if (action.type === 'SUBSTITUTION' && action.sub_in_playerId) {
                const inPlayer = players.find(p => p.id === action.sub_in_playerId);
                secondaryPlayerName = inPlayer ? `${inPlayer.firstName} ${inPlayer.lastName}` : 'Unknown';
                eventNotes = `OUT: ${selectedPlayer ? `${selectedPlayer.firstName} ${selectedPlayer.lastName}` : 'Unknown'} | IN: ${secondaryPlayerName}`;
            }

            // Capture current red card count before adding event (for 2nd yellow detection)
            const redCardCountBefore = action.type === 'YELLOW_CARD'
                ? events.filter(e => e.eventType === 'RED_CARD' && e.playerId === action.playerId).length
                : 0;

            await addEvent(selectedMatch!.id, {
                matchId: selectedMatch!.id,
                teamId: action.teamId,
                teamName: action.teamName,
                playerId: action.playerId === 'unknown' ? null : action.playerId,
                playerName: selectedPlayer ? `${selectedPlayer.firstName} ${selectedPlayer.lastName}` : null,
                eventType: action.type,
                minute: displayMinute, // Use the live timer minute
                notes: eventNotes,
                relatedPlayerId: action.type === 'SUBSTITUTION' ? action.sub_in_playerId : null
            });

            // --- Handle Automatic Lineup Adjustment for Substitution ---
            if (action.type === 'SUBSTITUTION' && action.sub_in_playerId && action.teamId) {
                const isHome = action.teamId === selectedMatch!.homeTeamId;
                const currentLineup = isHome ? matchLineups.home : matchLineups.away;

                // We need to clone to avoid mutating state directly, though we'll fetch fresh anyway
                const updatedLineup = currentLineup.map(entry => {
                    // OUT player -> Go to BENCH
                    if (entry.playerId === action.playerId) {
                        return { ...entry, role: LineupRole.BENCH, isStarter: false };
                    }
                    // IN player -> Go to STARTER
                    if (entry.playerId === action.sub_in_playerId) {
                        return { ...entry, role: LineupRole.STARTER, isStarter: true };
                    }
                    return entry;
                });

                // Optimistically update or just wait for fetch? 
                // Let's send update to backend
                await matchLineupService.updateLineup(selectedMatch!.id, action.teamId, updatedLineup);

                // Refresh lineups to reflect changes in UI (e.g. picker)
                await fetchLineups();
            }

            await loadMatchDetail(selectedMatch!.id);

            // Check if a 2nd yellow triggered an automatic red card
            if (action.type === 'YELLOW_CARD') {
                const updatedEvents = useMatchesStore.getState().events;
                const redCardCountAfter = updatedEvents.filter(
                    e => e.eventType === 'RED_CARD' && e.playerId === action.playerId
                ).length;

                if (redCardCountAfter > redCardCountBefore) {
                    const playerName = selectedPlayer
                        ? `${selectedPlayer.firstName} ${selectedPlayer.lastName}`
                        : 'Player';
                    showToast.success(`2nd Yellow Card \u2192 Automatic Red Card for ${playerName}!`);
                    return;
                }
            }

            showToast.success(`${action.type} recorded!`);
        } catch (error) {
            console.error('Failed to add event', error);
            showToast.error('Failed to add event');
        }
    };

    const handleUndoLastEvent = () => {
        if (events.length === 0) return;
        const lastEvent = events[events.length - 1];

        // Optimistic UI could be added here, but for now simple confirm
        setConfirmModal({
            isOpen: true,
            title: 'Undo Last Action',
            message: `Remove ${lastEvent.eventType} (${lastEvent.minute}')?`,
            onConfirm: async () => {
                try {
                    await removeEvent(lastEvent.id, selectedMatch!.id);
                    await loadMatchDetail(selectedMatch!.id);
                    showToast.success('Undone');
                } catch (error) {
                    showToast.error('Failed to undo');
                }
            }
        });
    };

    // --- Standard Match Controls ---

    const handleStartMatch = async () => {
        setConfirmModal({
            isOpen: true,
            title: 'Start Match',
            message: 'Change status to ONGOING and start timer?',
            onConfirm: async () => {
                await updateMatchStatus(selectedMatch!.id, 'ONGOING');
                await loadMatchDetail(selectedMatch!.id);
                setIsHalfTime(false);
                setIsTimerRunning(true);
                showToast.success('Match Started');
            }
        });
    };

    const handleHalfTime = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Half Time',
            message: 'Pause timer and mark half time?',
            onConfirm: () => {
                setIsHalfTime(true);
                setIsTimerRunning(false);
                showToast.success('Half Time');
            }
        });
    };

    const handleResume = () => {
        setIsHalfTime(false);
        // Reset to second half start time (Half Duration)
        const duration = selectedMatch?.matchDuration || formatConfig?.matchDurationMinutes || 14;
        // Only reset if it makes sense (e.g. standard 2-half match)
        // If it's a one-way match, half-time shouldn't exist, but if it does, maybe don't jump time?
        // Assuming standard behavior for resumption:
        setMatchTimeSeconds((duration / 2) * 60);

        setIsTimerRunning(true);
        showToast.success('Resumed');
    };

    const handleFullTime = async () => {
        setConfirmModal({
            isOpen: true,
            title: 'Full Time',
            message: 'End match and finalize scores?',
            onConfirm: async () => {
                await updateMatch(selectedMatch!.id, {
                    status: 'COMPLETED',
                    homeScore: calculatedScores.homeScore,
                    awayScore: calculatedScores.awayScore,
                });
                await loadMatchDetail(selectedMatch!.id);
                setIsTimerRunning(false);
                showToast.success('Match Completed');
            }
        });
    };

    const handleCancelMatch = async () => {
        setConfirmModal({
            isOpen: true,
            title: 'Cancel Match',
            message: 'Are you sure?',
            onConfirm: async () => {
                await cancelMatch(selectedMatch!.id);
                showToast.success('Cancelled');
                navigate('/dashboard/matches');
            }
        });
    };

    // A walkover records the win without a scoreline — the match was never played, so
    // inventing a score would distort points for/against in the standings.
    const handleRecordWalkover = () => setWalkoverModalOpen(true);

    const submitWalkover = async (winnerTeamId: string) => {
        try {
            await recordUnplayedResult(selectedMatch!.id, 'WALKOVER', winnerTeamId);
            setWalkoverModalOpen(false);
            await loadMatchDetail(selectedMatch!.id);
            showToast.success('Walkover recorded');
        } catch (error: any) {
            showToast.error(error?.response?.data?.message || 'Failed to record walkover');
        }
    };


    // Calculations
    const isUnplayedResult = selectedMatch?.resultType === 'WALKOVER'
        || selectedMatch?.resultType === 'BYE';

    const calculatedScores = useMemo(() => {
        if (!selectedMatch) return { homeScore: 0, awayScore: 0 };

        // A walkover or bye was never played, so it has no scoring events to add up. Deriving
        // from events would render the awarded result as 0-0 and hide who actually won.
        if (selectedMatch.resultType === 'WALKOVER' || selectedMatch.resultType === 'BYE') {
            return {
                homeScore: selectedMatch.homeScore ?? 0,
                awayScore: selectedMatch.awayScore ?? 0,
            };
        }

        let homeScore = 0;
        let awayScore = 0;
        events.forEach(event => {
            const points = SCORING_RULES[event.eventType] || 0;
            if (event.teamId === selectedMatch.homeTeamId) homeScore += points;
            else if (event.teamId === selectedMatch.awayTeamId) awayScore += points;
        });
        return { homeScore, awayScore };
    }, [events, selectedMatch]);

    // Breadcrumbs Config
    const breadcrumbs = useMemo(() => {
        const items: BreadcrumbItem[] = [
            { label: 'Tournaments', path: '/dashboard/tournaments' }
        ];

        if (selectedMatch?.tournamentId) {
            items.push({
                label: selectedMatch.tournamentName || 'Tournament',
                path: `/dashboard/tournaments/${selectedMatch.tournamentId}?tab=matches`
            });
        }

        const numPrefix = selectedMatch?.matchNumber ? `Match ${selectedMatch.matchNumber}: ` : '';
        const matchLabel = selectedMatch?.homeTeamName && selectedMatch?.awayTeamName
            ? `${numPrefix}${selectedMatch.homeTeamName} vs ${selectedMatch.awayTeamName}`
            : (selectedMatch?.matchNumber ? `Match ${selectedMatch.matchNumber}` : (selectedMatch?.matchCode || 'Match'));

        items.push({ label: matchLabel });
        return items;
    }, [selectedMatch]);

    if (loadingDetail) return <div className="p-12 text-center text-slate-400">Loading Match Interface...</div>;
    if (error || !selectedMatch) return <div className="p-12 text-center text-red-400">Match not found.</div>;

    // Filters for Logic
    const isMatchLocked = selectedMatch.status === 'CANCELLED' || (selectedMatch.status === 'COMPLETED' && !isAdmin);

    const getPlayersForPicker = () => {
        if (!draftAction?.teamId || !selectedMatch) return { starters: [], bench: [], other: [] };

        const isHome = draftAction.teamId === selectedMatch.homeTeamId;
        const currentLineup = isHome ? matchLineups.home : matchLineups.away;

        // Helper to format
        const formatP = (l: any) => ({
            id: l.playerId,
            name: l.playerName,
            number: l.jerseyNumber || 0
        });

        if (currentLineup && currentLineup.length > 0) {
            const starters = currentLineup
                .filter(l => l.role === 'STARTER' || l.isStarter)
                .map(formatP)
                .sort((a, b) => (a.number || 999) - (b.number || 999));

            const bench = currentLineup
                .filter(l => l.role === 'BENCH')
                .map(formatP)
                .sort((a, b) => (a.number || 999) - (b.number || 999));

            return { starters, bench, other: [] };
        }

        // Fallback: All players in "Other" or classify if we can (but we can't if no lineup)
        const teamOrgId = isHome ? selectedMatch.homeTeamOrgId : selectedMatch.awayTeamOrgId;
        const all = players
            .filter(p => p.organisationId === teamOrgId)
            .map(p => ({
                id: p.id,
                name: `${p.firstName} ${p.lastName}`,
                number: 0
            }));

        return { starters: [], bench: [], other: all };
    };



    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-24">

            {/* Header & Controls */}
            <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between">
                <div>
                    <Breadcrumbs items={breadcrumbs} className="mb-2" />
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        {selectedMatch.homeTeamName} <span className="text-muted-foreground text-xl">vs</span> {selectedMatch.awayTeamName}
                    </h1>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1"><CalendarBlank className="w-4 h-4" /> {new Date(selectedMatch.matchDate).toLocaleDateString()}</div>
                        <div className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {selectedMatch.venue || 'TBA'}</div>
                    </div>
                </div>

                {/* Match Controls (Timer & Status) */}
                {/* Match Controls MOVED below scoreboard as requested */}
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 p-1 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/10 w-fit">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`
                        px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all
                        ${activeTab === 'overview'
                            ? 'bg-white dark:bg-white/10 text-primary-600 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                            : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
                        }
                    `}
                >
                    <PresentationChart className="w-4 h-4" />
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab('lineups')}
                    className={`
                        px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all
                        ${activeTab === 'lineups'
                            ? 'bg-white dark:bg-white/10 text-primary-600 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                            : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
                        }
                    `}
                >
                    <Users className="w-4 h-4" />
                    Lineups & Subs
                </button>
                <button
                    onClick={() => setActiveTab('moments')}
                    className={`
                        px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all
                        ${activeTab === 'moments'
                            ? 'bg-white dark:bg-white/10 text-primary-600 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                            : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
                        }
                    `}
                >
                    <FilmStrip className="w-4 h-4" />
                    Moments
                </button>
            </div>

            {/* Overview Content */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

                    {/* Left Column (Stats Entry & Score) - spans 8 */}
                    <div className="xl:col-span-8 space-y-6">

                        {/* Score Card */}
                        <GlassCard className="p-0 overflow-hidden">
                            <GlassCardContent className="p-8 flex justify-between items-center relative z-10">
                                {/* Background texture or gradient for flair */}
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 dark:from-blue-500/10 dark:to-purple-500/10 pointer-events-none" />

                                <div className="text-center relative z-10">
                                    <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">HOME</h3>
                                    {selectedMatch.homeTeamLogoUrl && (
                                        <img
                                            src={getImageUrl(selectedMatch.homeTeamLogoUrl)}
                                            alt={`${selectedMatch.homeTeamName} logo`}
                                            className="w-16 h-16 mx-auto mb-2 object-contain"
                                        />
                                    )}
                                    <div className="text-2xl md:text-3xl font-black text-blue-600 dark:text-blue-400 mb-0.5 leading-none">
                                        {selectedMatch.homeTeamShortName || selectedMatch.homeTeamName}
                                    </div>
                                    {selectedMatch.homeTeamShortName && (
                                        <div className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 max-w-[150px] md:max-w-[200px] truncate mx-auto leading-tight">
                                            {selectedMatch.homeTeamName || ''}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col items-center relative z-10">
                                    <div className="text-5xl md:text-7xl font-black font-mono tracking-tighter text-blue-600 dark:text-blue-400 flex items-center gap-4 md:gap-8 drop-shadow-sm">
                                        <span>{calculatedScores.homeScore}</span>
                                        <span className="text-slate-300 dark:text-slate-700 text-3xl md:text-5xl font-light">-</span>
                                        <span className="text-red-600 dark:text-red-400">{calculatedScores.awayScore}</span>
                                    </div>
                                    <div className="mt-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-xs font-medium text-slate-500 dark:text-slate-300 backdrop-blur-sm border border-slate-200 dark:border-white/10">
                                        {isHalfTime ? 'HALF TIME' : (selectedMatch.status === 'COMPLETED' ? 'FULL TIME' : (isTimerRunning ? 'LIVE' : selectedMatch.status))}
                                    </div>
                                    {/* Without this the awarded result is indistinguishable from a played one. */}
                                    {isUnplayedResult && (
                                        <div className="mt-2 px-3 py-1 rounded-full bg-amber-500/15 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                            {selectedMatch.resultType === 'BYE' ? 'Bye' : 'Walkover'}
                                            {selectedMatch.winnerTeamId && (
                                                <span className="font-medium normal-case tracking-normal">
                                                    {' — '}
                                                    {selectedMatch.winnerTeamId === selectedMatch.homeTeamId
                                                        ? selectedMatch.homeTeamName
                                                        : selectedMatch.awayTeamName}
                                                    {' wins'}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="text-center relative z-10">
                                    <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">AWAY</h3>
                                    {selectedMatch.awayTeamLogoUrl && (
                                        <img
                                            src={getImageUrl(selectedMatch.awayTeamLogoUrl)}
                                            alt={`${selectedMatch.awayTeamName} logo`}
                                            className="w-16 h-16 mx-auto mb-2 object-contain"
                                        />
                                    )}
                                    <div className="text-2xl md:text-3xl font-black text-red-600 dark:text-red-400 mb-0.5 leading-none">
                                        {selectedMatch.awayTeamShortName || selectedMatch.awayTeamName}
                                    </div>
                                    {selectedMatch.awayTeamShortName && (
                                        <div className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 max-w-[150px] md:max-w-[200px] truncate mx-auto leading-tight">
                                            {selectedMatch.awayTeamName}
                                        </div>
                                    )}
                                </div>
                            </GlassCardContent>
                        </GlassCard>

                        {/* Moved Match Controls Here */}
                        <div className="flex justify-center w-full">
                            <MatchControls
                                match={selectedMatch}
                                isHalfTime={isHalfTime}
                                onStartMatch={handleStartMatch}
                                onHalfTime={handleHalfTime}
                                onResume={handleResume}
                                onFullTime={handleFullTime}
                                onCancelMatch={handleCancelMatch}
                                onRecordWalkover={handleRecordWalkover}
                                isAdmin={isAdmin!}
                                matchTimeSeconds={matchTimeSeconds}
                                isTimerRunning={isTimerRunning}
                                onTimerStart={handleTimerStart}
                                onTimerPause={handleTimerPause}
                                onTimerAdjust={handleTimerAdjust}
                                onTimeUpdate={(newSeconds) => setMatchTimeSeconds(newSeconds)}
                                isOneWayMatch={!!isOneWayMatch}
                                canStartMatch={
                                    matchLineups.home.some(p => p.playerId && p.playerId.trim().length > 0) &&
                                    matchLineups.away.some(p => p.playerId && p.playerId.trim().length > 0)
                                }
                                startMatchDisabledReason={
                                    (!(matchLineups.home.some(p => p.playerId && p.playerId.trim().length > 0) && matchLineups.away.some(p => p.playerId && p.playerId.trim().length > 0)))
                                        ? "Lineups & Subs must be filled with registered players."
                                        : undefined
                                }
                            />
                        </div>

                        {/* Stats Entry Area (Admin Only) */}
                        {isAdmin && !isMatchLocked && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center justify-between px-1">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <GameController className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                        Live Action Recording
                                    </h3>
                                    {/* Undo Button embedded in header */}
                                    {events.length > 0 && (
                                        <button
                                            title="Undo Last Action"
                                            onClick={handleUndoLastEvent}
                                            className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-full transition-all shadow-sm hover:shadow"
                                            aria-label="Undo Last Action"
                                        >
                                            <ArrowCounterClockwise className="w-3.5 h-3.5" />
                                            <span>Undo Last</span>
                                        </button>
                                    )}
                                </div>

                                {/* Reusing Operations Components */}
                                <PrimaryActionGrid onAction={handleActionTrigger} />
                                <SecondaryActionRow onAction={handleActionTrigger} />
                            </div>
                        )}

                        {/* Event Log (Detailed) */}
                        <GlassCard className="overflow-hidden">
                            <GlassCardHeader className="border-b border-slate-100 dark:border-white/5 pb-4">
                                <GlassCardTitle>Match Events</GlassCardTitle>
                            </GlassCardHeader>
                            <GlassCardContent className="p-0">
                                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                    <Table>
                                        <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50 sticky top-0 z-10 backdrop-blur-sm">
                                            <TableRow className="border-slate-100 dark:border-white/5 hover:bg-transparent">
                                                <TableHead className="w-16 text-slate-500 dark:text-slate-400 font-semibold">Min</TableHead>
                                                <TableHead className="text-slate-500 dark:text-slate-400 font-semibold">Team</TableHead>
                                                <TableHead className="text-slate-500 dark:text-slate-400 font-semibold">Action</TableHead>
                                                <TableHead className="text-slate-500 dark:text-slate-400 font-semibold">Player</TableHead>
                                                <TableHead className="w-12"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {events.length === 0 ? (
                                                <TableRow className="hover:bg-transparent">
                                                    <TableCell colSpan={5} className="text-center py-12 text-slate-400 dark:text-slate-500">
                                                        No events recorded yet. Start the match and tap an action.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                [...events].reverse().map((event) => {
                                                    // Parse substitution notes if available
                                                    let subInName = '';
                                                    let subOutName = event.playerName;

                                                    if (event.eventType === 'SUBSTITUTION' && event.notes?.includes(' | IN: ')) {
                                                        const parts = event.notes.split(' | IN: ');
                                                        if (parts.length === 2) {
                                                            subInName = parts[1];
                                                            // Try to clean up "OUT: " prefix if present, though playerName is usually cleaner
                                                            // referring to event.playerName is safer for the primary player (OUT player)
                                                        }
                                                    }

                                                    return (
                                                        <TableRow key={event.id} className="border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                                                            <TableCell className="font-mono text-slate-600 dark:text-slate-300 font-bold">
                                                                {editingEvent?.id === event.id ? (
                                                                    <input
                                                                        type="number"
                                                                        aria-label="Edit match minute"
                                                                        className="w-12 px-1 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-center text-sm"
                                                                        value={editingEvent.minute}
                                                                        onChange={(e) => setEditingEvent({ ...editingEvent, minute: parseInt(e.target.value) || 0 })}
                                                                        onBlur={handleSaveEventMinute}
                                                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEventMinute()}
                                                                        autoFocus
                                                                    />
                                                                ) : (
                                                                    <span>{event.minute}'</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-slate-700 dark:text-slate-300 font-medium">{event.teamName}</TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-3">
                                                                    {getEventIcon(event.eventType)}
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-semibold text-slate-800 dark:text-white">{event.eventType}</span>
                                                                        {SCORING_RULES[event.eventType] > 0 && (
                                                                            <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-800 font-bold">
                                                                                +{SCORING_RULES[event.eventType]}
                                                                            </span>
                                                                        )}
                                                                        {event.eventType === 'RED_CARD' && event.notes?.includes('Automatic red card') && (
                                                                            <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 font-bold">
                                                                                2nd YC
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-slate-500 dark:text-slate-400">
                                                                {event.eventType === 'SUBSTITUTION' && subInName ? (
                                                                    (() => {
                                                                        const outEntry = findDashboardLineupEntry(subOutName, event.teamId);
                                                                        const inEntry = findDashboardLineupEntry(subInName, event.teamId);
                                                                        return (
                                                                            <div className="flex flex-col gap-1 text-xs">
                                                                                <div className="flex items-center gap-1.5 text-red-500 dark:text-red-400">
                                                                                    <ArrowDown className="w-3.5 h-3.5 flex-shrink-0" weight="bold" />
                                                                                    <span className="font-medium">{subOutName || 'Unknown'}</span>
                                                                                    {outEntry && (
                                                                                        <div className="flex items-center gap-1 text-[10px] font-normal">
                                                                                            <span className={`
                                                                                                inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[9px] font-bold
                                                                                                ${outEntry.jerseyNumber != null && outEntry.jerseyNumber > 0
                                                                                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                                                                                    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                                                                                }
                                                                                            `}>
                                                                                                #{outEntry.jerseyNumber != null && outEntry.jerseyNumber > 0 ? outEntry.jerseyNumber : '—'}
                                                                                            </span>
                                                                                            <span className="text-slate-400 dark:text-slate-500">
                                                                                                ({outEntry.positionDisplay || getPositionName(outEntry.orderIndex, format)})
                                                                                            </span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                                                                    <ArrowUp className="w-3.5 h-3.5 flex-shrink-0" weight="bold" />
                                                                                    <span className="font-medium">{subInName}</span>
                                                                                    {inEntry && (
                                                                                        <div className="flex items-center gap-1 text-[10px] font-normal">
                                                                                            <span className={`
                                                                                                inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[9px] font-bold
                                                                                                ${inEntry.jerseyNumber != null && inEntry.jerseyNumber > 0
                                                                                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                                                                                    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                                                                                }
                                                                                            `}>
                                                                                                #{inEntry.jerseyNumber != null && inEntry.jerseyNumber > 0 ? inEntry.jerseyNumber : '—'}
                                                                                            </span>
                                                                                            <span className="text-slate-400 dark:text-slate-500">
                                                                                                ({inEntry.positionDisplay || getPositionName(inEntry.orderIndex, format)})
                                                                                            </span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })()
                                                                ) : (
                                                                    event.playerName ? (
                                                                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium text-sm">
                                                                            <span>{event.playerName}</span>
                                                                            {(() => {
                                                                                const entry = findDashboardLineupEntry(event.playerName, event.teamId);
                                                                                if (!entry) return null;
                                                                                return (
                                                                                    <div className="flex items-center gap-1.5 text-[11px] font-normal">
                                                                                        <span className={`
                                                                                            inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold
                                                                                            ${entry.jerseyNumber != null && entry.jerseyNumber > 0
                                                                                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                                                                                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                                                                            }
                                                                                        `}>
                                                                                            #{entry.jerseyNumber != null && entry.jerseyNumber > 0 ? entry.jerseyNumber : '—'}
                                                                                        </span>
                                                                                        <span className="text-slate-400 dark:text-slate-500">
                                                                                            ({entry.positionDisplay || getPositionName(entry.orderIndex, format)})
                                                                                        </span>
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    ) : (
                                                                        <span>-</span>
                                                                    )
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                {isAdmin && !isMatchLocked && (
                                                                    <div className="flex items-center gap-1">
                                                                        <button
                                                                            title="Edit Minute"
                                                                            onClick={() => setEditingEvent({ id: event.id, minute: event.minute || 0 })}
                                                                            className="text-slate-400 hover:text-blue-500 dark:text-slate-500 dark:hover:text-blue-400 transition-colors p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                                        >
                                                                            <Pencil className="w-4 h-4" />
                                                                        </button>
                                                                        <button
                                                                            title="Delete Event"
                                                                            onClick={() => {
                                                                                setConfirmModal({
                                                                                    isOpen: true,
                                                                                    title: 'Delete Event',
                                                                                    message: 'Permanently delete this event?',
                                                                                    onConfirm: async () => {
                                                                                        await removeEvent(event.id, selectedMatch.id);
                                                                                        await loadMatchDetail(selectedMatch.id);
                                                                                        showToast.success('Deleted');
                                                                                    }
                                                                                })
                                                                            }}
                                                                            className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                                                                        >
                                                                            <Trash className="w-4 h-4" />
                                                                        </button>

                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </GlassCardContent>
                        </GlassCard>

                    </div>

                    {/* Right Column (Integrity & Context) - spans 4 */}
                    <div className="xl:col-span-4 space-y-6">

                        {/* Integrity Console - Now Wrapped in GlassCard */}
                        {isAdmin && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500 delay-100">
                                <GlassCard className="overflow-hidden bg-white/40 dark:bg-slate-900/40">
                                    <GlassCardHeader className="pb-2 border-b border-slate-100 dark:border-white/5">
                                        <div className="flex items-center justify-between">
                                            <GlassCardTitle className="text-sm uppercase tracking-wider text-slate-500 dark:text-slate-400">Integrity Audit</GlassCardTitle>
                                            <div className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-[10px] font-mono text-slate-500 border border-slate-200 dark:border-white/5">LIVE</div>
                                        </div>
                                    </GlassCardHeader>
                                    <GlassCardContent className="pt-4">
                                        <MatchIntegrityConsole
                                            events={events}
                                        />
                                    </GlassCardContent>
                                </GlassCard>
                            </div>
                        )}

                        {/* Momentum / Timeline Visual */}
                        <GlassCard variant="subtle">
                            <GlassCardHeader className="pb-2">
                                <GlassCardTitle className="text-sm uppercase tracking-wider text-slate-500 dark:text-slate-400">Momentum</GlassCardTitle>
                            </GlassCardHeader>
                            <GlassCardContent>
                                <div className="relative h-[300px] border-l-2 border-slate-200 dark:border-slate-700 ml-3 space-y-6 py-2">
                                    {/* Simple vertical timeline of scoring events */}
                                    {events.filter(e => SCORING_RULES[e.eventType] > 0).length === 0 && (
                                        <div className="text-sm text-slate-400 dark:text-slate-500 italic pl-6 pt-12">No scoring events yet.</div>
                                    )}
                                    {events.filter(e => SCORING_RULES[e.eventType] > 0).map(e => (
                                        <div key={e.id} className="relative pl-6 group">
                                            <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white dark:border-slate-900 ${e.teamId === selectedMatch.homeTeamId ? 'bg-blue-500 shadow-blue-500/50' : 'bg-red-500 shadow-red-500/50'} shadow-lg transition-transform group-hover:scale-125`} />
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono mb-0.5 uppercase tracking-wider">{e.minute} MIN</span>
                                                <span className="text-base font-bold text-slate-800 dark:text-white leading-none">{e.eventType}</span>
                                                <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">{e.teamName}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </GlassCardContent>
                        </GlassCard>

                        {/* Match Officials Component */}
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500 delay-200">
                            <MatchOfficialAssignments 
                                matchId={selectedMatch.id} 
                                isLocked={isMatchLocked && !isAdmin} 
                            />
                        </div>

                    </div>
                </div>
            )}

            {/* Lineups Content */}
            {activeTab === 'lineups' && selectedMatch && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* Team Switcher */}
                    <div className="flex justify-center">
                        <div className="bg-slate-100 dark:bg-white/5 p-1 rounded-lg inline-flex items-center border border-slate-200 dark:border-white/10">
                            <button
                                onClick={() => setLineupViewTeam('home')}
                                className={`
                                    px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all
                                    ${lineupViewTeam === 'home'
                                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                    }
                                `}
                            >
                                <span className={`w-2 h-2 rounded-full ${lineupViewTeam === 'home' ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                {selectedMatch.homeTeamName}
                                <span className="text-[10px] uppercase tracking-wider opacity-60 ml-1">HOME</span>
                            </button>
                            <button
                                onClick={() => setLineupViewTeam('away')}
                                className={`
                                    px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all
                                    ${lineupViewTeam === 'away'
                                        ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                    }
                                `}
                            >
                                <span className={`w-2 h-2 rounded-full ${lineupViewTeam === 'away' ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                {selectedMatch.awayTeamName}
                                <span className="text-[10px] uppercase tracking-wider opacity-60 ml-1">AWAY</span>
                            </button>
                        </div>
                    </div>

                    {/* Conditional Rendering based on Selection */}
                    <div className="min-h-[500px]">
                        {lineupViewTeam === 'home' ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-xl font-bold text-foreground">Home Squad</h2>
                                </div>
                                <MatchLineupEditor
                                    matchId={selectedMatch.id}
                                    teamId={selectedMatch.homeTeamId}
                                    homeTeamId={selectedMatch.homeTeamId}
                                    isLocked={!isAdmin}
                                    maxStarters={selectedMatch.startersCount || 15}
                                    maxBench={selectedMatch.maxBenchCount || 10}
                                    onLineupUpdate={fetchLineups}
                                />
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-xl font-bold text-foreground">Away Squad</h2>
                                </div>
                                <MatchLineupEditor
                                    matchId={selectedMatch.id}
                                    teamId={selectedMatch.awayTeamId}
                                    homeTeamId={selectedMatch.homeTeamId} // Always pass home team ID to identifying logic
                                    isLocked={!isAdmin}
                                    maxStarters={selectedMatch.startersCount || 15}
                                    maxBench={selectedMatch.maxBenchCount || 10}
                                    onLineupUpdate={fetchLineups}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Moments Tab */}
            {activeTab === 'moments' && (
                <div className="max-w-4xl mx-auto mt-6">
                    <MatchMoments match={{
                        ...selectedMatch,
                        homeTeamName: selectedMatch.homeTeamName || '',
                        awayTeamName: selectedMatch.awayTeamName || '',
                        stage: selectedMatch.stage?.name,
                        matchTime: "",
                        venue: selectedMatch.venue || undefined,
                        events: events.map(e => ({
                            id: e.id,
                            matchId: e.matchId,
                            teamId: e.teamId,
                            teamName: e.teamName,
                            playerId: e.playerId || undefined,
                            playerName: e.playerName || undefined,
                            eventType: e.eventType,
                            minute: e.minute === null ? undefined : e.minute,
                            notes: e.notes || undefined,
                            points: SCORING_RULES[e.eventType] || 0
                        })),
                        homeScore: calculatedScores.homeScore,
                        awayScore: calculatedScores.awayScore
                    }}
                        fullTimeMinutes={(() => {
                            if (formatConfig?.matchDurationMinutes) return formatConfig.matchDurationMinutes;

                            const starters = selectedMatch.startersCount || 15;
                            switch (starters) {
                                case 7: return 14; // Sevens (7 min halves)
                                case 10: return 20; // Tens (10 min halves)
                                case 15: return 80; // Union (40 min halves)
                                case 13: return 80; // League (40 min halves)
                                case 6: return 40; // Touch (20 min halves) - common international format
                                default: return 80;
                            }
                        })()}
                        isOneWay={formatConfig?.isOneWayMatch || false}
                    />
                </div>
            )}

            {/* Overlays */}

            {/* Team Selector Overlay */}
            {interactionState === 'SELECT_TEAM' && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm space-y-4">
                        <h2 className="text-2xl font-bold text-white text-center mb-8">Select Team</h2>

                        <button
                            onClick={() => handleTeamSelect(selectedMatch.homeTeamId, selectedMatch.homeTeamName || '')}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white p-6 rounded-2xl text-xl font-black uppercase tracking-wider shadow-lg flex justify-between items-center group transition-all hover:scale-[1.02]"
                        >
                            <span>{selectedMatch.homeTeamName}</span>
                            <span className="text-sm bg-black/20 px-2 py-1 rounded group-hover:bg-black/30">HOME</span>
                        </button>

                        <button
                            onClick={() => handleTeamSelect(selectedMatch.awayTeamId, selectedMatch.awayTeamName || '')}
                            className="w-full bg-red-600 hover:bg-red-500 text-white p-6 rounded-2xl text-xl font-black uppercase tracking-wider shadow-lg flex justify-between items-center group transition-all hover:scale-[1.02]"
                        >
                            <span>{selectedMatch.awayTeamName}</span>
                            <span className="text-sm bg-black/20 px-2 py-1 rounded group-hover:bg-black/30">AWAY</span>
                        </button>

                        <button
                            onClick={() => { setInteractionState('IDLE'); setDraftAction(null); }}
                            className="w-full mt-8 p-4 text-slate-400 font-bold hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Player Picker Overlay */}
            {interactionState === 'SELECT_PLAYER' && draftAction && (
                <PlayerPicker
                    teamName={draftAction.teamName || 'Team'}
                    players={getPlayersForPicker()}
                    onSelect={handlePlayerSelect}
                    onCancel={() => { setInteractionState('IDLE'); setDraftAction(null); setSubStep('OUT'); }}
                    isSubstitution={draftAction.type === 'SUBSTITUTION'}
                    subStep={subStep}
                />
            )}

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />

            {/* Walkover: pick the side that advances. No score is recorded. */}
            <Modal
                isOpen={walkoverModalOpen}
                onClose={() => setWalkoverModalOpen(false)}
                title="Record Walkover"
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Choose the team that advances. The match is awarded 28–0 to that side,
                        the World Rugby convention for a forfeit, and counts in the standings.
                    </p>
                    <div className="space-y-2">
                        <Button
                            variant="outline"
                            className="w-full justify-center"
                            onClick={() => submitWalkover(selectedMatch.homeTeamId!)}
                            disabled={!selectedMatch.homeTeamId}
                        >
                            {selectedMatch.homeTeamName || 'Home'} wins
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full justify-center"
                            onClick={() => submitWalkover(selectedMatch.awayTeamId!)}
                            disabled={!selectedMatch.awayTeamId}
                        >
                            {selectedMatch.awayTeamName || 'Away'} wins
                        </Button>
                    </div>
                    <div className="flex justify-end pt-2">
                        <Button variant="cancel" onClick={() => setWalkoverModalOpen(false)}>
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
