import { useState, useEffect } from 'react';
import { rosterService } from '@/services/rosterService';
import { PlayerSuspensionDTO } from '@/types/roster.types';
import { GlassCard } from '@/components/GlassCard';
import { ShieldWarning, Warning } from '@phosphor-icons/react';

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
            // Fetch all suspensions (history)
            const data = await rosterService.getActiveSuspensions(tournamentId, false);
            setSuspensions(data);
        } catch (err) {
            console.error('Failed to load suspensions:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <GlassCard>
                <div className="card-header-row">
                    <h3 className="text-lg font-semibold">Suspensions</h3>
                </div>
                <div className="p-4 text-center text-slate-500">Loading...</div>
            </GlassCard>
        );
    }

    return (
        <GlassCard>
            <div className="card-header-row">
                <div className="flex items-center gap-2">
                    <ShieldWarning className="w-5 h-5 text-red-600" />
                    <h3 className="text-lg font-semibold">Suspensions</h3>
                </div>
                <span className="text-sm text-slate-500">{suspensions.length} total</span>
            </div>

            {suspensions.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                    <Warning className="w-12 h-12 mx-auto text-slate-400 mb-2" />
                    <p>No suspensions recorded</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-[400px] overflow-y-auto">
                    {suspensions.map((suspension) => (
                        <div key={suspension.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-slate-900 dark:text-white">
                                            {suspension.playerName}
                                        </p>
                                        {!suspension.isActive && (
                                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                                                SERVED
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {suspension.teamName}
                                    </p>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                        {suspension.reason}
                                    </p>
                                </div>
                                <div className="ml-4 text-right">
                                    {suspension.isActive ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium">
                                            {suspension.matchesRemaining} left
                                        </span>
                                    ) : (
                                        <span className="text-xs text-slate-400">
                                            Cleared
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </GlassCard>
    );
}
