import { useEffect, useState } from 'react';
import { Plus, Trash, MagnifyingGlass, Users } from '@phosphor-icons/react';
import { teamService } from '@/services/teamService';
import { tournamentService } from '@/services/tournamentService';
import { Team, TournamentCategory } from '@/types';
import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { getImageUrl } from '@/utils/image';
import { ConfirmModal } from '@/components/ConfirmModal';

interface TournamentTeamsProps {
    tournamentId: string;
}

export function TournamentTeams({ tournamentId }: TournamentTeamsProps) {
    const [teams, setTeams] = useState<Team[]>([]);
    const [categories, setCategories] = useState<TournamentCategory[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
    const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        variant: 'primary' as 'primary' | 'destructive',
        confirmText: 'Confirm'
    });

    const [selectedRegisteredTeamIds, setSelectedRegisteredTeamIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadData();
    }, [tournamentId, refreshTrigger]);

    // Reset selection when category changes
    useEffect(() => {
        setSelectedRegisteredTeamIds(new Set());
    }, [selectedCategoryId, teams]);

    const loadData = async () => {
        try {
            const [teamsData, categoriesData] = await Promise.all([
                tournamentService.getTeams(tournamentId),
                tournamentService.getCategories(tournamentId)
            ]);
            setTeams(teamsData);
            setCategories(categoriesData);
        } catch (error) {
            console.error('Failed to load tournament data:', error);
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

    const handleToggleRegisteredTeamSelection = (teamId: string) => {
        const newSelected = new Set(selectedRegisteredTeamIds);
        if (newSelected.has(teamId)) {
            newSelected.delete(teamId);
        } else {
            newSelected.add(teamId);
        }
        setSelectedRegisteredTeamIds(newSelected);
    };

    const handleSelectAllRegisteredTeams = () => {
        if (selectedRegisteredTeamIds.size === filteredTeams.length && filteredTeams.length > 0) {
            setSelectedRegisteredTeamIds(new Set());
        } else {
            setSelectedRegisteredTeamIds(new Set(filteredTeams.map(t => t.id)));
        }
    };

    const handleAddTeams = async () => {
        try {
            await tournamentService.addTeams(tournamentId, Array.from(selectedTeamIds), selectedCategoryId || undefined);
            setShowAddModal(false);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Failed to add teams:', error);
        }
    };

    const handleRemoveTeam = (teamId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Remove Team',
            message: 'Are you sure you want to remove this team from the tournament?',
            confirmText: 'Remove',
            variant: 'destructive',
            onConfirm: async () => {
                try {
                    await tournamentService.removeTeam(tournamentId, teamId);
                    setRefreshTrigger(prev => prev + 1);
                    setSelectedRegisteredTeamIds(prev => {
                        const next = new Set(prev);
                        next.delete(teamId);
                        return next;
                    });
                } catch (error) {
                    console.error('Failed to remove team:', error);
                }
            }
        });
    };

    const handleBulkRemove = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Remove Teams',
            message: `Are you sure you want to remove ${selectedRegisteredTeamIds.size} teams from the tournament?`,
            confirmText: 'Remove Selected',
            variant: 'destructive',
            onConfirm: async () => {
                try {
                    await tournamentService.removeTeams(tournamentId, Array.from(selectedRegisteredTeamIds));
                    setRefreshTrigger(prev => prev + 1);
                    setSelectedRegisteredTeamIds(new Set());
                } catch (error) {
                    console.error('Failed to remove teams:', error);
                }
            }
        });
    };

    const handleBulkAssignCategory = async (categoryId: string) => {
        try {
            await tournamentService.addTeams(tournamentId, Array.from(selectedRegisteredTeamIds), categoryId);
            setRefreshTrigger(prev => prev + 1);
            setSelectedRegisteredTeamIds(new Set());
        } catch (error) {
            console.error('Failed to assign category:', error);
        }
    };

    const filteredAvailableTeams = availableTeams.filter(team =>
        team.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredTeams = selectedCategoryId
        ? teams.filter(t => t.tournamentCategoryId === selectedCategoryId)
        : teams;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Participating Teams ({filteredTeams.length})
                </h3>
                <div className="flex gap-2 w-full md:w-auto items-center">
                    {/* Bulk Actions */}
                    {selectedRegisteredTeamIds.size > 0 && (
                        <div className="flex items-center gap-2 mr-2">
                            <select
                                onChange={(e) => handleBulkAssignCategory(e.target.value)}
                                className="text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md py-1.5 focus:ring-blue-500"
                                value=""
                                aria-label="Bulk assign category"
                                title="Move selected teams to category"
                            >
                                <option value="" disabled>Move to Category...</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={handleBulkRemove}
                            >
                                Remove ({selectedRegisteredTeamIds.size})
                            </Button>
                        </div>
                    )}

                    {/* Category Filter */}
                    {categories.length > 0 && (
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                            <button
                                onClick={() => setSelectedCategoryId(null)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${!selectedCategoryId
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                All
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategoryId(cat.id)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${selectedCategoryId === cat.id
                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    )}

                    <Button onClick={handleOpenAddModal} className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Add Teams
                    </Button>
                </div>
            </div>

            {/* Select All Bar */}
            {filteredTeams.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <input
                        type="checkbox"
                        checked={filteredTeams.length > 0 && selectedRegisteredTeamIds.size === filteredTeams.length}
                        onChange={handleSelectAllRegisteredTeams}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        aria-label="Select all teams"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                        Select All
                        {selectedCategoryId ? ' in Category' : ''}
                    </span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTeams.length === 0 ? (
                    <div className="col-span-full p-8 text-center text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        {teams.length === 0 ? 'No teams registered yet. Add teams to start.' : 'No teams in this category.'}
                    </div>
                ) : (
                    filteredTeams.map(team => (
                        <GlassCard key={team.id} className={`p-4 flex justify-between items-center group cursor-pointer transition-colors ${selectedRegisteredTeamIds.has(team.id) ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : ''
                            }`}
                            onClick={(e) => {
                                // Prevent toggle if clicking delete button
                                if ((e.target as HTMLElement).closest('button')) return;
                                handleToggleRegisteredTeamSelection(team.id);
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={selectedRegisteredTeamIds.has(team.id)}
                                    onChange={() => handleToggleRegisteredTeamSelection(team.id)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    onClick={(e) => e.stopPropagation()}
                                    aria-label={`Select team ${team.name}`}
                                />
                                {/* Team Logo */}
                                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                                    {team.logoUrl ? (
                                        <img src={getImageUrl(team.logoUrl)} alt={team.name} className="w-full h-full object-contain p-0.5" />
                                    ) : (
                                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                                            {team.name?.slice(0, 2)?.toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-medium text-slate-900 dark:text-white">{team.name}</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{team.organisationName}</p>
                                    {/* Show category name if displaying All */}
                                    {!selectedCategoryId && team.category && team.category !== 'Unassigned' && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 mt-1">
                                            {team.category}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveTeam(team.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                <Trash className="w-4 h-4" />
                            </Button>
                        </GlassCard>
                    ))
                )}
            </div>

            {/* Add Team Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Add Teams to Tournament</h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="text-slate-500 hover:text-slate-700"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                            <div className="relative">
                                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
                                            <p className="font-medium text-sm text-slate-900 dark:text-white">{team.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{team.organisationName}</p>
                                        </div>
                                        {selectedTeamIds.has(team.id) && (
                                            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                                <span className="text-white text-xs">✓</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {filteredAvailableTeams.length === 0 && (
                                    <div className="col-span-full text-center py-8 text-slate-500 dark:text-slate-400">
                                        No eligible teams found.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                            <Button variant="cancel" onClick={() => setShowAddModal(false)}>
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

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                variant={confirmModal.variant}
            />
        </div>
    );
}
