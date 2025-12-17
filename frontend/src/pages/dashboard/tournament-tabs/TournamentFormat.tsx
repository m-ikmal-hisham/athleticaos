import { useState, useEffect } from 'react';
import { Settings, Play, Save, Info } from 'lucide-react';
import { tournamentService } from '@/services/tournamentService';
import { Button } from '@/components/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Input } from '@/components/Input';
import { TournamentFormatConfig } from '@/types';
import toast from 'react-hot-toast';

interface TournamentFormatProps {
    tournamentId: string;
    onScheduleGenerated?: () => void;
}

export function TournamentFormat({ tournamentId, onScheduleGenerated }: TournamentFormatProps) {
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    // Generation Options State
    const [generateTimings, setGenerateTimings] = useState(true);
    const [useExistingGroups, setUseExistingGroups] = useState(false);

    const [config, setConfig] = useState<TournamentFormatConfig>({
        formatType: 'ROUND_ROBIN',
        rugbyFormat: 'XV',
        teamCount: 0,
        poolCount: 1,
        matchDurationMinutes: 80,
        pointsWin: 4,
        pointsDraw: 2,
        pointsLoss: 0,
        pointsBonusTry: 1,
        pointsBonusLoss: 1,
        startersCount: 15,
        maxBenchCount: 8
    });

    useEffect(() => {
        loadConfig();
    }, [tournamentId]);

    useEffect(() => {
        // Auto-update default durations and starters when rugby format changes
        if (config.rugbyFormat === 'XV') {
            setConfig(prev => ({ ...prev, matchDurationMinutes: 80, startersCount: 15 }));
        } else if (config.rugbyFormat === 'SEVENS') {
            setConfig(prev => ({ ...prev, matchDurationMinutes: 14, startersCount: 7 }));
        } else if (config.rugbyFormat === 'TENS') {
            setConfig(prev => ({ ...prev, matchDurationMinutes: 20, startersCount: 10 }));
        }
    }, [config.rugbyFormat]);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const data = await tournamentService.getFormatConfig(tournamentId);
            if (data) {
                setConfig(data);
            }
        } catch (error) {
            console.log('No existing config found, using defaults.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const saved = await tournamentService.updateFormatConfig(tournamentId, config);
            setConfig(saved);
            toast.success('Format configuration saved successfully');
        } catch (error: any) {
            console.error('Failed to save config:', error);
            toast.error(error.response?.data?.message || 'Failed to save configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!confirm('This will adhere to the saved format rules. Existing unplayed auto-generated matches might be cleared. Continue?')) {
            return;
        }

        try {
            setGenerating(true);
            // Save first to ensure backend has latest
            await tournamentService.updateFormatConfig(tournamentId, config);

            await tournamentService.generateSchedule(
                tournamentId,
                config.formatType,
                config.poolCount,
                generateTimings,
                useExistingGroups
            );

            toast.success('Schedule generated successfully!');
            if (onScheduleGenerated) {
                onScheduleGenerated();
            }
        } catch (err: any) {
            console.error('Failed to generate schedule:', err);
            toast.error(err.response?.data?.message || 'Failed to generate schedule');
        } finally {
            setGenerating(false);
        }
    };

    if (loading && !config.id) {
        return <div className="p-8 text-center text-muted-foreground">Loading format configuration...</div>;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <CardTitle>Format Configuration</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">Define the rules for the tournament. These settings dictate match generation and statistics.</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-8">

                    {/* Core Structure */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Structure</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tournament Format</label>
                                <select
                                    className="w-full p-2 rounded-md border border-input bg-background"
                                    value={config.formatType}
                                    onChange={(e) => setConfig({ ...config, formatType: e.target.value })}
                                >
                                    <option value="ROUND_ROBIN">Round Robin</option>
                                    <option value="POOL_TO_KNOCKOUT">Pools + Knockout</option>
                                    <option value="KNOCKOUT">Knockout</option>
                                </select>
                                <p className="text-xs text-muted-foreground">Determines how teams progress.</p>
                            </div>

                            {(config.formatType === 'ROUND_ROBIN' || config.formatType === 'POOL_TO_KNOCKOUT') && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Number of Pools</label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={16}
                                        value={config.poolCount || 1}
                                        onChange={(e) => setConfig({ ...config, poolCount: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Rugby Format</label>
                                <select
                                    className="w-full p-2 rounded-md border border-input bg-background"
                                    value={config.rugbyFormat}
                                    onChange={(e) => setConfig({ ...config, rugbyFormat: e.target.value as any })}
                                >
                                    <option value="XV">XV (15s)</option>
                                    <option value="SEVENS">Sevens (7s)</option>
                                    <option value="TENS">Tens (10s)</option>
                                    <option value="TOUCH">Touch</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Match Duration (min)</label>
                                <Input
                                    type="number"
                                    value={config.matchDurationMinutes}
                                    onChange={(e) => setConfig({ ...config, matchDurationMinutes: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        {/* Generation Options */}
                        <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-3">
                            <h4 className="text-sm font-medium">Generation Options</h4>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="generateTimings"
                                    className="rounded border-gray-300 dark:border-gray-600 bg-background text-primary focus:ring-primary"
                                    checked={generateTimings}
                                    onChange={(e) => setGenerateTimings(e.target.checked)}
                                />
                                <label htmlFor="generateTimings" className="text-sm cursor-pointer select-none">
                                    Auto-calculate match timings
                                </label>
                            </div>

                            {config.formatType === 'ROUND_ROBIN' && (
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="useExistingGroups"
                                        className="rounded border-gray-300 dark:border-gray-600 bg-background text-primary focus:ring-primary"
                                        checked={useExistingGroups}
                                        onChange={(e) => setUseExistingGroups(e.target.checked)}
                                    />
                                    <label htmlFor="useExistingGroups" className="text-sm cursor-pointer select-none">
                                        Use existing groupings (Pools)
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="h-px bg-border my-6" />

                    {/* Rules & Scoring */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Scoring & Points</h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Win Pts</label>
                                <Input type="number" value={config.pointsWin} onChange={(e) => setConfig({ ...config, pointsWin: parseInt(e.target.value) })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Draw Pts</label>
                                <Input type="number" value={config.pointsDraw} onChange={(e) => setConfig({ ...config, pointsDraw: parseInt(e.target.value) })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Loss Pts</label>
                                <Input type="number" value={config.pointsLoss} onChange={(e) => setConfig({ ...config, pointsLoss: parseInt(e.target.value) })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Bonus Try</label>
                                <Input type="number" value={config.pointsBonusTry} onChange={(e) => setConfig({ ...config, pointsBonusTry: parseInt(e.target.value) })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Bonus Loss</label>
                                <Input type="number" value={config.pointsBonusLoss} onChange={(e) => setConfig({ ...config, pointsBonusLoss: parseInt(e.target.value) })} />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-border my-6" />

                    {/* Roster Limits */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Lineup Rules</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Starters Count</label>
                                <Input
                                    type="number"
                                    value={config.startersCount}
                                    onChange={(e) => setConfig({ ...config, startersCount: parseInt(e.target.value) })}
                                    readOnly={config.rugbyFormat === 'XV' || config.rugbyFormat === 'SEVENS'}
                                    className={config.rugbyFormat === 'XV' || config.rugbyFormat === 'SEVENS' ? 'bg-muted' : ''}
                                />
                                <p className="text-xs text-muted-foreground">Enforced by Rugby Format.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Max Bench Size</label>
                                <Input
                                    type="number"
                                    value={config.maxBenchCount}
                                    onChange={(e) => setConfig({ ...config, maxBenchCount: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
                        <Button
                            variant="secondary"
                            onClick={handleSave}
                            disabled={loading || generating}
                            className="flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            Save Configuration
                        </Button>
                        <Button
                            onClick={handleGenerate}
                            disabled={loading || generating}
                            variant="primary"
                            className="flex items-center gap-2"
                        >
                            <Play className="w-4 h-4" />
                            {generating ? 'Generating Schedule...' : 'Generate Schedule'}
                        </Button>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg flex items-start gap-3 text-sm text-amber-800 dark:text-amber-200">
                        <Info className="w-5 h-5 flex-shrink-0" />
                        <p>Format rules are locked once matches are generated. To edit them later, you must clear the schedule first.</p>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
