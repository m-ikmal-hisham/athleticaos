import { useState } from 'react';
import { Settings, Play, AlertTriangle } from 'lucide-react';
import { tournamentService } from '@/services/tournamentService';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';

interface TournamentFormatProps {
    tournamentId: string;
    onScheduleGenerated?: () => void;
}

export function TournamentFormat({ tournamentId, onScheduleGenerated }: TournamentFormatProps) {
    const [format, setFormat] = useState<'ROUND_ROBIN' | 'POOL_TO_KNOCKOUT' | 'KNOCKOUT'>('ROUND_ROBIN');
    const [numberOfPools, setNumberOfPools] = useState<number>(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!confirm('This will adhere to the selected format and generate matches. Existing unplayed auto-generated matches might be cleared. Continue?')) {
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setSuccessMessage(null);

            await tournamentService.generateSchedule(tournamentId, format, numberOfPools);

            setSuccessMessage('Schedule generated successfully!');
            if (onScheduleGenerated) {
                onScheduleGenerated();
            }
        } catch (err: any) {
            console.error('Failed to generate schedule:', err);
            setError(err.response?.data?.message || 'Failed to generate schedule');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Format Configuration</h3>
                        <p className="text-sm text-slate-500">Choose how the tournament is structured and generate fixtures.</p>
                    </div>
                </div>

                <div className="space-y-6 max-w-xl">
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Tournament Format
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div
                                onClick={() => setFormat('ROUND_ROBIN')}
                                className={`
                                    cursor-pointer p-4 rounded-lg border text-center transition-all
                                    ${format === 'ROUND_ROBIN'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-blue-400'
                                    }
                                `}
                            >
                                <div className="font-medium text-slate-900 dark:text-white">Round Robin</div>
                                <div className="text-xs text-slate-500 mt-1">League style</div>
                            </div>
                            <div
                                onClick={() => setFormat('POOL_TO_KNOCKOUT')}
                                className={`
                                    cursor-pointer p-4 rounded-lg border text-center transition-all
                                    ${format === 'POOL_TO_KNOCKOUT'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-blue-400'
                                    }
                                `}
                            >
                                <div className="font-medium text-slate-900 dark:text-white">Pools + KO</div>
                                <div className="text-xs text-slate-500 mt-1">Groups then Finals</div>
                            </div>
                            <div
                                onClick={() => setFormat('KNOCKOUT')}
                                className={`
                                    cursor-pointer p-4 rounded-lg border text-center transition-all
                                    ${format === 'KNOCKOUT'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-blue-400'
                                    }
                                `}
                            >
                                <div className="font-medium text-slate-900 dark:text-white">Knockout</div>
                                <div className="text-xs text-slate-500 mt-1">Bracket only</div>
                            </div>
                        </div>
                    </div>

                    {(format === 'ROUND_ROBIN' || format === 'POOL_TO_KNOCKOUT') && (
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Number of Pools
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="16"
                                value={numberOfPools}
                                onChange={(e) => setNumberOfPools(parseInt(e.target.value) || 1)}
                                className="w-full sm:w-32 px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-slate-500">
                                Teams will be distributed sequentially into these pools.
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2 text-sm">
                            <AlertTriangle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-sm">
                            {successMessage}
                        </div>
                    )}

                    <div className="pt-4">
                        <Button
                            onClick={handleGenerate}
                            disabled={loading}
                            className="w-full sm:w-auto flex items-center justify-center gap-2"
                        >
                            <Play className="w-4 h-4" />
                            {loading ? 'Generating...' : 'Generate Schedule'}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
