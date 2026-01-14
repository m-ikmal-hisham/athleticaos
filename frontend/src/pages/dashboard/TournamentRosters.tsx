import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/Card';
import { RosterManagement } from '@/components/roster/RosterManagement';
import { tournamentService } from '@/services/tournamentService';
import { Team, TournamentCategory } from '@/types';
import { Users, WarningCircle, UserPlus } from '@phosphor-icons/react';
import { Button } from '@/components/Button';

interface TournamentRostersProps {
    tournamentId?: string;
}

export default function TournamentRosters({ tournamentId: propTournamentId }: TournamentRostersProps) {
    const params = useParams<{ tournamentId: string; id: string }>();
    const tournamentId = propTournamentId || params.tournamentId || params.id;
    const [teams, setTeams] = useState<Team[]>([]);
    const [categories, setCategories] = useState<TournamentCategory[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddPlayersModalOpen, setIsAddPlayersModalOpen] = useState(false);

    useEffect(() => {
        if (tournamentId) {
            loadData();
        }
    }, [tournamentId]);

    useEffect(() => {
        // If categories switch, select first team of that category?
        // Or if selectedTeam is not in new category, deselect?
        if (selectedCategoryId && selectedTeam) {
            // If team doesn't match category, deselect
            if (selectedTeam.tournamentCategoryId !== selectedCategoryId && selectedTeam.category !== 'Unassigned') {
                const firstInCat = teams.find(t => t.tournamentCategoryId === selectedCategoryId);
                setSelectedTeam(firstInCat || null);
            }
        }
    }, [selectedCategoryId, teams]);

    const loadData = async () => {
        if (!tournamentId) return;

        try {
            setLoading(true);
            const [teamsData, categoriesData] = await Promise.all([
                tournamentService.getTeams(tournamentId),
                tournamentService.getCategories(tournamentId)
            ]);

            setTeams(teamsData);
            setCategories(categoriesData);

            // Auto-select first category if exists?
            // User requested explicit lists. Let's default to All or first?
            // Format auto-selects. Here, filtering reduces clutter.
            if (categoriesData.length > 0) {
                setSelectedCategoryId(categoriesData[0].id);
            }

            // Set initial selected team (respected filtered if we set category)
            const initialCatId = categoriesData.length > 0 ? categoriesData[0].id : null;
            const validTeams = initialCatId
                ? teamsData.filter(t => t.tournamentCategoryId === initialCatId)
                : teamsData;

            if (validTeams.length > 0) {
                setSelectedTeam(validTeams[0]);
            } else if (teamsData.length > 0) {
                // Fallback if no specific category teams
                setSelectedTeam(teamsData[0]);
            }

        } catch (err) {
            console.error('Failed to load roster data:', err);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card>
                <div className="p-8 text-center text-slate-500">Loading teams...</div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <div className="p-8 text-center">
                    <WarningCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                    <p className="text-red-500">{error}</p>
                </div>
            </Card>
        );
    }

    if (teams.length === 0) {
        return (
            <Card>
                <div className="p-8 text-center">
                    <Users className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                    <p className="text-slate-500">No teams registered for this tournament</p>
                </div>
            </Card>
        );
    }

    const filteredTeams = selectedCategoryId
        ? teams.filter(t => t.tournamentCategoryId === selectedCategoryId)
        : teams;

    return (
        <div className="space-y-6 w-full max-w-full overflow-hidden">
            <Card>
                <div className="card-header-row mb-4">
                    <div>
                        <h2>Tournament Rosters</h2>
                        <p className="text-muted-foreground">Manage team rosters and player eligibility</p>
                    </div>
                    {selectedTeam && (
                        <Button onClick={() => setIsAddPlayersModalOpen(true)} className="flex items-center gap-2">
                            <UserPlus className="w-4 h-4" />
                            Add Players
                        </Button>
                    )}
                </div>

                {/* Category Filters */}
                {categories.length > 0 && (
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mb-4 w-fit">
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

                {/* Team Tabs (Filtered) */}
                {filteredTeams.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-lg">
                        No teams found for this category.
                    </div>
                ) : (
                    <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 mb-6 overflow-x-auto w-full max-w-full pb-1">
                        {filteredTeams.map((team) => (
                            <button
                                key={team.id}
                                onClick={() => setSelectedTeam(team)}
                                className={`px-4 py-2 font-medium text-sm transition-colors relative whitespace-nowrap ${selectedTeam?.id === team.id
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                {team.name}
                                {selectedTeam?.id === team.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* Roster Management */}
                {selectedTeam && tournamentId && (
                    <RosterManagement
                        tournamentId={tournamentId}
                        teamId={selectedTeam.id}
                        teamName={selectedTeam.name}
                        isModalOpen={isAddPlayersModalOpen}
                        onModalClose={() => setIsAddPlayersModalOpen(false)}
                    />
                )}
            </Card>
        </div>
    );
}
