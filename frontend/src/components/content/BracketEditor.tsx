import { useState, useMemo } from 'react';
import { TournamentStageResponse, MatchResponse } from '@/types';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent } from '@/components/GlassCard';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Input } from '@/components/Input';
import { Label } from '@/components/Label';
import { SearchableSelect } from '@/components/SearchableSelect';
import { Trash, PencilSimple, Plus, Info, Trophy, CaretRight, ArrowsClockwise, SkipForward, ArrowFatLineRight } from '@phosphor-icons/react';
import { tournamentService } from '@/services/tournamentService';
import { showToast } from '@/lib/customToast';
import { buildBracketGroups } from '@/utils/bracketUtils';

interface BracketEditorProps {
    tournamentId: string;
    stages: TournamentStageResponse[];
    // MatchResponse, not Match: the flat homeTeamName/awayTeamName fields live on the response.
    matches: MatchResponse[];
    onMatchEdit: (match: MatchResponse) => void;
    onRefresh: () => void;
    selectedCategoryId?: string | null;
}

/**
 * Standard rugby placement ladder. Each bracket covers four places: its semi-finals feed
 * the bracket's final (top two) and its placement playoff (bottom two). The ranges below
 * assume the default four-team bracket and are shown to the organiser as guidance only —
 * a larger bracket shifts them, and the ladder is not enforced.
 * CUP is absent by design: it is represented by QUARTER_FINAL/SEMI_FINAL/FINAL stage types,
 * not a CUP stage type, so it cannot be added as a standalone manual bracket.
 */
const MANUAL_BRACKET_TYPES: { type: string; label: string; places: string }[] = [
    { type: 'PLATE', label: 'Plate', places: '5th – 8th' },
    { type: 'BOWL', label: 'Bowl', places: '9th – 12th' },
    { type: 'SHIELD', label: 'Shield', places: '13th – 16th' },
    { type: 'SPOON', label: 'Spoon', places: '17th – 20th' },
    { type: 'FORK', label: 'Fork', places: '21st – 24th' },
];

const BRACKET_TEAM_COUNTS = [2, 4, 8, 16];

