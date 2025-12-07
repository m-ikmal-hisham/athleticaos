import { useEffect, useState } from 'react';
import { Plus, Trash2, Search, Users } from 'lucide-react';
import { teamService } from '@/services/teamService';
import { tournamentService } from '@/services/tournamentService';
import { Team } from '@/types';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';

interface TournamentTeamsProps {
    tournamentId: string;
}

export function TournamentTeams({ tournamentId }: TournamentTeamsProps) {
    const [teams, setTeams] = useState<Team[]>([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
    const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadTeams();
    }, [tournamentId, refreshTrigger]);

    const loadTeams = async () => {
        try {
            const data = await tournamentService.getTeams(tournamentId);
            setTeams(data);
        } catch (error) {
            console.error('Failed to load tournament teams:', error);
        }
    };

    const handleOpenAddModal = async () => {
        try {
            const allTeams = await teamService.getAll();
            // Filter out already registered teams
            const registeredIds = new Set(teams.map(t => t.id));
            setAvailableTeams(allTeams.filter(t => !registeredIds.has(t.id)));
            setSelectedTeamIds(new Set());
            setShowAddModal(true);
        } catch (error) {
            console.error('Failed to load available teams:', error);
        }
    };

    const handleToggleTeamSelection = (teamId: string) => {
        const newSelected = new Set(selectedTeamIds);
        if (newSelected.has(teamId)) {
            newSelected.delete(teamId);
        } else {
            newSelected.add(teamId);
        }
        setSelectedTeamIds(newSelected);
    };

    const handleAddTeams = async () => {
        try {
            await tournamentService.addTeams(tournamentId, Array.from(selectedTeamIds));
            setShowAddModal(false);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Failed to add teams:', error);
        }
    };

    const handleRemoveTeam = async (teamId: string) => {
        if (!confirm('Are you sure you want to remove this team from the tournament?')) return;
        try {
            await tournamentService.removeTeam(tournamentId, teamId);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Failed to remove team:', error);
        }
    };

    const filteredAvailableTeams = availableTeams.filter(team =>
        team.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Participating Teams ({teams.length})
                </h3>
                <Button onClick={handleOpenAddModal} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Teams
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.length === 0 ? (
                    <div className="col-span-full p-8 text-center text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        No teams registered yet. Add teams to start.
                    </div>
                ) : (
                    teams.map(team => (
                        <Card key={team.id} className="p-4 flex justify-between items-center group">
                            <div>
                                <h4 className="font-medium text-slate-900 dark:text-white">{team.name}</h4>
                                <p className="text-sm text-slate-500">{team.organisationName}</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveTeam(team.id)}
                                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </Card>
                    ))
                )}
            </div>

            {/* Add Team Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-lg font-semibold">Add Teams to Tournament</h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="text-slate-500 hover:text-slate-700"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search teams..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-md focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {filteredAvailableTeams.map(team => (
                                    <div
                                        key={team.id}
                                        onClick={() => handleToggleTeamSelection(team.id)}
                                        className={`
                                            p-3 rounded-md border cursor-pointer transition-colors flex justify-between items-center
                                            ${selectedTeamIds.has(team.id)
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-blue-400'
                                            }
                                        `}
                                    >
                                        <div>
                                            <p className="font-medium text-sm">{team.name}</p>
                                            <p className="text-xs text-slate-500">{team.organisationName}</p>
                                        </div>
                                        {selectedTeamIds.has(team.id) && (
                                            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                                <span className="text-white text-xs">✓</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {filteredAvailableTeams.length === 0 && (
                                    <div className="col-span-full text-center py-8 text-slate-500">
                                        No eligible teams found.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleAddTeams}
                                disabled={selectedTeamIds.size === 0}
                            >
                                Add {selectedTeamIds.size} Teams
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
