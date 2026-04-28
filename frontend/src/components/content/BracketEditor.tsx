import { useState, useMemo } from 'react';
import { TournamentStageResponse, Match } from '@/types';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent } from '@/components/GlassCard';
import { Button } from '@/components/Button';
import { Trash, PencilSimple, Plus } from '@phosphor-icons/react';
import { tournamentService } from '@/services/tournamentService';
import { showToast } from '@/lib/customToast';

interface BracketEditorProps {
    tournamentId: string;
    stages: TournamentStageResponse[];
    matches: Match[];
    onMatchEdit: (match: Match) => void;
    onRefresh: () => void;
}

export function BracketEditor({ tournamentId, stages, matches, onMatchEdit, onRefresh }: BracketEditorProps) {
    const [loading, setLoading] = useState(false);

    // Group stages by stageType (the bracket container)
    // Filter out pool stages since this is a knockout bracket editor
    const knockoutStages = stages.filter(s => s.knockoutStage);
    
    const bracketsMap = useMemo(() => {
        const map = new Map<string, TournamentStageResponse[]>();
        knockoutStages.forEach(stage => {
            const type = stage.stageType || 'CUSTOM';
            if (!map.has(type)) map.set(type, []);
            map.get(type)!.push(stage);
        });
        
        // Sort stages inside each bracket by displayOrder
        for (const [key, value] of map.entries()) {
            map.set(key, value.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)));
        }
        return map;
    }, [knockoutStages]);

    const handleCreateBracket = async (type: string, teamCount: number) => {
        setLoading(true);
        try {
            await tournamentService.createManualBracket(tournamentId, { type, teamCount });
            showToast.success(`Created ${type} Bracket`);
            onRefresh();
        } catch (error) {
            showToast.error('Failed to create bracket');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBracket = async (type: string) => {
        if (!confirm(`Are you sure you want to delete the entire ${type} Bracket? This will remove all associated matches.`)) return;
        setLoading(true);
        try {
            await tournamentService.deleteManualBracket(tournamentId, type);
            showToast.success(`Deleted ${type} Bracket`);
            onRefresh();
        } catch (error) {
            showToast.error('Failed to delete bracket');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Knockout Brackets</h3>
                <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleCreateBracket('PLATE', 4)} disabled={loading}>
                        <Plus className="w-4 h-4 mr-1" /> Add Plate Bracket (4 Teams)
                    </Button>
                    <Button size="sm" onClick={() => handleCreateBracket('BOWL', 4)} disabled={loading}>
                        <Plus className="w-4 h-4 mr-1" /> Add Bowl Bracket (4 Teams)
                    </Button>
                </div>
            </div>

            {Array.from(bracketsMap.entries()).map(([bracketType, bracketStages]) => {
                const displayName = bracketType.replace(/_/g, ' ') + ' BRACKET';
                return (
                    <GlassCard key={bracketType} className="border-t-4 border-t-primary transition-all duration-300">
                        <GlassCardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
                            <GlassCardTitle className="text-base font-bold tracking-tight">{displayName}</GlassCardTitle>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteBracket(bracketType)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 px-2">
                                <Trash className="w-4 h-4 mr-1" /> Delete Bracket
                            </Button>
                        </GlassCardHeader>
                        <GlassCardContent className="p-4 overflow-x-auto">
                            <div className="flex gap-6 min-w-max pb-2">
                                {bracketStages.map(stage => {
                                    const stageMatches = matches.filter(m => m.stage?.id === stage.id);
                                    
                                    return (
                                        <div key={stage.id} className="w-64 shrink-0 flex flex-col">
                                            <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 text-center pb-2 border-b border-white/10">
                                                {stage.name}
                                            </div>
                                            <div className="flex flex-col gap-4 flex-1 justify-around">
                                                {stageMatches.map(match => (
                                                    <div key={match.id} className="bg-background/50 border border-white/5 rounded-lg overflow-hidden relative group hover:border-primary/50 transition-colors">
                                                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                            <button 
                                                                onClick={() => onMatchEdit(match)}
                                                                className="p-1.5 bg-primary/20 hover:bg-primary text-primary-foreground rounded-md backdrop-blur-sm"
                                                                title="Edit Match"
                                                                aria-label="Edit Match"
                                                            >
                                                                <PencilSimple className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground/60 px-2 py-1 bg-black/20 border-b border-white/5 uppercase tracking-wider flex justify-between">
                                                            <span>{match.matchCode}</span>
                                                            <span className="truncate max-w-[80px]">{match.matchDate} {match.kickOffTime?.substring(0,5)}</span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <div className="flex justify-between items-center px-3 py-2 border-b border-white/5">
                                                                <span className={`text-sm truncate pr-2 ${!match.homeTeam?.name ? 'text-muted-foreground italic' : 'text-foreground'}`}>
                                                                    {match.homeTeam?.name || match.homeTeamPlaceholder || 'EMPTY SPOT'}
                                                                </span>
                                                                <span className="font-bold text-sm bg-black/30 px-2 py-0.5 rounded text-white min-w-[28px] text-center">{match.homeScore ?? '-'}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center px-3 py-2">
                                                                <span className={`text-sm truncate pr-2 ${!match.awayTeam?.name ? 'text-muted-foreground italic' : 'text-foreground'}`}>
                                                                    {match.awayTeam?.name || match.awayTeamPlaceholder || 'EMPTY SPOT'}
                                                                </span>
                                                                <span className="font-bold text-sm bg-black/30 px-2 py-0.5 rounded text-white min-w-[28px] text-center">{match.awayScore ?? '-'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {stageMatches.length === 0 && (
                                                    <div className="text-xs text-center text-muted-foreground italic py-8 border border-dashed border-white/10 rounded-lg">
                                                        No matches defined
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </GlassCardContent>
                    </GlassCard>
                );
            })}
            {bracketsMap.size === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl text-muted-foreground">
                    <p>No knockout brackets configured.</p>
                    <p className="text-sm mt-1">Generate matches or add a custom bracket above.</p>
                </div>
            )}
        </div>
    );
}

