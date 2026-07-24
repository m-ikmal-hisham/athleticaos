import { useState, useMemo } from 'react';
import { TournamentStageResponse, Match } from '@/types';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent } from '@/components/GlassCard';
import { Button } from '@/components/Button';
import { Trash, PencilSimple, Plus, Info, Trophy, CaretRight } from '@phosphor-icons/react';
import { tournamentService } from '@/services/tournamentService';
import { showToast } from '@/lib/customToast';
import { groupMatchesIntoBrackets, getBracketTypeId, getBracketTitle, getRoundWeight } from '@/utils/bracketUtils';

interface BracketEditorProps {
    tournamentId: string;
    stages: TournamentStageResponse[];
    matches: Match[];
    onMatchEdit: (match: Match) => void;
    onRefresh: () => void;
    selectedCategoryId?: string | null;
}

export function BracketEditor({ tournamentId, stages, matches, onMatchEdit, onRefresh, selectedCategoryId }: BracketEditorProps) {
    const [loading, setLoading] = useState(false);

    // Filter stages by category first if category is selected
    const categoryStages = useMemo(() => {
        const knockoutOnly = stages.filter(s => s.knockoutStage);
        if (!selectedCategoryId) return knockoutOnly;
        return knockoutOnly.filter(s => s.categoryId === selectedCategoryId || !s.categoryId);
    }, [stages, selectedCategoryId]);

    // Filter matches by category first if category is selected
    const categoryMatches = useMemo(() => {
        if (!selectedCategoryId) return matches;
        return matches.filter(m => m.stage?.categoryId === selectedCategoryId || !m.stage?.categoryId);
    }, [matches, selectedCategoryId]);

    // Check which bracket types already exist for the current category
    const existingBracketTypes = useMemo(() => {
        const types = new Set<string>();
        categoryStages.forEach(stage => {
            types.add(stage.stageType || '');
        });
        return types;
    }, [categoryStages]);

    // Group matches & stages into standardized Bracket Groups (Cup, Plate, Bowl, Shield)
    const bracketGroups = useMemo(() => {
        // First group existing matches
        const groups = groupMatchesIntoBrackets(categoryMatches);
        const groupMap = new Map<string, typeof groups[0]>();
        
        groups.forEach(g => groupMap.set(g.id, g));

        // Ensure stages that might not have matches yet are included in their respective bracket groups
        categoryStages.forEach(stage => {
            const typeId = getBracketTypeId(stage.name, stage.stageType);
            if (!groupMap.has(typeId)) {
                groupMap.set(typeId, {
                    id: typeId,
                    title: getBracketTitle(typeId),
                    rounds: []
                });
            }
            const group = groupMap.get(typeId)!;
            const existingRound = group.rounds.find(r => r.name === stage.name || r.id === stage.id);
            if (!existingRound) {
                group.rounds.push({
                    id: stage.id,
                    name: stage.name,
                    stageType: stage.stageType,
                    displayOrder: stage.displayOrder,
                    roundWeight: getRoundWeight(stage.name, stage.stageType),
                    matches: []
                });
            }
        });

        // Re-sort rounds in each group
        groupMap.forEach(group => {
            group.rounds.sort((a, b) => {
                if (a.roundWeight !== b.roundWeight) return b.roundWeight - a.roundWeight;
                return a.displayOrder - b.displayOrder;
            });
        });

        const result = Array.from(groupMap.values());
        const order = ['CUP', 'PLATE', 'BOWL', 'SHIELD', 'SPOON', 'FORK', 'CLASSIFICATION'];
        return result.sort((a, b) => {
            const idxA = order.indexOf(a.id);
            const idxB = order.indexOf(b.id);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.id.localeCompare(b.id);
        });
    }, [categoryMatches, categoryStages]);

    const handleCreateBracket = async (type: string, teamCount: number) => {
        setLoading(true);
        try {
            await tournamentService.createManualBracket(tournamentId, {
                type,
                teamCount,
                categoryId: selectedCategoryId || undefined,
            });
            showToast.success(`Created ${type} Bracket`);
            onRefresh();
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || 'Failed to create bracket';
            if (message.includes('already exists')) {
                showToast.error(`A ${type} bracket already exists for this category. Delete it first.`);
            } else {
                showToast.error(message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBracket = async (bracketId: string) => {
        if (!confirm(`Are you sure you want to delete the entire ${bracketId} Bracket? This will remove all associated matches.`)) return;
        setLoading(true);
        try {
            await tournamentService.deleteManualBracket(tournamentId, bracketId, selectedCategoryId || undefined);
            showToast.success(`Deleted ${bracketId} Bracket`);
            onRefresh();
        } catch (error) {
            showToast.error('Failed to delete bracket');
        } finally {
            setLoading(false);
        }
    };

    const bracketButtons: { type: string; label: string }[] = [
        { type: 'PLATE', label: 'Add Plate Bracket (4 Teams)' },
        { type: 'BOWL', label: 'Add Bowl Bracket (4 Teams)' },
        { type: 'SHIELD', label: 'Add Shield Bracket (4 Teams)' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">Knockout Brackets (FIFA Visual)</h3>
                </div>
                <div className="flex gap-2">
                    {bracketButtons.map(({ type, label }) => {
                        const exists = existingBracketTypes.has(type);
                        return (
                            <div key={type} className="relative group/btn">
                                <Button
                                    size="sm"
                                    onClick={() => handleCreateBracket(type, 4)}
                                    disabled={loading || exists}
                                    className={exists ? 'opacity-50 cursor-not-allowed' : ''}
                                >
                                    <Plus className="w-4 h-4 mr-1" /> {label}
                                </Button>
                                {exists && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none border border-slate-700 shadow-lg z-50">
                                        <Info className="w-3 h-3 inline mr-1 -mt-0.5" />
                                        {type} bracket already exists
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {bracketGroups.map((bracket) => (
                <GlassCard key={bracket.id} className="border-t-4 border-t-primary transition-all duration-300">
                    <GlassCardHeader className="py-3.5 px-5 border-b border-white/10 flex flex-row items-center justify-between">
                        <GlassCardTitle className="text-base font-bold tracking-tight uppercase flex items-center gap-2">
                            <span>{bracket.title}</span>
                        </GlassCardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteBracket(bracket.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 px-2"
                        >
                            <Trash className="w-4 h-4 mr-1" /> Delete Bracket
                        </Button>
                    </GlassCardHeader>
                    <GlassCardContent className="p-6 overflow-x-auto">
                        <div className="flex gap-8 min-w-max pb-2">
                            {bracket.rounds.map((round, roundIdx) => (
                                <div key={round.id || round.name} className="w-72 shrink-0 flex flex-col">
                                    <div className="text-xs font-black uppercase tracking-wider text-primary mb-4 text-center pb-2 border-b border-white/10 flex items-center justify-center gap-1.5">
                                        <span>{round.name}</span>
                                        {roundIdx < bracket.rounds.length - 1 && (
                                            <CaretRight className="w-3.5 h-3.5 opacity-50" />
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-4 flex-1 justify-around">
                                        {round.matches.map((match) => (
                                            <div
                                                key={match.id}
                                                className="bg-background/60 border border-white/10 rounded-xl overflow-hidden relative group hover:border-primary/60 transition-all shadow-md"
                                            >
                                                {/* Admin edit button */}
                                                <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                    <button
                                                        onClick={() => onMatchEdit(match)}
                                                        className="p-1.5 bg-primary/30 hover:bg-primary text-white rounded-lg backdrop-blur-md transition-colors"
                                                        title="Edit Match"
                                                        aria-label="Edit Match"
                                                    >
                                                        <PencilSimple className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                                <div className="text-[10px] text-muted-foreground/80 px-3 py-1 bg-black/40 border-b border-white/5 uppercase tracking-wider flex justify-between font-mono">
                                                    <span>{match.matchCode || 'MATCH'}</span>
                                                    <span className="truncate max-w-[100px]">
                                                        {match.matchDate ? match.matchDate.substring(5) : ''} {match.kickOffTime?.substring(0, 5)}
                                                    </span>
                                                </div>

                                                <div className="flex flex-col p-1 space-y-1">
                                                    {/* Home Team */}
                                                    <div className="flex justify-between items-center px-2.5 py-1.5 rounded-lg bg-black/20">
                                                        <span className={`text-xs truncate pr-2 font-medium ${!match.homeTeam?.name ? 'text-muted-foreground italic' : 'text-foreground'}`}>
                                                            {match.homeTeam?.name || match.homeTeamPlaceholder || 'EMPTY SPOT'}
                                                        </span>
                                                        <span className="font-mono font-bold text-xs bg-black/40 px-2 py-0.5 rounded text-white min-w-[24px] text-center">
                                                            {match.homeScore ?? '-'}
                                                        </span>
                                                    </div>

                                                    {/* Away Team */}
                                                    <div className="flex justify-between items-center px-2.5 py-1.5 rounded-lg bg-black/20">
                                                        <span className={`text-xs truncate pr-2 font-medium ${!match.awayTeam?.name ? 'text-muted-foreground italic' : 'text-foreground'}`}>
                                                            {match.awayTeam?.name || match.awayTeamPlaceholder || 'EMPTY SPOT'}
                                                        </span>
                                                        <span className="font-mono font-bold text-xs bg-black/40 px-2 py-0.5 rounded text-white min-w-[24px] text-center">
                                                            {match.awayScore ?? '-'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {round.matches.length === 0 && (
                                            <div className="text-xs text-center text-muted-foreground italic py-8 border border-dashed border-white/10 rounded-xl">
                                                No matches defined for this stage
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCardContent>
                </GlassCard>
            ))}

            {bracketGroups.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-2xl text-muted-foreground">
                    <p>No knockout brackets configured.</p>
                    <p className="text-sm mt-1">Generate matches or add a custom bracket above.</p>
                </div>
            )}
        </div>
    );
}
