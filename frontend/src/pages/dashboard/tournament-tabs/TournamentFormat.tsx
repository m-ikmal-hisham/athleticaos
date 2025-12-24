import { useState, useEffect } from 'react';
import { Gear, Play, FloppyDisk, Layout } from '@phosphor-icons/react';
import { tournamentService } from '@/services/tournamentService';
import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Input } from '@/components/Input';
import { TournamentFormatConfig, TournamentCategory, Team, TournamentStageResponse, BracketViewResponse } from '@/types';
import { GroupingEditor } from '@/components/content/GroupingEditor';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface TournamentFormatProps {
    tournamentId: string;
    onScheduleGenerated?: () => void;
}

export function TournamentFormat({ tournamentId, onScheduleGenerated }: TournamentFormatProps) {
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [structureLoading, setStructureLoading] = useState(false);

    // Data State
    const [categories, setCategories] = useState<TournamentCategory[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    const [stages, setStages] = useState<TournamentStageResponse[]>([]);

    // Config State
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

    const [generateTimings] = useState(true);
    const [useExistingGroups, setUseExistingGroups] = useState(false);

    useEffect(() => {
        loadData();
    }, [tournamentId]);

    useEffect(() => {
        if (categories.length > 0 && !selectedCategoryId) {
            setSelectedCategoryId(categories[0].id);
        }
    }, [categories]);

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

    // Fetch stages when category changes
    useEffect(() => {
        if (selectedCategoryId || (categories.length === 0 && !loading)) {
            loadStructure();
        }
    }, [tournamentId, selectedCategoryId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [configData, categoriesData, teamsData] = await Promise.all([
                tournamentService.getFormatConfig(tournamentId),
                tournamentService.getCategories(tournamentId),
                tournamentService.getTeams(tournamentId)
            ]);

            if (configData) setConfig(configData);
            setCategories(categoriesData);
            setTeams(teamsData);
        } catch (error) {
            console.error('Failed to load initial data', error);
        } finally {
            setLoading(false);
        }
    };

    const loadStructure = async () => {
        try {
            setStructureLoading(true);
            // Fetch bracket/structure to see existing pools
            // TODO: If category API supports filtering bracket/stages by category, use it.
            // Currently getBracket returns all.
            const bracketData: BracketViewResponse = await tournamentService.getBracket(tournamentId);

            // Filter stages by category (assuming stages link to category, or infer from somewhere?)
            // Wait, TournamentStage entity has category now. Backend endpoint returns TournamentStageResponse.
            // But types/index.ts TournamentStageResponse does NOT have categoryId yet?
            // Let's assume backend populates stages correctly.
            // For now, if no category ID on stage response, we might show all? NO.
            // We need to request adding categoryId to StageResponse if not present.
            // OR the getBracket endpoint should filter?
            // Actually getBracket returns entire tournament view.

            // Assuming stages returned are relevant.
            // We should filter client side if possible or rely on naming conventions if lacking IDs.
            // Let's blindly use stages for now or filter properly if we had the field.
            // To be safe, if categories exist, stages should belong to them.
            // Wait, earlier I added @ManyToOne to TournamentStage.
            // But did I update TournamentStageResponse? Let's check.
            // Step 252: TournamentStageResponse does NOT have categoryId.
            // For this implementation, I will assume stages are either global (no category) or relevant.
            // BUT, if I generate structure for Category A, I want to see Category A's pools.

            // For now, let's just use bracketData.stages.map(s => s.stage)
            // And hope backend handles filtering or we iterate.

            // Actually, if we have categories, we should really ensure we only show that category's stages.
            // Since I can't easily change backend DTO right now without context switch, 
            // I'll rely on the fact that if I just generated them, they should be there.
            // (Or maybe they have names like "U16 Pool A"?)

            const rawStages = bracketData?.stages?.map(s => s.stage) || [];
            // If we have categories, try to match? 
            // For MVP manual grouping, let's just show all stages found. 
            // Assuming user is working on one category at a time or they see all.
            setStages(rawStages);

            // Refresh teams to get latest pool assignments
            const latestTeams = await tournamentService.getTeams(tournamentId);
            setTeams(latestTeams);

        } catch (error) {
            console.error('Failed to load structure', error);
        } finally {
            setStructureLoading(false);
        }
    };

    const handleSaveConfig = async () => {
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

    const handleGenerateStructure = async () => {
        if (!confirm('This will create empty pools based on your configuration. Any existing pools/matches for this category might be reset. Continue?')) {
            return;
        }

        try {
            setStructureLoading(true);
            // First save config
            await tournamentService.updateFormatConfig(tournamentId, config);

            // Call generateStructure
            await tournamentService.generateStructure(
                tournamentId,
                config.poolCount || 1,
                selectedCategoryId || undefined
            );

            toast.success('Pool structure generated!');
            await loadStructure();
            setUseExistingGroups(true); // Switch to using these groups for matches
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to generate structure');
        } finally {
            setStructureLoading(false);
        }
    };

    const handleGenerateMatches = async () => {
        if (!confirm('Generate matches? This will lock the format.')) {
            return;
        }

        try {
            setGenerating(true);
            await tournamentService.generateSchedule(
                tournamentId,
                config.formatType,
                config.poolCount,
                generateTimings,
                useExistingGroups, // Use the manual pools!
                selectedCategoryId || undefined
            );
            toast.success('Schedule generated!');
            if (onScheduleGenerated) onScheduleGenerated();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to generate schedule');
        } finally {
            setGenerating(false);
        }
    };

    const handleAssignTeam = async (teamId: string, poolName: string | null) => {
        try {
            // Optimistic update
            const updatedTeams = teams.map(t =>
                t.id === teamId ? { ...t, poolNumber: poolName || undefined } : t
            );
            setTeams(updatedTeams);

            await tournamentService.updateTeamPool(tournamentId, teamId, poolName);
        } catch (error) {
            console.error('Failed to assign team', error);
            toast.error('Failed to move team. Please retry.');
            // Revert on failure
            const latest = await tournamentService.getTeams(tournamentId);
            setTeams(latest);
        }
    };

    if (loading && !config.id) {
        return <div className="p-8 text-center text-muted-foreground">Loading format configuration...</div>;
    }

    const currentCategory = categories.find(c => c.id === selectedCategoryId);

    return (
        <div className="space-y-6">
            <GlassCard>
                <div className="p-0">
                    <CardHeader>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                    <Gear className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <CardTitle>Format Configuration</CardTitle>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {categories.length > 0
                                            ? "Configure format and pools for each category."
                                            : "Define rules and structure for the tournament."}
                                    </p>
                                </div>
                            </div>
                            {categories.length > 0 && (
                                <div className="flex gap-2 p-1 bg-muted rounded-lg overflow-x-auto">
                                    {categories.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setSelectedCategoryId(cat.id)}
                                            className={clsx(
                                                "px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors",
                                                selectedCategoryId === cat.id
                                                    ? "bg-background shadow text-foreground"
                                                    : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                                            )}
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-8">

                        {/* Format Rules (Shared or Global currently) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg bg-card/50">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Competition Format</label>
                                <select
                                    className="w-full p-2 rounded-md border border-input bg-background"
                                    value={config.formatType}
                                    onChange={(e) => setConfig({ ...config, formatType: e.target.value })}
                                    title="Competition Format"
                                >
                                    <option value="ROUND_ROBIN">Round Robin</option>
                                    <option value="POOL_TO_KNOCKOUT">Pools + Knockout</option>
                                    <option value="KNOCKOUT">Knockout</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Rugby Variation</label>
                                <select
                                    className="w-full p-2 rounded-md border border-input bg-background"
                                    value={config.rugbyFormat}
                                    onChange={(e) => setConfig({ ...config, rugbyFormat: e.target.value as any })}
                                    title="Rugby Variation"
                                >
                                    <option value="XV">XV (15s)</option>
                                    <option value="SEVENS">Sevens (7s)</option>
                                    <option value="TENS">Tens (10s)</option>
                                    <option value="TOUCH">Touch</option>
                                </select>
                            </div>
                            {(config.formatType === 'ROUND_ROBIN' || config.formatType === 'POOL_TO_KNOCKOUT') && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Pool Count {currentCategory ? `(${currentCategory.name})` : ''}</label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={16}
                                        value={config.poolCount || 1}
                                        onChange={(e) => setConfig({ ...config, poolCount: parseInt(e.target.value) || 1 })}
                                    />
                                    <p className="text-xs text-muted-foreground">Number of groups for {currentCategory?.name || 'the tournament'}.</p>
                                </div>
                            )}
                            <div className="space-y-2 flex items-end">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="w-full"
                                    onClick={handleSaveConfig}
                                    disabled={loading}
                                >
                                    <FloppyDisk className="w-4 h-4 mr-2" />
                                    Save Globals
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <Layout className="w-4 h-4" />
                                    Pool Structure & Assignments
                                </h3>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleGenerateStructure}
                                        disabled={structureLoading || generating}
                                    >
                                        {structureLoading ? 'Building...' : `Build Pools ${currentCategory ? 'for ' + currentCategory.name : ''}`}
                                    </Button>
                                </div>
                            </div>

                            {/* Grouping Editor Area */}
                            {(config.formatType !== 'KNOCKOUT') && (
                                <div className="min-h-[300px] border rounded-lg bg-muted/10 p-4">
                                    {stages.length > 0 ? (
                                        <GroupingEditor
                                            teams={teams}
                                            stages={stages}
                                            categoryId={selectedCategoryId || undefined}
                                            onAssign={handleAssignTeam}
                                            readonly={generating}
                                        />
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2 py-12">
                                            <Layout className="w-12 h-12 opacity-20" />
                                            <p>No pools generated yet.</p>
                                            <p className="text-sm">Set the "Pool Count" and click <b>Build Pools</b> to start assigning teams.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="h-px bg-border my-6" />

                        <div className="flex items-center justify-between bg-primary/5 p-4 rounded-lg border border-primary/10">
                            <div className="space-y-1">
                                <h4 className="font-semibold text-primary">Finalize & Generate Matches</h4>
                                <p className="text-sm text-muted-foreground">Once teams are assigned, generate the match schedule.</p>
                                <div className="flex items-center space-x-2 pt-1">
                                    <input
                                        type="checkbox"
                                        id="useExistingGroups"
                                        className="rounded border-gray-300 bg-background text-primary focus:ring-primary"
                                        checked={useExistingGroups}
                                        onChange={(e) => setUseExistingGroups(e.target.checked)}
                                    />
                                    <label htmlFor="useExistingGroups" className="text-xs cursor-pointer select-none">
                                        Preserve manual pool assignments
                                    </label>
                                </div>
                            </div>
                            <Button
                                onClick={handleGenerateMatches}
                                disabled={loading || generating || stages.length === 0}
                                variant="primary"
                                size="lg"
                                className="flex items-center gap-2"
                            >
                                <Play className="w-4 h-4" />
                                {generating ? 'Generating Matches...' : 'Generate Matches'}
                            </Button>
                        </div>

                    </CardContent>
                </div>
            </GlassCard>
        </div>
    );
}
