import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/Card';
import { RosterManagement } from '@/components/roster/RosterManagement';
import { tournamentService } from '@/services/tournamentService';
import { Team } from '@/types';
import { Users, WarningCircle, UserPlus } from '@phosphor-icons/react';
import { Button } from '@/components/Button';

interface TournamentRostersProps {
    tournamentId?: string;
}

export default function TournamentRosters({ tournamentId: propTournamentId }: TournamentRostersProps) {
    const params = useParams<{ tournamentId: string; id: string }>();
    const tournamentId = propTournamentId || params.tournamentId || params.id;
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddPlayersModalOpen, setIsAddPlayersModalOpen] = useState(false);

    useEffect(() => {
        if (tournamentId) {
            loadTeams();
        }
    }, [tournamentId]);

    const loadTeams = async () => {
        if (!tournamentId) return;

        try {
            setLoading(true);
            const data = await tournamentService.getTeams(tournamentId);
            setTeams(data);
            if (data.length > 0) {
                setSelectedTeam(data[0]);
            }
        } catch (err) {
            console.error('Failed to load teams:', err);
            setError('Failed to load tournament teams');
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

    return (
        <div className="space-y-6 w-full max-w-full overflow-hidden">
            <Card>
                <div className="card-header-row">
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

                {/* Team Tabs */}
                <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 mb-6 overflow-x-auto w-full max-w-full">
                    {teams.map((team) => (
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
