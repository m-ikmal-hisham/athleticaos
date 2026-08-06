import { useState, useEffect } from 'react';
import { rosterService } from '@/services/rosterService';
import { TournamentPlayerDTO } from '@/types/roster.types';
import { WarningCircle, CheckCircle, ShieldWarning, X, Question } from '@phosphor-icons/react';
import { PlayerSelectionModal } from './PlayerSelectionModal';
import { Tooltip } from '@/components/ui/Tooltip';
import { showToast } from '@/lib/customToast';

import { ConfirmModal } from '@/components/ConfirmModal';

interface RosterManagementProps {
    tournamentId: string;
    teamId: string;
    teamName: string;
    organisationLevel?: string;
    isModalOpen: boolean;
    onModalClose: () => void;
}

export function RosterManagement({ tournamentId, teamId, organisationLevel, isModalOpen, onModalClose }: RosterManagementProps) {
    const [roster, setRoster] = useState<TournamentPlayerDTO[]>([]);
    const [editingNumberFor, setEditingNumberFor] = useState<string | null>(null);
    const [numberDraft, setNumberDraft] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        variant: 'primary' as 'primary' | 'destructive',
        confirmText: 'Confirm'
    });

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

    const handleAddPlayers = async (playerIds: string[], jerseyNumbers?: Record<string, number>) => {
        try {
            await rosterService.addPlayersToRoster(tournamentId, teamId, playerIds, jerseyNumbers);
            await loadRoster();
            onModalClose();
        } catch (err) {
            console.error('Failed to add players:', err);
            // Ideally show a toast notification here
        }
    };

    const handleRemovePlayer = (tournamentPlayerId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Remove Player',
            message: 'Are you sure you want to remove this player from the roster?',
            confirmText: 'Remove',
            variant: 'destructive',
            onConfirm: async () => {
                try {
                    await rosterService.removePlayerFromRoster(tournamentId, tournamentPlayerId);
                    await loadRoster();
                } catch (err) {
                    console.error('Failed to remove player:', err);
                }
            }
        });
    };

    if (loading) return <div>Loading roster...</div>;
    if (error) return <div className="text-red-500">{error}</div>;

    // Squad numbers must be unique within a squad. The lineup editor already refuses
    // duplicates; without the same check here a clash is only discovered on match day.
    const duplicateNumbers = (() => {
        const seen = new Map<string, number>();
        roster.forEach(p => {
            if (p.playerNumber) seen.set(p.playerNumber, (seen.get(p.playerNumber) || 0) + 1);
        });
        return new Set([...seen.entries()].filter(([, count]) => count > 1).map(([n]) => n));
    })();

    const startEditingNumber = (player: TournamentPlayerDTO) => {
        setEditingNumberFor(player.playerId);
        setNumberDraft(player.playerNumber || '');
    };

    const saveNumber = async (player: TournamentPlayerDTO) => {
        const trimmed = numberDraft.trim();
        // Clearing the field drops back to the club number rather than storing a blank.
        const parsed = trimmed === '' ? null : parseInt(trimmed, 10);

        if (parsed !== null && (Number.isNaN(parsed) || parsed < 1)) {
            showToast.error('Jersey number must be a positive whole number.');
            return;
        }

        setEditingNumberFor(null);
        if (trimmed === (player.playerNumber || '')) return;

        try {
            await rosterService.updatePlayerNumber(tournamentId, teamId, player.playerId, parsed);
            await loadRoster();
            showToast.success(parsed === null
                ? `${player.playerName} now uses their club number`
                : `${player.playerName} set to #${parsed}`);
        } catch (err: any) {
            showToast.error(err?.response?.data?.message || 'Failed to update jersey number');
        }
    };

    return (
        <div className="space-y-6">

            <div className="w-full max-w-full overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg max-h-[600px] overflow-y-auto custom-scrollbar relative">
                <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10 shadow-sm">
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                            <th className="py-3 px-4 whitespace-nowrap bg-slate-50 dark:bg-slate-800/50 w-[25%]">Player</th>
                            <th className="py-3 px-4 whitespace-nowrap bg-slate-50 dark:bg-slate-800/50 w-[10%]">Number</th>
                            <th className="py-3 px-4 whitespace-nowrap bg-slate-50 dark:bg-slate-800/50 w-[15%]">Position</th>
                            <th className="py-3 px-4 whitespace-nowrap bg-slate-50 dark:bg-slate-800/50 w-[20%]">Eligibility</th>
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
                                    <td className="py-3 px-4">
                                        {editingNumberFor === player.playerId ? (
                                            <input
                                                type="number"
                                                min={1}
                                                autoFocus
                                                value={numberDraft}
                                                onChange={(e) => setNumberDraft(e.target.value)}
                                                onBlur={() => saveNumber(player)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveNumber(player);
                                                    if (e.key === 'Escape') setEditingNumberFor(null);
                                                }}
                                                className="w-16 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                                                placeholder="—"
                                            />
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => startEditingNumber(player)}
                                                className="inline-flex items-center gap-1.5 hover:underline"
                                                title="Click to set this player's number for this tournament"
                                            >
                                                <span className={player.playerNumber && duplicateNumbers.has(player.playerNumber)
                                                    ? 'text-red-600 dark:text-red-400 font-bold'
                                                    : ''}>
                                                    {player.playerNumber || '—'}
                                                </span>
                                                {/* Distinguishes a number chosen for this tournament from one inherited from the club. */}
                                                {player.tournamentJerseyNumber == null && player.playerNumber && (
                                                    <span className="text-[10px] uppercase tracking-wider text-slate-400">club</span>
                                                )}
                                                {player.playerNumber && duplicateNumbers.has(player.playerNumber) && (
                                                    <Tooltip content="Another player in this squad has the same number" position="right">
                                                        <WarningCircle className="w-4 h-4 text-red-500" />
                                                    </Tooltip>
                                                )}
                                            </button>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{player.position || '-'}</td>
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
                    organisationLevel={organisationLevel}
                    existingPlayerIds={roster.map(p => p.playerId)}
                />
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
