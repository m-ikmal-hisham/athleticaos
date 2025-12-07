import { useState, useEffect } from 'react';
import { rosterService } from '@/services/rosterService';
import { TournamentPlayerDTO } from '@/types/roster.types';
import { Button } from '@/components/Button';
import { AlertCircle, CheckCircle, ShieldAlert, UserPlus, X } from 'lucide-react';
import { PlayerSelectionModal } from './PlayerSelectionModal';

interface RosterManagementProps {
    tournamentId: string;
    teamId: string;
    teamName: string;
}

export function RosterManagement({ tournamentId, teamId, teamName }: RosterManagementProps) {
    const [roster, setRoster] = useState<TournamentPlayerDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        loadRoster();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tournamentId, teamId]);

    const loadRoster = async () => {
        try {
            setLoading(true);
            const data = await rosterService.getRoster(tournamentId, teamId);
            setRoster(data);
            setError(null);
        } catch (err) {
            console.error('Failed to load roster:', err);
            setError('Failed to load roster data');
        } finally {
            setLoading(false);
        }
    };

    const handleAddPlayers = async (playerIds: string[]) => {
        try {
            await rosterService.addPlayersToRoster(tournamentId, teamId, playerIds);
            await loadRoster();
            setIsModalOpen(false);
        } catch (err) {
            console.error('Failed to add players:', err);
            // Ideally show a toast notification here
        }
    };

    const handleRemovePlayer = async (tournamentPlayerId: string) => {
        if (!confirm('Are you sure you want to remove this player from the roster?')) return;

        try {
            await rosterService.removePlayerFromRoster(tournamentId, tournamentPlayerId);
            await loadRoster();
        } catch (err) {
            console.error('Failed to remove player:', err);
        }
    };

    if (loading) return <div>Loading roster...</div>;
    if (error) return <div className="text-red-500">{error}</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Roster for {teamName}</h3>
                <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Add Players
                </Button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                            <th className="py-3 px-4">Player</th>
                            <th className="py-3 px-4">Number</th>
                            <th className="py-3 px-4">Eligibility</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {roster.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-500">
                                    No players in roster. Add players to get started.
                                </td>
                            </tr>
                        ) : (
                            roster.map((player) => (
                                <tr key={player.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="py-3 px-4 font-medium">{player.playerName}</td>
                                    <td className="py-3 px-4">{player.playerNumber || '-'}</td>
                                    <td className="py-3 px-4">
                                        {player.isEligible ? (
                                            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                                                <CheckCircle className="w-4 h-4" />
                                                Eligible
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 text-sm" title={player.eligibilityNote}>
                                                <AlertCircle className="w-4 h-4" />
                                                Ineligible
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4">
                                        {player.hasActiveSuspension ? (
                                            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 text-sm font-medium bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                                                <ShieldAlert className="w-4 h-4" />
                                                Suspended ({player.suspensionMatchesRemaining} matches)
                                            </span>
                                        ) : (
                                            <span className="text-slate-500 text-sm">Active</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <button
                                            onClick={() => handleRemovePlayer(player.id)}
                                            className="text-slate-400 hover:text-red-500 transition-colors"
                                            title="Remove from roster"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <PlayerSelectionModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onConfirm={handleAddPlayers}
                    teamId={teamId}
                    existingPlayerIds={roster.map(p => p.playerId)}
                />
            )}
        </div>
    );
}
