import { Player } from '../types';

interface RosterListProps {
    players: Player[];
    onPlayerClick?: (playerId: string) => void;
    loading?: boolean;
    showStats?: boolean;
    showCheckboxes?: boolean;
    selectedIds?: string[];
    onSelectionChange?: (selectedIds: string[]) => void;
}

export const RosterList = ({
    players,
    onPlayerClick,
    loading,
    showStats,
    showCheckboxes = false,
    selectedIds = [],
    onSelectionChange
}: RosterListProps) => {
    if (loading) {
        return <p className="text-muted-foreground">Loading roster...</p>;
    }

    if (players.length === 0) {
        return <p className="text-muted-foreground">No players assigned to this team</p>;
    }

    const allPlayerIds = players.map(p => String(p.id || (p as any).playerId));
    const isAllSelected = players.length > 0 && allPlayerIds.every(id => selectedIds.includes(id));

    const handleSelectAllChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            onSelectionChange?.(allPlayerIds);
        } else {
            onSelectionChange?.([]);
        }
    };

    const handleRowSelectChange = (playerId: string, checked: boolean) => {
        if (checked) {
            onSelectionChange?.([...selectedIds, playerId]);
        } else {
            onSelectionChange?.(selectedIds.filter(id => id !== playerId));
        }
    };

    return (
        <table className="glass-table">
            <thead>
                <tr>
                    {showCheckboxes && (
                        <th className="w-10 text-center">
                            <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={handleSelectAllChange}
                                className="rounded border-border bg-background text-primary focus:ring-primary/30 cursor-pointer"
                            />
                        </th>
                    )}
                    <th>Name</th>
                    <th>Position</th>
                    {showStats ? (
                        <>
                            <th className="text-center font-bold">App</th>
                            <th className="text-center font-bold">Try</th>
                            <th className="text-center font-bold">Con</th>
                            <th className="text-center font-bold">Pen</th>
                            <th className="text-center font-bold">DG</th>
                            <th className="text-center font-bold">YC</th>
                            <th className="text-center font-bold">RC</th>
                        </>
                    ) : (
                        <>
                            <th>Jersey #</th>
                            <th>Status</th>
                        </>
                    )}
                </tr>
            </thead>
            <tbody>
                {players.map((player, index) => {
                    const id = player.id || (player as any).playerId;
                    const stringId = String(id);
                    const isSelected = selectedIds.includes(stringId);

                    return (
                        <tr
                            key={`${id}-${index}`}
                            onClick={() => onPlayerClick?.(stringId)}
                            className={onPlayerClick ? 'cursor-pointer hover:bg-white/5 transition-colors' : ''}
                        >
                            {showCheckboxes && (
                                <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => handleRowSelectChange(stringId, e.target.checked)}
                                        className="rounded border-border bg-background text-primary focus:ring-primary/30 cursor-pointer"
                                    />
                                </td>
                            )}
                            <td>{player.firstName} {player.lastName}</td>
                            <td>{(player as any).position || '—'}</td>
                            {showStats ? (
                                <>
                                    <td className="text-center">{(player as any).appearances ?? 0}</td>
                                    <td className="text-center">{(player as any).tries ?? 0}</td>
                                    <td className="text-center">{(player as any).conversions ?? 0}</td>
                                    <td className="text-center">{(player as any).penalties ?? 0}</td>
                                    <td className="text-center">{(player as any).dropGoals ?? 0}</td>
                                    <td className="text-center">
                                        {((player as any).yellowCards ?? 0) > 0 ? (
                                            <span className="inline-block px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-500 rounded font-bold border border-yellow-500/30">
                                                {(player as any).yellowCards}
                                            </span>
                                        ) : 0}
                                    </td>
                                    <td className="text-center">
                                        {((player as any).redCards ?? 0) > 0 ? (
                                            <span className="inline-block px-2 py-0.5 text-xs bg-red-500/20 text-red-500 rounded font-bold border border-red-500/30">
                                                {(player as any).redCards}
                                            </span>
                                        ) : 0}
                                    </td>
                                </>
                            ) : (
                                <>
                                    <td>{(player as any).jerseyNumber || '—'}</td>
                                    <td>
                                        <span className={`status-pill status-${player.status?.toLowerCase() || 'active'}`}>
                                            {player.status || 'ACTIVE'}
                                        </span>
                                    </td>
                                </>
                            )}
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};
