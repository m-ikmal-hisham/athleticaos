import { Player } from '../types';

interface RosterListProps {
    players: Player[];
    onPlayerClick?: (playerId: string) => void;
    loading?: boolean;
}

export const RosterList = ({ players, onPlayerClick, loading }: RosterListProps) => {
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
                    <th>Jersey #</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                {players.map((player) => (
                    <tr
                        key={player.id}
                        onClick={() => onPlayerClick?.(String(player.id))}
                        style={{ cursor: onPlayerClick ? 'pointer' : 'default' }}
                    >
                        <td>{player.firstName} {player.lastName}</td>
                        <td>{(player as any).position || '—'}</td>
                        <td>{(player as any).jerseyNumber || '—'}</td>
                        <td>
                            <span className={`status-pill status-${player.status?.toLowerCase() || 'active'}`}>
                                {player.status || 'ACTIVE'}
                            </span>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};
