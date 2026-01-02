import { useState, useEffect } from 'react';
import { rosterService } from '@/services/rosterService';
import { TournamentPlayerDTO } from '@/types/roster.types';
import { WarningCircle, CheckCircle, ShieldWarning, X, Question } from '@phosphor-icons/react';
import { PlayerSelectionModal } from './PlayerSelectionModal';
import { Tooltip } from '@/components/ui/Tooltip';

interface RosterManagementProps {
    tournamentId: string;
    teamId: string;
    teamName: string;
    isModalOpen: boolean;
    onModalClose: () => void;
}

export function RosterManagement({ tournamentId, teamId, isModalOpen, onModalClose }: RosterManagementProps) {
    const [roster, setRoster] = useState<TournamentPlayerDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
            onModalClose();
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

            <div className="w-full max-w-full overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg max-h-[600px] overflow-y-auto custom-scrollbar relative">
                <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10 shadow-sm">
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                            <th className="py-3 px-4 whitespace-nowrap bg-slate-50 dark:bg-slate-800/50 w-[30%]">Player</th>
                            <th className="py-3 px-4 whitespace-nowrap bg-slate-50 dark:bg-slate-800/50 w-[15%]">Number</th>
                            <th className="py-3 px-4 whitespace-nowrap bg-slate-50 dark:bg-slate-800/50 w-[25%]">Eligibility</th>
                            <th className="py-3 px-4 whitespace-nowrap bg-slate-50 dark:bg-slate-800/50 w-[20%]">Status</th>
                            <th className="py-3 px-4 text-right whitespace-nowrap bg-slate-50 dark:bg-slate-800/50 w-[10%]">Actions</th>
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
                                            <div className="inline-flex items-center gap-2">
                                                <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 text-sm">
                                                    <WarningCircle className="w-4 h-4" />
                                                    Ineligible
                                                </span>
                                                {player.eligibilityNote && (
                                                    <Tooltip content={player.eligibilityNote} position="right">
                                                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-help">
                                                            <Question className="w-3 h-3" weight="bold" />
                                                        </span>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-3 px-4">
                                        {player.hasActiveSuspension ? (
                                            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 text-sm font-medium bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                                                <ShieldWarning className="w-4 h-4" />
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
                    onClose={onModalClose}
                    onConfirm={handleAddPlayers}
                    teamId={teamId}
                    existingPlayerIds={roster.map(p => p.playerId)}
                />
            )}
        </div>
    );
}
