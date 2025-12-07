import { useState, useEffect } from 'react';
import { rosterService } from '@/services/rosterService';
import { PlayerSuspensionDTO } from '@/types/roster.types';
import { Card } from '@/components/Card';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

interface SuspensionWidgetProps {
    tournamentId: string;
}

export function SuspensionWidget({ tournamentId }: SuspensionWidgetProps) {
    const [suspensions, setSuspensions] = useState<PlayerSuspensionDTO[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSuspensions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tournamentId]);

    const loadSuspensions = async () => {
        try {
            setLoading(true);
            const data = await rosterService.getActiveSuspensions(tournamentId);
            setSuspensions(data);
        } catch (err) {
            console.error('Failed to load suspensions:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card>
                <div className="card-header-row">
                    <h3 className="text-lg font-semibold">Active Suspensions</h3>
                </div>
                <div className="p-4 text-center text-slate-500">Loading...</div>
            </Card>
        );
    }

    return (
        <Card>
            <div className="card-header-row">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-600" />
                    <h3 className="text-lg font-semibold">Active Suspensions</h3>
                </div>
                <span className="text-sm text-slate-500">{suspensions.length} active</span>
            </div>

            {suspensions.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                    <AlertTriangle className="w-12 h-12 mx-auto text-slate-400 mb-2" />
                    <p>No active suspensions</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {suspensions.map((suspension) => (
                        <div key={suspension.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <p className="font-medium text-slate-900 dark:text-white">
                                        {suspension.playerName}
                                    </p>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                        {suspension.reason}
                                    </p>
                                </div>
                                <div className="ml-4 text-right">
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium">
                                        {suspension.matchesRemaining} {suspension.matchesRemaining === 1 ? 'match' : 'matches'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}
