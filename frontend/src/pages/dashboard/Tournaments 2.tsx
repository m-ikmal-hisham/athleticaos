import { useEffect } from 'react';
import { Card } from '@/components/Card';
import { useTournamentsStore } from '@/store/tournaments.store';
import { Badge } from '@/components/Badge';

export const Tournaments = () => {
    const { tournaments, loading, fetchTournaments } = useTournamentsStore();

    useEffect(() => {
        fetchTournaments();
    }, [fetchTournaments]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-foreground">Tournaments</h1>
                <p className="text-muted-foreground mt-1">Manage all rugby tournaments</p>
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
                                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Start Date</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">End Date</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Location</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tournaments.map((tournament) => (
                                    <tr key={tournament.id} className="border-b border-white/5 hover:bg-black/5 dark:hover:bg-white/5">
                                        <td className="py-3 px-4 text-sm text-foreground font-medium">{tournament.name}</td>
                                        <td className="py-3 px-4 text-sm text-foreground">{tournament.startDate}</td>
                                        <td className="py-3 px-4 text-sm text-foreground">{tournament.endDate}</td>
                                        <td className="py-3 px-4 text-sm text-foreground">{tournament.location}</td>
                                        <td className="py-3 px-4">
                                            <Badge
                                                variant={
                                                    tournament.status === 'Upcoming' ? 'default' :
                                                        tournament.status === 'Ongoing' ? 'primary' :
                                                            'secondary'
                                                }
                                            >
                                                {tournament.status}
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
