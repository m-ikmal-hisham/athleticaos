import { useState, useEffect } from 'react';
import { teamService } from '@/services/teamService';
import { TeamPlayer } from '@/types';
import { Button } from '@/components/Button';
import { X, Search, UserPlus } from 'lucide-react';

interface PlayerSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (playerIds: string[]) => void;
    teamId: string;
    existingPlayerIds: string[];
}

export function PlayerSelectionModal({
    isOpen,
    onClose,
    onConfirm,
    teamId,
    existingPlayerIds
}: PlayerSelectionModalProps) {
    const [players, setPlayers] = useState<TeamPlayer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            loadPlayers();
            setSelectedPlayerIds(new Set());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, teamId]);

    const loadPlayers = async () => {
        try {
            setLoading(true);
            const data = await teamService.getPlayers(teamId);
            setPlayers(data);
        } catch (err) {
            console.error('Failed to load team players:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleTogglePlayer = (playerId: string) => {
        const newSelected = new Set(selectedPlayerIds);
        if (newSelected.has(playerId)) {
            newSelected.delete(playerId);
        } else {
            newSelected.add(playerId);
        }
        setSelectedPlayerIds(newSelected);
    };

    const handleConfirm = () => {
        onConfirm(Array.from(selectedPlayerIds));
    };

    if (!isOpen) return null;

    const availablePlayers = players.filter(p => !existingPlayerIds.includes(p.playerId));
    const filteredPlayers = availablePlayers.filter(p =>
        p.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.jerseyNumber && p.jerseyNumber.toString().includes(searchQuery))
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-slate-200 dark:border-slate-800">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Add Players to Roster</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search players by name or number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {loading ? (
                        <div className="text-center py-8 text-slate-500">Loading players...</div>
                    ) : filteredPlayers.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            {searchQuery ? 'No players found matching search' : 'No available players to add'}
                        </div>
                    ) : (
                        filteredPlayers.map(player => (
                            <div
                                key={player.playerId}
                                onClick={() => handleTogglePlayer(player.playerId)}
                                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors border ${selectedPlayerIds.has(player.playerId)
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-medium">
                                        {player.jerseyNumber || '#'}
                                    </div>
                                    <div>
                                        <p className="font-medium">{player.firstName} {player.lastName}</p>
                                        <p className="text-xs text-slate-500">{player.position || 'No position'}</p>
                                    </div>
                                </div>
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedPlayerIds.has(player.playerId)
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'border-slate-300 dark:border-slate-600'
                                    }`}>
                                    {selectedPlayerIds.has(player.playerId) && <UserPlus className="w-3 h-3" />}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={selectedPlayerIds.size === 0}
                    >
                        Add {selectedPlayerIds.size} Players
                    </Button>
                </div>
            </div>
        </div>
    );
}
