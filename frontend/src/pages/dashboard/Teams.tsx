import { useEffect } from 'react';
import { Card } from '@/components/Card';
import { useTeamsStore } from '@/store/teams.store';
import { Badge } from '@/components/Badge';

export const Teams = () => {
    const { teams, loading, fetchTeams } = useTeamsStore();

    useEffect(() => {
        fetchTeams();
    }, [fetchTeams]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-foreground">Teams</h1>
                <p className="text-muted-foreground mt-1">Manage all rugby teams</p>
            </div>

            {/* Table Card */}
            <Card>
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Name</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Division</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">State</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teams.map((team) => (
                                    <tr key={team.id} className="border-b border-white/5 hover:bg-black/5 dark:hover:bg-white/5">
                                        <td className="py-3 px-4 text-sm text-foreground font-medium">{team.name}</td>
                                        <td className="py-3 px-4 text-sm text-foreground">{team.division}</td>
                                        <td className="py-3 px-4 text-sm text-foreground">{team.state}</td>
                                        <td className="py-3 px-4">
                                            <Badge variant={team.status === 'Active' ? 'default' : 'secondary'}>
                                                {team.status}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};
