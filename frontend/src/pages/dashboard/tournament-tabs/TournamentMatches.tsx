import { useEffect, useState } from 'react';
import { CalendarBlank, Plus, Clock, Trash, PencilSimple, WarningCircle } from '@phosphor-icons/react';
import { matchService } from '@/services/matchService';
import { tournamentService } from '@/services/tournamentService';
import { Match, Team } from '@/types';
import { Button } from '@/components/Button';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface TournamentMatchesProps {
    tournamentId: string;
}

export function TournamentMatches({ tournamentId }: TournamentMatchesProps) {
    const navigate = useNavigate();
    const [matches, setMatches] = useState<Match[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Filtered matches
    const [scheduledMatches, setScheduledMatches] = useState<Match[]>([]);
    const [unscheduledMatches, setUnscheduledMatches] = useState<Match[]>([]);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editMatch, setEditMatch] = useState<Match | null>(null); // If set, shows Edit Modal
    const [clearScheduleStep, setClearScheduleStep] = useState<'NONE' | 'CONFIRM'>('NONE');

    // Create/Edit Form State
    const [matchForm, setMatchForm] = useState({
        homeTeamId: '',
        awayTeamId: '',
        matchDate: '',
        kickOffTime: '',
        venue: '',
        homeTeamPlaceholder: '',
        awayTeamPlaceholder: ''
    });

    useEffect(() => {
        loadData();
    }, [tournamentId, refreshTrigger]);

    useEffect(() => {
        // Split matches
        // Split matches
        const scheduled = matches.filter(m => m.matchDate && m.kickOffTime);
        const unscheduled = matches.filter(m => !m.matchDate || !m.kickOffTime);

        // Sort scheduled by Date then Time
        scheduled.sort((a, b) => {
            const dateA = new Date(`${a.matchDate}T${a.kickOffTime}`);
            const dateB = new Date(`${b.matchDate}T${b.kickOffTime}`);
            return dateA.getTime() - dateB.getTime();
        });

        setScheduledMatches(scheduled);
        setUnscheduledMatches(unscheduled);
    }, [matches]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [matchesData, teamsData] = await Promise.all([
                matchService.getByTournament(tournamentId),
                tournamentService.getTeams(tournamentId)
            ]);
            setMatches(matchesData);
            setTeams(teamsData);
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error('Failed to load matches');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveMatch = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editMatch) {
                // Update
                await matchService.update(editMatch.id, {
                    matchDate: matchForm.matchDate || undefined,
                    kickOffTime: matchForm.kickOffTime || undefined,
                    venue: matchForm.venue,
                    homeTeamId: (matchForm.homeTeamId || null) as any,
                    awayTeamId: (matchForm.awayTeamId || null) as any,
                    homeTeamPlaceholder: matchForm.homeTeamPlaceholder,
                    awayTeamPlaceholder: matchForm.awayTeamPlaceholder
                });
                toast.success('Match updated');
            } else {
                // Create
                await tournamentService.createMatch(tournamentId, {
                    ...matchForm,
                    matchCode: `M${matches.length + 1}`
                });
                toast.success('Match created');
            }
            closeModal();
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Failed to save match:', error);
            toast.error('Failed to save match');
        }
    };

    const handleDeleteMatch = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this match?')) return;
        try {
            await matchService.delete(id);
            toast.success('Match deleted');
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            toast.error('Failed to delete match');
        }
    };

    const handleClearSchedule = async (keepStructure: boolean) => {
        try {
            await tournamentService.clearSchedule(tournamentId, keepStructure);
            toast.success(keepStructure ? 'Matches cleared (Structure kept)' : 'Schedule fully reset');
            setClearScheduleStep('NONE');
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Failed to clear schedule:', error);
            toast.error('Failed to clear schedule');
        }
    };

    const openCreateModal = () => {
        setMatchForm({
            homeTeamId: '',
            awayTeamId: '',
            matchDate: '',
            kickOffTime: '',
            venue: '',
            homeTeamPlaceholder: '',
            awayTeamPlaceholder: ''
        });
        setEditMatch(null);
        setShowCreateModal(true);
    };

    const openEditModal = (match: Match, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditMatch(match);
        setMatchForm({
            homeTeamId: match.homeTeamId || '',
            awayTeamId: match.awayTeamId || '',
            matchDate: match.matchDate || '',
            kickOffTime: match.kickOffTime || '',
            venue: match.venue || '',
            homeTeamPlaceholder: match.homeTeamPlaceholder || '',
            awayTeamPlaceholder: match.awayTeamPlaceholder || ''
        });
        setShowCreateModal(true);
    };

    const closeModal = () => {
        setShowCreateModal(false);
        setEditMatch(null);
    };

    // Grouping Logic for Scheduled Matches (By Date)
    const matchesByDate: { [key: string]: Match[] } = {};
    scheduledMatches.forEach(match => {
        const dateKey = match.matchDate; // Assuming YYYY-MM-DD
        if (!matchesByDate[dateKey]) {
            matchesByDate[dateKey] = [];
        }
        matchesByDate[dateKey].push(match);
    });
    // Sort dates
    const sortedDates = Object.keys(matchesByDate).sort();

    // Grouping Logic for Unscheduled Matches (Sidebar)
    const unscheduledByStage: { [key: string]: Match[] } = {};
    unscheduledMatches.forEach(match => {
        const stageName = match.stage?.name || 'Unassigned';
        if (!unscheduledByStage[stageName]) unscheduledByStage[stageName] = [];
        unscheduledByStage[stageName].push(match);
    });
    const sortedUnscheduledStages = Object.keys(unscheduledByStage).sort();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CalendarBlank className="w-6 h-6 text-primary" />
                    Matches ({matches.length})
                </h3>
                <div className="flex gap-2">
                    {matches.length > 0 && (
                        <div className="relative">
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => setClearScheduleStep('CONFIRM')}
                                className="flex items-center gap-2"
                            >
                                <Trash className="w-4 h-4" />
                                Clear Schedule
                            </Button>

                            {/* Clear Confirmation Dropdown/Popover Mockup */}
                            {clearScheduleStep === 'CONFIRM' && (
                                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 p-4 z-50">
                                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Clear Schedule?</h4>
                                    <div className="space-y-2">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="w-full justify-start text-xs"
                                            onClick={() => handleClearSchedule(true)}
                                        >
                                            Clear Matches Only (Keep Groups)
                                        </Button>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            className="w-full justify-start text-xs"
                                            onClick={() => handleClearSchedule(false)}
                                        >
                                            Reset All (Format & Matches)
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full text-xs"
                                            onClick={() => setClearScheduleStep('NONE')}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <Button onClick={openCreateModal} className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        New Match
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-500 animate-pulse">Loading matches...</div>
            ) : matches.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                    <CalendarBlank className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">No matches scheduled</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Generate a schedule in the Format tab or create matches manually.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Main Schedule Area (3 cols) */}
                    <div className="lg:col-span-3 space-y-8">
                        {scheduledMatches.length === 0 && (
                            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                <p className="text-slate-500">No scheduled matches.</p>
                            </div>
                        )}
                        {sortedDates.map(date => (
                            <div key={date} className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white bg-white/50 dark:bg-slate-900/50 backdrop-blur px-4 py-1 rounded-full border border-slate-200/50 dark:border-slate-700/50">
                                        {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </h3>
                                    <div className="h-px flex-1 bg-gradient-to-r from-slate-200 dark:from-slate-800 to-transparent" />
                                </div>
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    {matchesByDate[date].map(match => (
                                        <MatchCard
                                            key={match.id}
                                            match={match}
                                            onClick={() => navigate(`/dashboard/matches/${match.matchCode || match.id}`)}
                                            onEdit={(e) => openEditModal(match, e)}
                                            onDelete={(e) => handleDeleteMatch(match.id, e)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Unscheduled Sidebar (1 col) */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800 sticky top-4">
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                                <WarningCircle className="w-4 h-4 text-amber-500" />
                                Unscheduled ({unscheduledMatches.length})
                            </h4>

                            {unscheduledMatches.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">All matches scheduled!</p>
                            ) : (
                                <div className="space-y-6">
                                    {sortedUnscheduledStages.map(stageName => (
                                        <div key={stageName} className="space-y-2">
                                            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stageName}</h5>
                                            <div className="space-y-2">
                                                {unscheduledByStage[stageName].map(match => (
                                                    <div
                                                        key={match.id}
                                                        className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:border-primary/50 transition-colors group cursor-pointer"
                                                        onClick={(e) => openEditModal(match, e)}
                                                    >
                                                        <div className="flex justify-between items-center text-sm font-medium text-slate-900 dark:text-slate-100">
                                                            <span>{match.homeTeam?.name || 'TBD'}</span>
                                                            <span className="text-xs text-slate-400">vs</span>
                                                            <span>{match.awayTeam?.name || 'TBD'}</span>
                                                        </div>
                                                        <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Clock className="w-3 h-3" />
                                                            Schedule Now
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                {editMatch ? 'Edit Match' : 'Create Manual Match'}
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" aria-label="Close">
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleSaveMatch} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Home Team</label>
                                    <select
                                        aria-label="Home Team"
                                        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-sm"
                                        value={matchForm.homeTeamId}
                                        onChange={e => setMatchForm({ ...matchForm, homeTeamId: e.target.value })}
                                    >
                                        <option value="">TBD (Placeholder)</option>
                                        {teams.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                    {matchForm.homeTeamId === '' && (
                                        <input
                                            type="text"
                                            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-sm mt-1"
                                            placeholder="Placeholder (e.g. Winner SF1)"
                                            value={matchForm.homeTeamPlaceholder}
                                            onChange={e => setMatchForm({ ...matchForm, homeTeamPlaceholder: e.target.value })}
                                        />
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Away Team</label>
                                    <select
                                        aria-label="Away Team"
                                        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-sm"
                                        value={matchForm.awayTeamId}
                                        onChange={e => setMatchForm({ ...matchForm, awayTeamId: e.target.value })}
                                    >
                                        <option value="">TBD (Placeholder)</option>
                                        {teams.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                    {matchForm.awayTeamId === '' && (
                                        <input
                                            type="text"
                                            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-sm mt-1"
                                            placeholder="Placeholder (e.g. Winner SF2)"
                                            value={matchForm.awayTeamPlaceholder}
                                            onChange={e => setMatchForm({ ...matchForm, awayTeamPlaceholder: e.target.value })}
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</label>
                                    <input
                                        aria-label="Match Date"
                                        type="date"
                                        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-sm"
                                        value={matchForm.matchDate}
                                        onChange={e => setMatchForm({ ...matchForm, matchDate: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Time</label>
                                    <input
                                        aria-label="Kick Off Time"
                                        type="time"
                                        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-sm"
                                        value={matchForm.kickOffTime}
                                        onChange={e => setMatchForm({ ...matchForm, kickOffTime: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Venue</label>
                                <input
                                    type="text"
                                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-sm"
                                    value={matchForm.venue}
                                    onChange={e => setMatchForm({ ...matchForm, venue: e.target.value })}
                                    placeholder="e.g. Field 1"
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <Button type="button" variant="cancel" onClick={closeModal}>Cancel</Button>
                                <Button type="submit">{editMatch ? 'Save Changes' : 'Create Match'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function MatchCard({ match, onClick, onEdit, onDelete }: { match: Match, onClick: () => void, onEdit: (e: any) => void, onDelete: (e: any) => void }) {
    return (
        <div
            className="group relative bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-5 transition-all hover:shadow-xl hover:-translate-y-1 block overflow-hidden cursor-pointer"
            onClick={onClick}
        >
            {/* Admin Controls */}
            <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={onEdit}
                    className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400"
                    title="Edit Match"
                >
                    <PencilSimple className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={onDelete}
                    className="p-1.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded text-red-500 dark:text-red-400"
                    title="Delete Match"
                >
                    <Trash className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Status Indicator */}
            {['LIVE', 'ONGOING'].includes(match.status) && (
                <div className="absolute top-0 right-0 px-3 py-1 bg-red-600 text-white text-[10px] font-bold uppercase rounded-bl-xl shadow-lg animate-pulse z-0">
                    Live
                </div>
            )}

            {/* Completed Indicator */}
            {['COMPLETED'].includes(match.status) && (
                <div className="absolute top-0 right-0 px-3 py-1 bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 text-[10px] font-bold uppercase rounded-bl-xl z-0">
                    Completed
                </div>
            )}


            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5" />
                    {match.kickOffTime}
                    {match.venue && <span className="text-slate-500 ml-1">• {match.venue}</span>}
                </div>
                {/* Match Code or Stage for context */}
                <div className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {match.matchCode && match.matchCode.length < 10 ? match.matchCode : match.stage?.name || 'Match'}
                </div>
            </div>

            {/* Score Block */}
            <div className="flex items-center justify-between gap-4">
                {/* Home */}
                <div className="flex-1 flex flex-col items-start gap-1 min-w-0">
                    <span className="font-bold text-slate-900 dark:text-white text-lg leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate w-full" title={match.homeTeam?.name}>
                        {match.homeTeam?.name || 'TBD'}
                    </span>
                    <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Home</span>
                </div>

                {/* Score */}
                <div className="flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 min-w-[3.5rem] py-2 rounded-lg font-mono font-black text-xl text-slate-800 dark:text-white shrink-0">
                    {(match.status !== 'SCHEDULED' && match.homeScore !== undefined && match.awayScore !== undefined) ? (
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
                <div className="flex-1 flex flex-col items-end gap-1 min-w-0 text-right">
                    <span className="font-bold text-slate-900 dark:text-white text-lg leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate w-full" title={match.awayTeam?.name}>
                        {match.awayTeam?.name || 'TBD'}
                    </span>
                    <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Away</span>
                </div>
            </div>
        </div>
    );
}
