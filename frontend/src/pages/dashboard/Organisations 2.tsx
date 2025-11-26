import { useEffect } from 'react';
import { Card } from '@/components/Card';
import { useOrganisationsStore } from '@/store/organisations.store';
import { Badge } from '@/components/Badge';

export const Organisations = () => {
    const { organisations, loading, fetchOrganisations } = useOrganisationsStore();

    useEffect(() => {
        fetchOrganisations();
    }, [fetchOrganisations]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-foreground">Organisations</h1>
                <p className="text-muted-foreground mt-1">Manage unions, states, and clubs</p>
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
                                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Category</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {organisations.map((org) => (
                                    <tr key={org.id} className="border-b border-white/5 hover:bg-black/5 dark:hover:bg-white/5">
                                        <td className="py-3 px-4 text-sm text-foreground font-medium">{org.name}</td>
                                        <td className="py-3 px-4">
                                            <Badge variant={org.category === 'Union' ? 'primary' : org.category === 'State' ? 'secondary' : 'default'}>
                                                {org.category}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4">
                                            <Badge variant={org.status === 'Active' ? 'default' : 'secondary'}>
                                                {org.status}
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