export function BracketEditor({ tournamentId, stages, matches, onMatchEdit, onRefresh, selectedCategoryId }: BracketEditorProps) {
    const [loading, setLoading] = useState(false);
    const [addBracketOpen, setAddBracketOpen] = useState(false);
    const [newBracketType, setNewBracketType] = useState('PLATE');
    const [newBracketTeamCount, setNewBracketTeamCount] = useState(4);
    const [newBracketPlayoff, setNewBracketPlayoff] = useState(true);
    const [newBracketName, setNewBracketName] = useState('');
    const [bracketToDelete, setBracketToDelete] = useState<string | null>(null);

    // Filter stages by category first if category is selected
    const categoryStages = useMemo(() => {
        const knockoutOnly = stages.filter(s => s.knockoutStage);
        if (!selectedCategoryId) return knockoutOnly;
        return knockoutOnly.filter(s => s.categoryId === selectedCategoryId);
    }, [stages, selectedCategoryId]);

    // Filter matches by category first if category is selected
    const categoryMatches = useMemo(() => {
        if (!selectedCategoryId) return matches;
        return matches.filter(m => m.stage?.categoryId === selectedCategoryId);
    }, [matches, selectedCategoryId]);

    // Check which bracket types already exist for the current category
    const existingBracketTypes = useMemo(() => {
        const types = new Set<string>();
        categoryStages.forEach(stage => {
            types.add(stage.stageType || '');
        });
        return types;
    }, [categoryStages]);

    // Shared with BracketView and the public site so all three group a tournament identically.
    const bracketGroups = useMemo(
        () => buildBracketGroups(categoryMatches, categoryStages),
        [categoryMatches, categoryStages],
    );

    const defaultBracketLabel = MANUAL_BRACKET_TYPES.find(b => b.type === newBracketType)?.label
        || newBracketType;

    // A placement playoff is fed by the losers of a semi-final, so it needs a bracket
    // large enough to have one.
    const playoffAvailable = newBracketTeamCount >= 4;

    const handleAddBracketSubmit = async () => {
        setLoading(true);
        try {
            await tournamentService.createManualBracket(tournamentId, {
                type: newBracketType,
                teamCount: newBracketTeamCount,
                categoryId: selectedCategoryId || undefined,
                includePlacementPlayoff: playoffAvailable && newBracketPlayoff,
                name: newBracketName.trim() || undefined,
            });
            showToast.success(`Created ${newBracketName.trim() || newBracketType} Bracket`);
            setAddBracketOpen(false);
            setNewBracketName('');
            onRefresh();
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || 'Failed to create bracket';
            if (message.includes('already exists')) {
                showToast.error(`A ${newBracketType} bracket already exists for this category. Delete it first.`);
            } else {
                showToast.error(message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSeedFromPools = async () => {
        setLoading(true);
        try {
            await tournamentService.progressPoolsToKnockout(tournamentId);
            showToast.success('Brackets seeded from pool results');
            onRefresh();
        } catch (error: any) {
            showToast.error(error?.response?.data?.message || 'Failed to seed brackets from pool results');
        } finally {
            setLoading(false);
        }
    };

    const handleApplyByes = async () => {
        setLoading(true);
        try {
            const applied = await tournamentService.applyByes(tournamentId);
            showToast.success(applied > 0
                ? `Advanced ${applied} team${applied === 1 ? '' : 's'} on a bye`
                : 'No byes to apply — every match has an opponent or is still waiting on a result');
            onRefresh();
        } catch (error: any) {
            showToast.error(error?.response?.data?.message || 'Failed to apply byes');
        } finally {
            setLoading(false);
        }
    };

    const handleAdvanceWinners = async () => {
        setLoading(true);
        try {
            const progressed = await tournamentService.progressTournament(tournamentId);
            showToast.success(progressed > 0
                ? `Advanced ${progressed} winner${progressed === 1 ? '' : 's'}`
                : 'Nothing to advance — every completed match has already progressed');
            onRefresh();
        } catch (error: any) {
            showToast.error(error?.response?.data?.message || 'Failed to advance winners');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBracket = async () => {
        if (!bracketToDelete) return;
        const bracketId = bracketToDelete;
        setBracketToDelete(null);
        setLoading(true);
        try {
            await tournamentService.deleteManualBracket(tournamentId, bracketId, selectedCategoryId || undefined);
            showToast.success(`Deleted ${bracketId} Bracket`);
            onRefresh();
        } catch (error: any) {
            showToast.error(error?.response?.data?.message || 'Failed to delete bracket');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">Knockout Brackets</h3>
                </div>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="tertiary"
                        onClick={handleSeedFromPools}
                        disabled={loading}
                        title="Rank teams across their pools and fill empty bracket slots. Slots you have already set by hand are left alone."
                    >
                        <ArrowsClockwise className="w-4 h-4 mr-1" /> Seed from Pools
                    </Button>
                    <Button
                        size="sm"
                        variant="tertiary"
                        onClick={handleApplyByes}
                        disabled={loading}
                        title="Advance any team whose match has no opponent and nothing left to feed it. Matches still waiting on an earlier result are left alone."
                    >
                        <SkipForward className="w-4 h-4 mr-1" /> Apply Byes
                    </Button>
                    <Button
                        size="sm"
                        variant="tertiary"
                        onClick={handleAdvanceWinners}
                        disabled={loading}
                        title="Re-run progression for every completed match. Use this if a winner did not move into the next round."
                    >
                        <ArrowFatLineRight className="w-4 h-4 mr-1" /> Advance Winners
                    </Button>
                    <Button size="sm" onClick={() => setAddBracketOpen(true)} disabled={loading}>
                        <Plus className="w-4 h-4 mr-1" /> Add Bracket
                    </Button>
                </div>
            </div>

            <Modal
                isOpen={addBracketOpen}
                onClose={() => setAddBracketOpen(false)}
                title="Add Knockout Bracket"
                size="sm"
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Bracket</Label>
                        <SearchableSelect
                            value={newBracketType}
                            onChange={(value) => setNewBracketType(value as string)}
                            options={MANUAL_BRACKET_TYPES.map(({ type, label, places }) => ({
                                value: type,
                                label: existingBracketTypes.has(type)
                                    ? `${label} — already added`
                                    : `${label} (${places})`,
                            }))}
                            placeholder="Select bracket"
                        />
                        {existingBracketTypes.has(newBracketType) && (
                            <p className="text-xs text-amber-400 flex items-start gap-1.5">
                                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                A {newBracketType} bracket already exists for this category. Delete it first
                                before adding another.
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Teams in this bracket</Label>
                        <SearchableSelect
                            value={String(newBracketTeamCount)}
                            onChange={(value) => setNewBracketTeamCount(Number(value))}
                            options={BRACKET_TEAM_COUNTS.map(count => ({
                                value: String(count),
                                label: `${count} teams`,
                            }))}
                            placeholder="Select size"
                        />
                        <p className="text-xs text-slate-400">
                            Place ranges shown above assume the standard four-team bracket. A larger
                            bracket covers proportionally more places. Sizes that are not a power of
                            two are rounded up, leaving the surplus slots as byes.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Bracket name (optional)</Label>
                        <Input
                            placeholder={defaultBracketLabel}
                            value={newBracketName}
                            onChange={(e) => setNewBracketName(e.target.value)}
                        />
                        <p className="text-xs text-slate-400">
                            Overrides the label on this bracket's rounds. Leave blank to use
                            "{defaultBracketLabel}".
                        </p>
                    </div>

                    <label className={`flex items-start gap-2.5 ${playoffAvailable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                        <input
                            type="checkbox"
                            // Render unticked when unavailable: a ticked-but-disabled box reads as
                            // "this will be created" while the hint says it cannot be.
                            checked={playoffAvailable && newBracketPlayoff}
                            onChange={(e) => setNewBracketPlayoff(e.target.checked)}
                            disabled={!playoffAvailable}
                            className="mt-0.5"
                        />
                        <span className="text-sm">
                            Include placement playoff
                            <span className="block text-xs text-slate-400">
                                {playoffAvailable
                                    ? 'Adds a match for the losers of this bracket\'s semi-finals, like the Cup bracket\'s 3rd Place Playoff.'
                                    : 'Needs at least 4 teams — a bracket this small has no semi-finals.'}
                            </span>
                        </span>
                    </label>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="cancel" onClick={() => setAddBracketOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleAddBracketSubmit}
                            isLoading={loading}
                            disabled={existingBracketTypes.has(newBracketType)}
                        >
                            Add Bracket
                        </Button>
                    </div>
                </div>
            </Modal>

            {bracketGroups.map((bracket) => (
                <GlassCard key={bracket.id} className="border-t-4 border-t-primary transition-all duration-300">
                    <GlassCardHeader className="py-3.5 px-5 border-b border-white/10 flex flex-row items-center justify-between">
                        <GlassCardTitle className="text-base font-bold tracking-tight uppercase flex items-center gap-2">
                            <span>{bracket.title}</span>
                        </GlassCardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setBracketToDelete(bracket.id)}
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
                                                    <span>{match.matchNumber ? `M${match.matchNumber}${match.matchCode ? ` • ${match.matchCode}` : ''}` : (match.matchCode || 'MATCH')}</span>
                                                    <span className="truncate max-w-[100px]">
                                                        {match.matchDate ? match.matchDate.substring(5) : ''} {match.kickOffTime?.substring(0, 5)}
                                                    </span>
                                                </div>

                                                <div className="flex flex-col p-1 space-y-1">
                                                    {/* Home Team */}
                                                    <div className="flex justify-between items-center px-2.5 py-1.5 rounded-lg bg-black/20">
                                                        <span className={`text-xs truncate pr-2 font-medium ${!match.homeTeamName ? 'text-muted-foreground italic' : 'text-foreground'}`}>
                                                            {match.homeTeamName || match.homeTeamPlaceholder || 'EMPTY SPOT'}
                                                        </span>
                                                        <span className="font-mono font-bold text-xs bg-black/40 px-2 py-0.5 rounded text-white min-w-[24px] text-center">
                                                            {match.homeScore ?? '-'}
                                                        </span>
                                                    </div>

                                                    {/* Away Team */}
                                                    <div className="flex justify-between items-center px-2.5 py-1.5 rounded-lg bg-black/20">
                                                        <span className={`text-xs truncate pr-2 font-medium ${!match.awayTeamName ? 'text-muted-foreground italic' : 'text-foreground'}`}>
                                                            {match.awayTeamName || match.awayTeamPlaceholder || 'EMPTY SPOT'}
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

            <ConfirmModal
                isOpen={bracketToDelete !== null}
                onClose={() => setBracketToDelete(null)}
                onConfirm={handleDeleteBracket}
                title="Delete Bracket"
                message={`Delete the entire ${bracketToDelete} bracket? Every match in it will be removed, and any match feeding into it will lose that link. This cannot be undone.`}
                confirmText="Delete Bracket"
                variant="destructive"
            />
        </div>
    );
}
