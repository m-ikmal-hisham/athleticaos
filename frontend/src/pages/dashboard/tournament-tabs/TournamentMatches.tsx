import { useEffect, useState } from 'react';
import { Calendar, Plus, MapPin, Clock, Trash2 } from 'lucide-react';
import { matchService } from '@/services/matchService';
import { tournamentService } from '@/services/tournamentService';
import { Match, Team } from '@/types';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useNavigate } from 'react-router-dom';


interface TournamentMatchesProps {
    tournamentId: string;
}

export function TournamentMatches({ tournamentId }: TournamentMatchesProps) {
    const navigate = useNavigate();
    const [matches, setMatches] = useState<Match[]>([]);

    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Manual Create Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [teams, setTeams] = useState<Team[]>([]);
    const [newMatch, setNewMatch] = useState({
        homeTeamId: '',
        awayTeamId: '',
        matchDate: '',
        kickOffTime: '',
        venue: ''
    });

    useEffect(() => {
        loadMatches();
        loadTeams();
    }, [tournamentId, refreshTrigger]);

    const loadMatches = async () => {
        try {
            setLoading(true);
            const matchesData = await matchService.getByTournament(tournamentId);
            setMatches(matchesData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadTeams = async () => {
        try {
            const data = await tournamentService.getTeams(tournamentId);
            setTeams(data);
        } catch (error) {
            console.error('Failed to load teams:', error);
        }
    };

    const handleCreateMatch = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await tournamentService.createMatch(tournamentId, {
                ...newMatch,
                matchCode: `M${matches.length + 1}` // Simple auto-code
            });
            setShowCreateModal(false);
            setRefreshTrigger(prev => prev + 1);
            setNewMatch({
                homeTeamId: '',
                awayTeamId: '',
                matchDate: '',
                kickOffTime: '',
                venue: ''
            });
        } catch (error) {
            console.error('Failed to create match:', error);
            alert('Failed to create match');
        }
    };

    const handleClearSchedule = async () => {
        if (!confirm('Are you sure you want to clear all matches for this tournament? This cannot be undone.')) {
            return;
        }
        try {
            await tournamentService.clearSchedule(tournamentId);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Failed to clear schedule:', error);
            alert('Failed to clear schedule');
        }
    };

    // Group matches by stage
    const matchesByStage: { [key: string]: Match[] } = {};
    matches.forEach(match => {
        const stageName = match.stage?.name || 'Unassigned';
        if (!matchesByStage[stageName]) {
            matchesByStage[stageName] = [];
        }
        matchesByStage[stageName].push(match);
    });

    const sortedStageNames = Object.keys(matchesByStage).sort();



    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Matches ({matches.length})
                </h3>
                <div className="flex gap-2">
                    {matches.length > 0 && (
                        <Button variant="danger" size="sm" onClick={handleClearSchedule} className="flex items-center gap-2">
                            <Trash2 className="w-4 h-4" />
                            Clear Schedule
                        </Button>
                    )}
                    <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        New Match
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-8 text-slate-500">Loading matches...</div>
            ) : matches.length === 0 ? (
                <div className="col-span-full p-8 text-center text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    No matches scheduled yet. Generate a schedule or create matches manually.
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Standings Section */}


                    {sortedStageNames.map(stageName => (
                        <div key={stageName} className="space-y-4">
                            <h4 className="font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2">
                                {stageName}
                            </h4>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {matchesByStage[stageName].map(match => (
                                    <Card
                                        key={match.id}
                                        className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500"
                                        onClick={() => navigate(`/dashboard/matches/${match.matchCode || match.id}`)}
                                    >
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="text-xs text-slate-500 font-mono">{match.matchCode}</div>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium 
                                                    ${match.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' :
                                                        match.status === 'LIVE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' :
                                                            'bg-slate-100 text-slate-600 dark:bg-slate-800'}
                                                `}>
                                                    {match.status}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-4 mb-4">
                                            <div className="flex-1 text-right">
                                                <div className="font-semibold text-slate-900 dark:text-white truncate">
                                                    {match.homeTeam?.name || 'TBD'}
                                                </div>
                                            </div>
                                            <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded text-slate-900 dark:text-white font-mono font-bold">
                                                {match.status === 'SCHEDULED' ? 'vs' : `${match.homeScore ?? 0} - ${match.awayScore ?? 0}`}
                                            </div>
                                            <div className="flex-1 text-left">
                                                <div className="font-semibold text-slate-900 dark:text-white truncate">
                                                    {match.awayTeam?.name || 'TBD'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3 mt-3">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(match.matchDate).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {match.kickOffTime}
                                            </div>
                                            {match.venue && (
                                                <div className="flex items-center gap-1 ml-auto">
                                                    <MapPin className="w-3 h-3" />
                                                    {match.venue}
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Match Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-lg font-semibold">Create Manual Match</h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-slate-500 hover:text-slate-700"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleCreateMatch} className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Home Team</label>
                                    <select
                                        required
                                        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent p-2"
                                        value={newMatch.homeTeamId}
                                        onChange={e => setNewMatch({ ...newMatch, homeTeamId: e.target.value })}
                                    >
                                        <option value="">Select Team</option>
                                        {teams.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Away Team</label>
                                    <select
                                        required
                                        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent p-2"
                                        value={newMatch.awayTeamId}
                                        onChange={e => setNewMatch({ ...newMatch, awayTeamId: e.target.value })}
                                    >
                                        <option value="">Select Team</option>
                                        {teams.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Date</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent p-2"
                                        value={newMatch.matchDate}
                                        onChange={e => setNewMatch({ ...newMatch, matchDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Time</label>
                                    <input
                                        type="time"
                                        required
                                        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent p-2"
                                        value={newMatch.kickOffTime}
                                        onChange={e => setNewMatch({ ...newMatch, kickOffTime: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Venue</label>
                                <input
                                    type="text"
                                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent p-2"
                                    value={newMatch.venue}
                                    onChange={e => setNewMatch({ ...newMatch, venue: e.target.value })}
                                    placeholder="e.g. Field 1"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <Button type="button" variant="cancel" onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit">Create Match</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
