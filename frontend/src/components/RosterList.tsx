import { Player } from '../types';

interface RosterListProps {
    players: Player[];
    onPlayerClick?: (playerId: string) => void;
    loading?: boolean;
    showStats?: boolean;
}

export const RosterList = ({ players, onPlayerClick, loading, showStats }: RosterListProps) => {
    if (loading) {
        return <p className="text-muted-foreground">Loading roster...</p>;
    }

    if (players.length === 0) {
        return <p className="text-muted-foreground">No players assigned to this team</p>;
    }

    return (
        <table className="glass-table">
            <thead>
                <tr>
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
                    return (
                        <tr
                            key={`${id}-${index}`}
                            onClick={() => onPlayerClick?.(String(id))}
                            className={onPlayerClick ? 'cursor-pointer hover:bg-white/5 transition-colors' : ''}
                        >
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
