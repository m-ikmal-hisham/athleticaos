import { useEffect } from 'react';
import { Card } from '@/components/Card';
import { usePlayersStore } from '@/store/players.store';

export const Players = () => {
    const { players, loading, fetchPlayers } = usePlayersStore();

    useEffect(() => {
        fetchPlayers();
    }, [fetchPlayers]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-foreground">Players</h1>
                <p className="text-muted-foreground mt-1">Manage all registered players</p>
            </div>

            {/* Table Card */}
            <Card>
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    </div>
                ) : players.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">No players found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="glass-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Club</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {players.map((player: any) => {
                                    const fullName = [player.firstName || player.firstname, player.lastName || player.lastname]
                                        .filter(Boolean)
                                        .join(' ')
                                        .trim() || player.email;

                                    const isActive = player.status === 'Active' || player.isActive;

                                    return (
                                        <tr key={player.id}>
                                            <td className="font-medium">{fullName}</td>
                                            <td className="text-muted-foreground">{player.email || '—'}</td>
                                            <td>{player.role || player.roles?.[0]?.replace('ROLE_', '') || '—'}</td>
                                            <td>{player.club?.name || player.club || player.organisation?.name || '—'}</td>
                                            <td>
                                                <span className={`status-badge ${isActive ? 'active' : 'inactive'}`}>
                                                    {player.status || (player.isActive ? 'Active' : 'Inactive')}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};
