import { useState, useEffect, useMemo } from 'react';
import { Gear, Play, FloppyDisk, Layout, Question, Trophy } from '@phosphor-icons/react';
import { Tooltip } from '@/components/ui/Tooltip';
import { tournamentService } from '@/services/tournamentService';
import { Button } from '@/components/Button';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, GlassCardDescription } from '@/components/GlassCard';
import { Input } from '@/components/Input';
import { SearchableSelect } from '@/components/SearchableSelect';
import { TournamentFormatConfig, TournamentCategory, Team, TournamentStageResponse, BracketViewResponse } from '@/types';
import { GroupingEditor } from '@/components/content/GroupingEditor';
import { ConfirmModal } from '@/components/ConfirmModal';
import { showToast } from '@/lib/customToast';
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
        maxBenchCount: 10,
        // 4 gives Cup 1-4 / Plate 5-8 (no quarter-final); 8 gives Cup 1-8 / Plate 9-16
        // with a quarter-final in each bracket. Kept on `config` so it loads and saves
        // with the rest of the format rather than resetting on remount.
        placementBracketSize: 4
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
    }, [categories, selectedCategoryId]);

    // Fetch config and stages when category changes
    useEffect(() => {
        // Only load if we have categories loaded (or if tournament has no categories)
        if (!loading && (selectedCategoryId || categories.length === 0)) {
            loadConfigAndStructure();
        }
    }, [tournamentId, selectedCategoryId]);

    useEffect(() => {
        // Auto-update default durations, starters, and bench count when rugby format changes
        if (config.rugbyFormat === 'XV') {
            setConfig(prev => ({ ...prev, matchDurationMinutes: 80, startersCount: 15, maxBenchCount: 10 }));
        } else if (config.rugbyFormat === 'SEVENS') {
            setConfig(prev => ({ ...prev, matchDurationMinutes: 14, startersCount: 7, maxBenchCount: 5 }));
        } else if (config.rugbyFormat === 'TENS') {
            setConfig(prev => ({ ...prev, matchDurationMinutes: 20, startersCount: 10, maxBenchCount: 7 }));
        }
    }, [config.rugbyFormat]);

    const loadData = async () => {
        try {
            setLoading(true);
            // Initial load of categories and teams
            const [categoriesData, teamsData] = await Promise.all([
                tournamentService.getCategories(tournamentId),
                tournamentService.getTeams(tournamentId)
            ]);

            setCategories(categoriesData);
            setTeams(teamsData);
        } catch (error) {
            console.error('Failed to load initial data', error);
        } finally {
            setLoading(false);
        }
    };

    const loadConfigAndStructure = async () => {
        try {
            setStructureLoading(true);

            // Load Config for this category
            const configData = await tournamentService.getFormatConfig(tournamentId, selectedCategoryId || undefined);
            if (configData) setConfig(configData);

            // Fetch bracket/structure to see existing pools
            // TODO: If category API supports filtering bracket/stages by category, use it.
            // Currently getBracket returns all.
            const bracketData: BracketViewResponse = await tournamentService.getBracket(tournamentId);

            // Filter stages by selected category
            const rawStages = bracketData?.stages?.map(s => s.stage) || [];
            const filteredStages = selectedCategoryId
                ? rawStages.filter(s => s.categoryId === selectedCategoryId)
                : rawStages;

            setStages(filteredStages);

            // If we have existing stages, default to using them (preserving assignments)
            if (filteredStages.length > 0) {
                setUseExistingGroups(true);
            } else {
                setUseExistingGroups(false);
            }

            // Refresh teams to get latest pool assignments
            // const latestTeams = await tournamentService.getTeams(tournamentId);
            // setTeams(latestTeams); 
            // Skipping team reload for performance unless needed.

        } catch (error) {
            console.error('Failed to load structure/config', error);
        } finally {
            setStructureLoading(false);
        }
    };

    // LoadStructure removed in favor of loadConfigAndStructure
    // But we might need re-loading structure when renaming pools (GroupingEditor onRename).
    // So let's alias it or keep it simple.
    const reloadStructure = async () => {
        await loadConfigAndStructure();
    };

    const handleSaveConfig = async () => {
        // SAFETY CHECK: If categories exist, prevent saving Global Defaults blindly
        if (categories.length > 0 && !selectedCategoryId) {
            showToast.error("Please select a category before saving.");
            return;
        }

        try {
            setLoading(true);
            const configToSave = {
                ...config,
                categoryId: selectedCategoryId || undefined, // Explicitly send undefined for global (TS fix)
                tournamentId: tournamentId // Ensure this is the UUID prop, not taken from potentially messy state
            };
            const saved = await tournamentService.updateFormatConfig(tournamentId, configToSave);
            setConfig(saved);
            showToast.success(selectedCategoryId ? 'Category format saved successfully' : 'Global defaults saved successfully');
        } catch (error: any) {
            console.error('Failed to save config:', error);
            showToast.error(error.response?.data?.message || 'Failed to save configuration');
        } finally {
            setLoading(false);
        }
    };

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    const handleGenerateStructureFn = async () => {
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

            showToast.success('Pool structure generated!');
            await loadConfigAndStructure();
            setUseExistingGroups(true); // Switch to using these groups for matches
        } catch (error: any) {
            showToast.error(error.response?.data?.message || 'Failed to generate structure');
        } finally {
            setStructureLoading(false);
        }
    };

    const handleGenerateStructure = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Build Pools?',
            message: 'This will create empty pools based on your configuration. Any existing pools/matches for this category might be reset.',
            onConfirm: handleGenerateStructureFn
        });
    };

    const handleGenerateMatchesFn = async () => {
        try {
            setGenerating(true);
            await tournamentService.generateSchedule(
                tournamentId,
                config.formatType,
                config.poolCount || 1, // Ensure minimum 1 to pass validation
                generateTimings,
                useExistingGroups, // Use the manual pools!
                selectedCategoryId || undefined,
                config.includePlacementStages,
                teams.filter(t => !selectedCategoryId || !t.tournamentCategoryId || t.tournamentCategoryId === selectedCategoryId || t.category === 'Unassigned').map(t => t.id),
                config.placementBracketSize ?? 4
            );
            showToast.success('Schedule generated!');
            if (onScheduleGenerated) onScheduleGenerated();
        } catch (error: any) {
            showToast.error(error.response?.data?.message || 'Failed to generate schedule');
        } finally {
            setGenerating(false);
        }
    };

    const handleGenerateMatches = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Generate Matches',
            message: 'Are you sure you want to generate matches? This will finalize the format and create the schedule.',
            onConfirm: handleGenerateMatchesFn
        });
    };

    const handleAssignTeam = async (teamId: string, poolName: string | null, poolSlot?: number | null) => {
        try {
            // Optimistic update
            setTeams(prevTeams => prevTeams.map(t =>
                t.id === teamId ? { ...t, poolNumber: poolName || undefined, poolSlot: poolSlot || undefined } : t
            ));

            await tournamentService.updateTeamPool(tournamentId, teamId, poolName, poolSlot);
        } catch (error) {
            console.error('Failed to assign team', error);
            showToast.error('Failed to move team. Please retry.');
            // Revert on failure
            const latest = await tournamentService.getTeams(tournamentId);
            setTeams(latest);
        }
    };

    const hasEmptyPools = useMemo(() => {
        if (config.formatType === 'KNOCKOUT') {
            // For KNOCKOUT, check if there are any relevant teams
            const relevantTeams = teams.filter(t => !selectedCategoryId || t.tournamentCategoryId === selectedCategoryId || t.category === 'Unassigned');
            return relevantTeams.length === 0;
        }

        const poolStages = stages.filter(s => s.stageType === 'POOL' || s.name.toLowerCase().includes('pool'));
        
        // If there are no pools built yet, it is considered empty
        if (poolStages.length === 0) return true;

        // Check if ANY pool has no teams assigned
        for (const pool of poolStages) {
             const teamsInPool = teams.filter(t => t.poolNumber === pool.name);
             if (teamsInPool.length === 0) {
                 return true;
             }
        }
        
        return false;
    }, [stages, teams, selectedCategoryId, config.formatType]);

    if (loading && !config.id) {
        return <div className="p-8 text-center text-muted-foreground">Loading format configuration...</div>;
    }

    const currentCategory = categories.find(c => c.id === selectedCategoryId);

    return (
        <div className="space-y-6">
            <GlassCard>
                <GlassCardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Gear className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <GlassCardTitle>Format Configuration</GlassCardTitle>
                                <GlassCardDescription className="mt-1">
                                    {categories.length > 0
                                        ? "Configure format and pools for each category."
                                        : "Define rules and structure for the tournament."}
                                </GlassCardDescription>
                            </div>
                        </div>
                        {categories.length > 0 && (
                            <div className="flex gap-3 overflow-x-auto pb-2">
                                {categories.map(cat => (
                                    <div
                                        key={cat.id}
                                        onClick={() => setSelectedCategoryId(cat.id)}
                                        className={clsx(
                                            "cursor-pointer group relative overflow-hidden rounded-xl border p-4 transition-all duration-300 min-w-[140px]",
                                            selectedCategoryId === cat.id
                                                ? "bg-primary/10 border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                                                : "bg-background/40 border-white/10 hover:border-white/20 hover:bg-white/5"
                                        )}
                                    >
                                        <div className={clsx(
                                            "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                                            "bg-gradient-to-br from-white/10 to-transparent"
                                        )} />

                                        <div className="relative z-10 flex flex-col items-start gap-1">
                                            <span className={clsx(
                                                "text-sm font-bold tracking-tight",
                                                selectedCategoryId === cat.id ? "text-primary" : "text-foreground/80"
                                            )}>
                                                {cat.name}
                                            </span>
                                            <span className={clsx(
                                                "text-xs",
                                                selectedCategoryId === cat.id ? "text-primary/70" : "text-muted-foreground"
                                            )}>
                                                Category
                                            </span>
                                        </div>

                                        {selectedCategoryId === cat.id && (
                                            <div className="absolute bottom-0 left-0 h-0.5 w-full bg-primary/50" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </GlassCardHeader>
                <GlassCardContent className="space-y-8">

                    {/* Format Rules (Shared or Global currently) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg bg-card/50">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Competition Format</label>
                            <SearchableSelect
                                value={config.formatType}
                                onChange={(value) => setConfig({ ...config, formatType: value as string })}
                                options={[
                                    { value: 'ROUND_ROBIN', label: 'Round Robin' },
                                    { value: 'POOL_TO_KNOCKOUT', label: 'Pools + Knockout' },
                                    { value: 'KNOCKOUT', label: 'Knockout' }
                                ]}
                                placeholder="Select format"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Rugby Variation</label>
                            <SearchableSelect
                                value={config.rugbyFormat}
                                onChange={(value) => setConfig({ ...config, rugbyFormat: value as any })}
                                options={[
                                    { value: 'XV', label: 'XV (15s)' },
                                    { value: 'SEVENS', label: 'Sevens (7s)' },
                                    { value: 'TENS', label: 'Tens (10s)' },
                                    { value: 'TOUCH', label: 'Touch' }
                                ]}
                                placeholder="Select variation"
                            />
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

                        {(config.formatType === 'KNOCKOUT' || config.formatType === 'POOL_TO_KNOCKOUT') && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Placement Stages</label>
                                <div className="flex items-center space-x-2 pt-2">
                                    <input
                                        type="checkbox"
                                        id="includePlacementStages"
                                        className="rounded border-gray-300 bg-background text-primary focus:ring-primary"
                                        checked={config.includePlacementStages || false}
                                        onChange={(e) => setConfig({ ...config, includePlacementStages: e.target.checked })}
                                    />
                                    <label htmlFor="includePlacementStages" className="text-sm cursor-pointer select-none">
                                        Include Consolation Rounds (Plate, Bowl, etc.)
                                    </label>
                                </div>
                                <p className="text-xs text-muted-foreground">Generate loser brackets for lower placements.</p>

                                {config.includePlacementStages && (
                                    <div className="pt-3 space-y-2">
                                        <label htmlFor="placementBracketSize" className="text-sm font-medium">
                                            Teams per bracket
                                        </label>
                                        <select
                                            id="placementBracketSize"
                                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                            value={config.placementBracketSize ?? 4}
                                            onChange={(e) => setConfig({ ...config, placementBracketSize: parseInt(e.target.value) })}
                                        >
                                            <option value={4}>4 teams — Semi Finals → Final</option>
                                            <option value={8}>8 teams — Quarter Finals → Semi Finals → Final</option>
                                        </select>
                                        <p className="text-xs text-muted-foreground">
                                            {(config.placementBracketSize ?? 4) === 4
                                                ? 'Each bracket decides 4 places: Cup 1st–4th, Plate 5th–8th, Bowl 9th–12th, and so on. A 4-team bracket has no quarter-final — its first round is the semi-final.'
                                                : 'Each bracket decides 8 places: Cup 1st–8th, Plate 9th–16th, Bowl 17th–24th, and so on. Teams knocked out in the quarter-finals are not ranked further within their bracket.'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="space-y-2 flex items-end">
                            <Button
                                variant={selectedCategoryId ? "primary" : "secondary"}
                                size="sm"
                                className="w-full"
                                onClick={handleSaveConfig}
                                disabled={loading}
                            >
                                <FloppyDisk className="w-4 h-4 mr-2" />
                                {selectedCategoryId && currentCategory
                                    ? `Save ${currentCategory.name} Format`
                                    : "Save Global Defaults"}
                            </Button>
                        </div>
                    </div>

                    {/* Match Timing Configuration */}
                    <div className="p-4 border rounded-lg bg-card/50 space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Play className="w-4 h-4" />
                            Match Timing & Schedule Defaults
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Match Duration (Total Mins)</label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={config.matchDurationMinutes || 0}
                                    onChange={(e) => setConfig({ ...config, matchDurationMinutes: parseInt(e.target.value) || 0 })}
                                />
                                <p className="text-xs text-muted-foreground">E.g. 80 for XVs, 14 for 7s.</p>

                                <div className="flex items-center space-x-2 pt-2">
                                    <input
                                        type="checkbox"
                                        id="isOneWayMatch"
                                        className="rounded border-gray-300 bg-background text-primary focus:ring-primary"
                                        checked={config.isOneWayMatch || false}
                                        onChange={(e) => setConfig({ ...config, isOneWayMatch: e.target.checked })}
                                    />
                                    <label htmlFor="isOneWayMatch" className="text-sm cursor-pointer select-none">
                                        One Way Match
                                    </label>
                                </div>
                                <p className="text-[10px] text-muted-foreground pl-5">Single period, no half time.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Buffer Time (Mins)</label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={config.bufferTimeMinutes || 0}
                                    onChange={(e) => setConfig({ ...config, bufferTimeMinutes: parseInt(e.target.value) || 0 })}
                                />
                                <p className="text-xs text-muted-foreground">Break between matches.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Daily Start Time</label>
                                <Input
                                    type="time"
                                    value={config.carnivalStartTime || ''}
                                    onChange={(e) => setConfig({ ...config, carnivalStartTime: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground">First match kick-off.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Daily End Time</label>
                                <Input
                                    type="time"
                                    value={config.carnivalEndTime || ''}
                                    onChange={(e) => setConfig({ ...config, carnivalEndTime: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground">Last match end by.</p>
                            </div>
                        </div>
                    </div>

                    {/* Scoring Rules Configuration */}
                    <div className="p-4 border rounded-lg bg-card/50 space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Trophy className="w-4 h-4" />
                            Scoring Rules
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Win Points</label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={config.pointsWin !== undefined ? config.pointsWin : 4}
                                    onChange={(e) => setConfig({ ...config, pointsWin: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Draw Points</label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={config.pointsDraw !== undefined ? config.pointsDraw : 2}
                                    onChange={(e) => setConfig({ ...config, pointsDraw: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Loss Points</label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={config.pointsLoss !== undefined ? config.pointsLoss : 0}
                                    onChange={(e) => setConfig({ ...config, pointsLoss: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Bonus (Try)</label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={config.pointsBonusTry !== undefined ? config.pointsBonusTry : 1}
                                    onChange={(e) => setConfig({ ...config, pointsBonusTry: parseInt(e.target.value) || 0 })}
                                />
                                <p className="text-[10px] text-muted-foreground">e.g. 4+ tries</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Bonus (Loss)</label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={config.pointsBonusLoss !== undefined ? config.pointsBonusLoss : 1}
                                    onChange={(e) => setConfig({ ...config, pointsBonusLoss: parseInt(e.target.value) || 0 })}
                                />
                                <p className="text-[10px] text-muted-foreground">e.g. within 7 pts</p>
                            </div>
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
                                        onRename={reloadStructure}
                                        tournamentId={tournamentId}
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
                                <label htmlFor="useExistingGroups" className="text-xs cursor-pointer select-none flex items-center gap-1.5">
                                    Preserve manual pool assignments
                                    <Tooltip content="If checked, the match generator will respect the current team positions in pools. If unchecked, teams may be reshuffled." position="top">
                                        <Question className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                                    </Tooltip>
                                </label>
                            </div>
                        </div>
                        <Button
                            onClick={handleGenerateMatches}
                            disabled={loading || generating || stages.length === 0 || hasEmptyPools}
                            variant="primary"
                            size="lg"
                            className="flex items-center gap-2"
                            title={hasEmptyPools ? "Please assign at least one team to every pool before generating matches" : ""}
                        >
                            <Play className="w-4 h-4" />
                            {generating ? 'Generating Matches...' : 'Generate Matches'}
                        </Button>
                    </div>

                </GlassCardContent>
            </GlassCard>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.title.includes('Generate') ? 'Generate' : 'Build'}
            />
        </div >
    );
}
