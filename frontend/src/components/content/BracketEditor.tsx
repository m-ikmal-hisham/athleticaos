import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TournamentStageResponse, MatchResponse, TournamentCategory, Team } from '@/types';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent } from '@/components/GlassCard';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Input } from '@/components/Input';
import { Label } from '@/components/Label';
import { SearchableSelect } from '@/components/SearchableSelect';
import { Trash, PencilSimple, Plus, Info, Trophy, CaretRight, ArrowsClockwise, SkipForward, ArrowFatLineRight, WarningCircle, ArrowsLeftRight } from '@phosphor-icons/react';
import { tournamentService, UnresolvedSlot } from '@/services/tournamentService';
import { getTournamentTeams } from '@/api/tournaments.api';
import { showToast } from '@/lib/customToast';
import { buildBracketGroups, getBracketTypeId, getBracketTitle } from '@/utils/bracketUtils';
import { hasMultipleVenues, formatFeederPlaceholder } from '@/utils/venue';

interface BracketEditorProps {
    tournamentId: string;
    stages: TournamentStageResponse[];
    // MatchResponse, not Match: the flat homeTeamName/awayTeamName fields live on the response.
    matches: MatchResponse[];
    onMatchEdit: (match: MatchResponse) => void;
    onRefresh: () => void;
    selectedCategoryId?: string | null;
    categories?: TournamentCategory[];
    // Read-only viewers (a participating team, an assigned official) see the brackets but no
    // bracket or match actions. The backend refuses those writes anyway (SEC-04).
    readonly?: boolean;
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
    { type: 'THIRD_PLACE', label: '3rd Place Playoff (Cup)', places: '3rd – 4th' },
    { type: 'PLATE', label: 'Plate', places: '5th – 8th' },
    { type: 'BOWL', label: 'Bowl', places: '9th – 12th' },
    { type: 'SHIELD', label: 'Shield', places: '13th – 16th' },
    { type: 'SPOON', label: 'Spoon', places: '17th – 20th' },
    { type: 'FORK', label: 'Fork', places: '21st – 24th' },
    { type: 'SAUCER', label: 'Saucer', places: '25th – 28th' },
    { type: 'CHOPSTICK', label: 'Chopstick', places: '29th – 32nd' },
    { type: 'WOODEN_SPOON', label: 'Wooden Spoon', places: '33rd – 36th' },
    { type: 'WOODEN_FORK', label: 'Wooden Fork', places: '37th – 40th' },
];

const BRACKET_TEAM_COUNTS = [2, 4, 8, 16];

interface StageSlot {
    key: string;
    teamId?: string;
    teamName?: string;
    teamLogoUrl?: string;
    placeholder?: string;
    label: string;
}

function getStageSlots(stageMatches: MatchResponse[]): StageSlot[] {
    const slotsMap = new Map<string, StageSlot>();
    // Creation order (slot 1 v 2, 1 v 3, 2 v 3, ...) so slots read in the order they were set up,
    // whatever order the schedule puts the matches in.
    const inCreationOrder = [...stageMatches].sort((a, b) =>
        (a.createdAt || '').localeCompare(b.createdAt || '')
        || (a.matchCode || '').localeCompare(b.matchCode || '', undefined, { numeric: true }));
    for (const m of inCreationOrder) {
        if (m.homeTeamId) {
            const key = `team:${m.homeTeamId}`;
            if (!slotsMap.has(key)) {
                slotsMap.set(key, {
                    key,
                    teamId: m.homeTeamId,
                    teamName: m.homeTeamName || 'Unknown Team',
                    teamLogoUrl: m.homeTeamLogoUrl,
                    label: m.homeTeamName || 'Unknown Team',
                });
            }
        } else if (m.homeTeamPlaceholder) {
            const key = `ph:${m.homeTeamPlaceholder.trim().toLowerCase()}`;
            if (!slotsMap.has(key)) {
                slotsMap.set(key, {
                    key,
                    placeholder: m.homeTeamPlaceholder,
                    label: m.homeTeamPlaceholder,
                });
            }
        }

        if (m.awayTeamId) {
            const key = `team:${m.awayTeamId}`;
            if (!slotsMap.has(key)) {
                slotsMap.set(key, {
                    key,
                    teamId: m.awayTeamId,
                    teamName: m.awayTeamName || 'Unknown Team',
                    teamLogoUrl: m.awayTeamLogoUrl,
                    label: m.awayTeamName || 'Unknown Team',
                });
            }
        } else if (m.awayTeamPlaceholder) {
            const key = `ph:${m.awayTeamPlaceholder.trim().toLowerCase()}`;
            if (!slotsMap.has(key)) {
                slotsMap.set(key, {
                    key,
                    placeholder: m.awayTeamPlaceholder,
                    label: m.awayTeamPlaceholder,
                });
            }
        }
    }
    return Array.from(slotsMap.values());
}

export function BracketEditor({ tournamentId, stages, matches, onMatchEdit, onRefresh, selectedCategoryId, categories = [], readonly = false }: BracketEditorProps) {
    const { t } = useTranslation('tournament');
    const [loading, setLoading] = useState(false);
    const [teams, setTeams] = useState<Team[]>([]);

    useEffect(() => {
        if (!tournamentId) return;
        getTournamentTeams(tournamentId)
            .then(res => setTeams((res.data as Team[]) || []))
            .catch(() => setTeams([]));
    }, [tournamentId]);
    const [addBracketOpen, setAddBracketOpen] = useState(false);
    const [newBracketType, setNewBracketType] = useState('PLATE');
    const [newBracketTeamCount, setNewBracketTeamCount] = useState(4);
    const [newBracketPlayoff, setNewBracketPlayoff] = useState(true);
    const [newBracketName, setNewBracketName] = useState('');
    const [newBracketCategoryId, setNewBracketCategoryId] = useState<string>('');
    const [assignCategoryBracketId, setAssignCategoryBracketId] = useState<string | null>(null);
    const [selectedAssignCategoryId, setSelectedAssignCategoryId] = useState<string>('');
    const [assigningCategory, setAssigningCategory] = useState(false);
    const [unresolvedSlots, setUnresolvedSlots] = useState<UnresolvedSlot[]>([]);
    const [bracketToDelete, setBracketToDelete] = useState<string | null>(null);
    // Set when the delete is for one category's bracket only (the 3rd place playoff inside Cup).
    const [bracketDeleteCategoryId, setBracketDeleteCategoryId] = useState<string | null>(null);
    const [stageToDelete, setStageToDelete] = useState<{ id: string; name: string } | null>(null);

    // Placement Round Robin States
    const [addPlacementOpen, setAddPlacementOpen] = useState(false);
    const [newPlacementCategoryId, setNewPlacementCategoryId] = useState('');
    const [newPlacementName, setNewPlacementName] = useState('');
    const [newPlacementFirstPlace, setNewPlacementFirstPlace] = useState(13);
    const [newPlacementTeamCount, setNewPlacementTeamCount] = useState(3);
    const [newPlacementSlots, setNewPlacementSlots] = useState<{ type: 'placeholder' | 'team'; placeholder: string; teamId: string }[]>([
        { type: 'placeholder', placeholder: 'Rank 13', teamId: '' },
        { type: 'placeholder', placeholder: 'Rank 14', teamId: '' },
        { type: 'placeholder', placeholder: 'Rank 15', teamId: '' },
    ]);

    const [changeSlotModalOpen, setChangeSlotModalOpen] = useState(false);
    const [changeSlotStage, setChangeSlotStage] = useState<TournamentStageResponse | null>(null);
    const [slotToChange, setSlotToChange] = useState<StageSlot | null>(null);
    const [newSlotTeamId, setNewSlotTeamId] = useState('');

    const [swapSlotsModalOpen, setSwapSlotsModalOpen] = useState(false);
    const [swapSlotsStage, setSwapSlotsStage] = useState<TournamentStageResponse | null>(null);
    const [slotToSwap1, setSlotToSwap1] = useState<StageSlot | null>(null);
    const [slotToSwap2Key, setSlotToSwap2Key] = useState('');

    const [placementStageToDelete, setPlacementStageToDelete] = useState<TournamentStageResponse | null>(null);

    const hasCategories = Boolean(categories && categories.length > 0);
    // Brackets start collapsed. A tournament can run eight or more of them (Cup, Plate, Bowl,
    // Shield, Spoon, Fork, Wooden Spoon...), and each expands to a horizontally scrolling row
    // of rounds, which pushed the match schedule far below the fold. The header carries the
    // round and match counts so a collapsed bracket still says what is in it.
    const [expandedBrackets, setExpandedBrackets] = useState<Set<string>>(new Set());

    const toggleBracket = (bracketId: string) => {
        setExpandedBrackets(prev => {
            const next = new Set(prev);
            if (!next.delete(bracketId)) {
                next.add(bracketId);
            }
            return next;
        });
    };

    // Filter stages by category first if category is selected
    const categoryStages = useMemo(() => {
        const knockoutOnly = stages.filter(s => s.knockoutStage);
        if (!selectedCategoryId) return knockoutOnly;
        return knockoutOnly.filter(s => s.categoryId === selectedCategoryId || !s.categoryId);
    }, [stages, selectedCategoryId]);

    const placementStages = useMemo(() => {
        return stages.filter(s => Boolean(s.roundRobin) && (!selectedCategoryId || s.categoryId === selectedCategoryId || !s.categoryId));
    }, [stages, selectedCategoryId]);

    // Filter matches by category first if category is selected
    const categoryMatches = useMemo(() => {
        if (!selectedCategoryId) return matches;
        return matches.filter(m => m.stage?.categoryId === selectedCategoryId || !m.stage?.categoryId);
    }, [matches, selectedCategoryId]);

    // Check which bracket types already exist for the dialog category
    const existingBracketTypesForDialog = useMemo(() => {
        const catId = hasCategories ? newBracketCategoryId : selectedCategoryId;
        const types = new Set<string>();
        stages
            .filter(s => s.knockoutStage && (!catId || s.categoryId === catId))
            .forEach(stage => {
                types.add(stage.stageType || '');
            });
        return types;
    }, [stages, hasCategories, newBracketCategoryId, selectedCategoryId]);

    // Check if tournament has multiple venues
    const hasMultiVenues = useMemo(() => hasMultipleVenues(matches), [matches]);

    // Shared with BracketView and the public site so all three group a tournament identically.
    // Placement round robins have their own cards below, so their matches stay out of the knockout groups.
    const bracketGroups = useMemo(() => {
        const roundRobinStageIds = new Set(stages.filter(s => s.roundRobin).map(s => s.id));
        const knockoutMatches = categoryMatches.filter(m => !m.stage?.id || !roundRobinStageIds.has(m.stage.id));
        return buildBracketGroups(knockoutMatches, categoryStages);
    }, [categoryMatches, categoryStages, stages]);

    const defaultBracketLabel = MANUAL_BRACKET_TYPES.find(b => b.type === newBracketType)?.label
        || newBracketType;

    // A placement playoff is fed by the losers of a semi-final, so it needs a bracket
    // large enough to have one.
    const playoffAvailable = newBracketType !== 'THIRD_PLACE' && newBracketTeamCount >= 4;

    const handleAddBracketSubmit = async () => {
        setLoading(true);
        try {
            const chosenCategoryId = hasCategories ? (newBracketCategoryId || undefined) : (selectedCategoryId || undefined);
            const isThirdPlace = newBracketType === 'THIRD_PLACE';
            await tournamentService.createManualBracket(tournamentId, {
                type: newBracketType,
                teamCount: isThirdPlace ? 2 : newBracketTeamCount,
                categoryId: chosenCategoryId,
                includePlacementPlayoff: !isThirdPlace && playoffAvailable && newBracketPlayoff,
                name: newBracketName.trim() || undefined,
            });
            showToast.success(`Created ${newBracketName.trim() || defaultBracketLabel} Bracket`);
            setAddBracketOpen(false);
            setNewBracketName('');
            onRefresh();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } }; message?: string };
            const message = err?.response?.data?.message || err?.message || 'Failed to create bracket';
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
            const res = await tournamentService.progressPoolsToKnockout(tournamentId);
            const {
                seededCategories = [],
                skippedCategories = [],
                filledSlots = 0,
                unresolvedSlots: unresolved = [],
            } = res ?? {};

            setUnresolvedSlots(unresolved);

            if (filledSlots > 0) {
                const catLabel = seededCategories.length > 0 ? ` (${seededCategories.join(', ')})` : '';
                showToast.success(`Filled ${filledSlots} slot${filledSlots === 1 ? '' : 's'} from pool results${catLabel}`);
            }
            if (skippedCategories.length > 0) {
                showToast.info(`Not seeded yet, pools still in progress: ${skippedCategories.join('; ')}`);
            }
            if (filledSlots === 0 && unresolved.length === 0) {
                showToast.info('Nothing to fill — all slots already have teams or are fed by other matches.');
            }
            onRefresh();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } }; message?: string };
            showToast.error(err?.response?.data?.message || 'Failed to seed brackets from pool results');
        } finally {
            setLoading(false);
        }
    };

    const handleAssignCategory = async () => {
        if (!assignCategoryBracketId || !selectedAssignCategoryId) return;
        setAssigningCategory(true);
        try {
            const stageIds = new Set<string>();
            stages.forEach(s => {
                if (s.knockoutStage && getBracketTypeId(s.name, s.stageType) === assignCategoryBracketId) {
                    stageIds.add(s.id);
                }
            });
            matches.forEach(m => {
                if (m.stage && getBracketTypeId(m.stage.name, m.stage.stageType) === assignCategoryBracketId) {
                    stageIds.add(m.stage.id);
                }
            });

            await Promise.all(
                Array.from(stageIds).map(stageId =>
                    tournamentService.updateStage(tournamentId, stageId, { categoryId: selectedAssignCategoryId })
                )
            );

            showToast.success('Assigned bracket to category');
            setAssignCategoryBracketId(null);
            setSelectedAssignCategoryId('');
            onRefresh();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } }; message?: string };
            showToast.error(err?.response?.data?.message || 'Failed to assign category to bracket');
        } finally {
            setAssigningCategory(false);
        }
    };

    const openAddBracket = () => {
        const defaultCatId = selectedCategoryId || (categories && categories.length === 1 ? categories[0].id : '');
        setNewBracketCategoryId(defaultCatId);
        setNewBracketType('PLATE');
        setNewBracketTeamCount(4);
        setNewBracketPlayoff(true);
        setNewBracketName('');
        setAddBracketOpen(true);
    };

    const handleApplyByes = async () => {
        setLoading(true);
        try {
            const applied = await tournamentService.applyByes(tournamentId);
            showToast.success(applied > 0
                ? `Advanced ${applied} team${applied === 1 ? '' : 's'} on a bye`
                : 'No byes to apply — every match has an opponent or is still waiting on a result');
            onRefresh();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } }; message?: string };
            showToast.error(err?.response?.data?.message || 'Failed to apply byes');
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
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } }; message?: string };
            showToast.error(err?.response?.data?.message || 'Failed to advance winners');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBracket = async () => {
        if (!bracketToDelete) return;
        const bracketId = bracketToDelete;
        const categoryId = bracketDeleteCategoryId || selectedCategoryId || undefined;
        setBracketToDelete(null);
        setBracketDeleteCategoryId(null);
        setLoading(true);
        try {
            await tournamentService.deleteManualBracket(tournamentId, bracketId, categoryId);
            showToast.success(bracketId === 'THIRD_PLACE' ? 'Removed the 3rd Place Playoff' : `Deleted ${bracketId} Bracket`);
            onRefresh();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } }; message?: string };
            showToast.error(err?.response?.data?.message || 'Failed to delete bracket');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteStage = async () => {
        if (!stageToDelete) return;
        const target = stageToDelete;
        setStageToDelete(null);
        setLoading(true);
        try {
            await tournamentService.deleteStage(tournamentId, target.id);
            showToast.success(`Stage '${target.name}' removed`);
            onRefresh();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } }; message?: string };
            showToast.error(err?.response?.data?.message || 'Failed to remove stage');
        } finally {
            setLoading(false);
        }
    };

    // "13th to 15th place"; the name only follows first place / team count until the organiser edits it.
    const ordinalPlace = (n: number) => {
        const tens = n % 100;
        const suffix = tens >= 11 && tens <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] || 'th';
        return `${n}${suffix}`;
    };
    const placementAutoName = (first: number, count: number) =>
        `${ordinalPlace(first)} to ${ordinalPlace(first + count - 1)} place`;

    const openAddPlacement = () => {
        const defaultCatId = selectedCategoryId || (categories && categories.length === 1 ? categories[0].id : '');
        setNewPlacementCategoryId(defaultCatId);
        setNewPlacementFirstPlace(13);
        setNewPlacementTeamCount(3);
        setNewPlacementName(placementAutoName(13, 3));
        setNewPlacementSlots([
            { type: 'placeholder', placeholder: 'Rank 13', teamId: '' },
            { type: 'placeholder', placeholder: 'Rank 14', teamId: '' },
            { type: 'placeholder', placeholder: 'Rank 15', teamId: '' },
        ]);
        setAddPlacementOpen(true);
    };

    const handlePlacementTeamCountChange = (count: number) => {
        setNewPlacementTeamCount(count);
        setNewPlacementName(prev => prev === placementAutoName(newPlacementFirstPlace, newPlacementTeamCount)
            ? placementAutoName(newPlacementFirstPlace, count)
            : prev);
        setNewPlacementSlots(prev => {
            const next = [...prev];
            while (next.length < count) {
                const idx = next.length;
                next.push({ type: 'placeholder', placeholder: `Rank ${newPlacementFirstPlace + idx}`, teamId: '' });
            }
            return next.slice(0, count);
        });
    };

    const handlePlacementFirstPlaceChange = (first: number) => {
        setNewPlacementFirstPlace(first);
        setNewPlacementName(prev => prev === placementAutoName(newPlacementFirstPlace, newPlacementTeamCount)
            ? placementAutoName(first, newPlacementTeamCount)
            : prev);
        setNewPlacementSlots(prev => {
            return prev.map((s, idx) => ({
                ...s,
                placeholder: s.placeholder.startsWith('Rank ') ? `Rank ${first + idx}` : s.placeholder,
            }));
        });
    };

    const handleAddPlacementSubmit = async () => {
        if (!newPlacementName.trim()) {
            showToast.error('Please enter a stage name');
            return;
        }
        setLoading(true);
        try {
            const chosenCategoryId = hasCategories ? (newPlacementCategoryId || undefined) : (selectedCategoryId || undefined);
            const slotsPayload = newPlacementSlots.slice(0, newPlacementTeamCount).map((s, idx) => {
                if (s.type === 'team' && s.teamId) {
                    return { teamId: s.teamId };
                }
                return { placeholder: s.placeholder.trim() || `Rank ${newPlacementFirstPlace + idx}` };
            });

            await tournamentService.createPlacementRoundRobin(tournamentId, {
                name: newPlacementName.trim(),
                categoryId: chosenCategoryId,
                firstPlace: Number(newPlacementFirstPlace),
                teamCount: Number(newPlacementTeamCount),
                slots: slotsPayload,
            });

            showToast.success(`Created ${newPlacementName.trim()}`);
            setAddPlacementOpen(false);
            onRefresh();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } }; message?: string };
            showToast.error(err?.response?.data?.message || 'Failed to create placement round robin');
        } finally {
            setLoading(false);
        }
    };

    const handleChangeSlotSubmit = async () => {
        if (!changeSlotStage || !slotToChange || !newSlotTeamId) return;
        setLoading(true);
        try {
            await tournamentService.changePlacementRoundRobinSlot(
                tournamentId,
                changeSlotStage.id,
                {
                    oldTeamId: slotToChange.teamId,
                    oldPlaceholder: slotToChange.placeholder,
                    newTeamId: newSlotTeamId,
                }
            );
            showToast.success('Updated team assignment');
            setSlotToChange(null);
            setChangeSlotStage(null);
            setNewSlotTeamId('');
            setChangeSlotModalOpen(false);
            onRefresh();
        } catch (error: unknown) {
            const err = error as { response?: { status?: number; data?: { message?: string } }; message?: string };
            const msg = err?.response?.data?.message || err?.message || 'Failed to update team assignment';
            showToast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleSwapSlotsSubmit = async () => {
        if (!swapSlotsStage || !slotToSwap1 || !slotToSwap2Key) return;
        const stageMatches = matches.filter(m => m.stage?.id === swapSlotsStage.id);
        const slots = getStageSlots(stageMatches);
        const slot2 = slots.find(s => s.key === slotToSwap2Key);
        if (!slot2) return;

        setLoading(true);
        try {
            await tournamentService.swapPlacementRoundRobinSlots(
                tournamentId,
                swapSlotsStage.id,
                {
                    teamId1: slotToSwap1.teamId,
                    placeholder1: slotToSwap1.placeholder,
                    teamId2: slot2.teamId,
                    placeholder2: slot2.placeholder,
                }
            );
            showToast.success('Swapped slot assignments');
            setSlotToSwap1(null);
            setSwapSlotsStage(null);
            setSlotToSwap2Key('');
            setSwapSlotsModalOpen(false);
            onRefresh();
        } catch (error: unknown) {
            const err = error as { response?: { status?: number; data?: { message?: string } }; message?: string };
            const msg = err?.response?.data?.message || err?.message || 'Failed to swap slot assignments';
            showToast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePlacementStage = async () => {
        if (!placementStageToDelete) return;
        const target = placementStageToDelete;
        setPlacementStageToDelete(null);
        setLoading(true);
        try {
            await tournamentService.deletePlacementRoundRobinBracket(tournamentId, target.id);
            showToast.success(`Stage '${target.name}' deleted`);
            onRefresh();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } }; message?: string };
            showToast.error(err?.response?.data?.message || 'Failed to delete placement round robin');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Title on its own line and actions that wrap: in one row, five buttons pushed the
                title into two lines and ran past the card on phones. */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 shrink-0">
                    <Trophy className="w-5 h-5 text-primary" />
                    <h3 className="text-base md:text-lg font-bold text-white uppercase tracking-wider whitespace-nowrap">Knockout Brackets</h3>
                </div>
                <div className="flex flex-wrap gap-2 [&>button]:whitespace-nowrap">
                    {bracketGroups.length > 0 && (
                        <Button
                            size="sm"
                            variant="tertiary"
                            onClick={() => setExpandedBrackets(
                                expandedBrackets.size === bracketGroups.length
                                    ? new Set()
                                    : new Set(bracketGroups.map(b => b.id))
                            )}
                            title={expandedBrackets.size === bracketGroups.length
                                ? 'Collapse every bracket'
                                : 'Expand every bracket'}
                        >
                            <CaretRight
                                className={`w-4 h-4 mr-1 transition-transform duration-200 ${expandedBrackets.size === bracketGroups.length ? 'rotate-90' : ''}`}
                                aria-hidden="true"
 />
                            {expandedBrackets.size === bracketGroups.length ? 'Collapse all' : 'Expand all'}
                        </Button>
                    )}
                    {!readonly && (<>
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
                    <Button size="sm" onClick={openAddBracket} disabled={loading}>
                        <Plus className="w-4 h-4 mr-1" /> Add Bracket
                    </Button>
                    <Button size="sm" variant="secondary" onClick={openAddPlacement} disabled={loading}>
                        <Plus className="w-4 h-4 mr-1" /> {t('bracket.addPlacementRoundRobin', 'Add placement round robin')}
                    </Button>
                    </>)}
                </div>
            </div>

            {!readonly && unresolvedSlots.length > 0 && (
                <div className="p-4 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <WarningCircle className="w-5 h-5 text-[var(--accent-text)] shrink-0" />
                            <span className="text-sm font-semibold text-white">
                                {unresolvedSlots.length} Unresolved Knockout {unresolvedSlots.length === 1 ? 'Slot' : 'Slots'}
                            </span>
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setUnresolvedSlots([])}
                            className="text-xs h-7 px-2 text-muted-foreground hover:text-white"
                        >
                            Dismiss
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        The following knockout slots hold placeholders that could not be matched to a completed pool standing:
                    </p>
                    <div className="space-y-2">
                        {unresolvedSlots.map((slot, idx) => {
                            const targetMatch = matches.find(m => m.id === slot.matchId);
                            const sideLabel = slot.side === 'HOME' ? 'Home' : 'Away';
                            const matchLabel = slot.matchNumber ? `Match ${slot.matchNumber}` : (slot.stageName || 'Match');
                            return (
                                <div
                                    key={`${slot.matchId}-${slot.side}-${idx}`}
                                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-black/20 border border-white/5 text-xs"
                                >
                                    <span className="text-white/90">
                                        <span className="font-semibold text-white">{matchLabel}</span> — {sideLabel}: &lsquo;<span className="text-[var(--accent-text)] font-mono">{slot.label}</span>&rsquo; could not be matched to a group position
                                    </span>
                                    {targetMatch && (
                                        <Button
                                            size="sm"
                                            variant="tertiary"
                                            onClick={() => onMatchEdit(targetMatch)}
                                            className="h-7 px-2.5 text-xs shrink-0"
                                        >
                                            <PencilSimple className="w-3.5 h-3.5 mr-1" /> Edit
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <Modal
                isOpen={addBracketOpen}
                onClose={() => setAddBracketOpen(false)}
                title="Add Knockout Bracket"
                size="sm"
            >
                <div className="space-y-4">
                    {hasCategories && (
                        <div className="space-y-2">
                            <Label>Category <span className="text-[var(--accent-text)]">*</span></Label>
                            <SearchableSelect
                                value={newBracketCategoryId}
                                onChange={(value) => setNewBracketCategoryId(value as string)}
                                options={categories.map(c => ({
                                    value: c.id,
                                    label: c.name,
                                }))}
                                placeholder="Select category"
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Bracket</Label>
                        <SearchableSelect
                            value={newBracketType}
                            onChange={(value) => {
                                const val = value as string;
                                setNewBracketType(val);
                                if (val === 'THIRD_PLACE') {
                                    setNewBracketTeamCount(2);
                                    setNewBracketPlayoff(false);
                                }
                            }}
                            options={MANUAL_BRACKET_TYPES.map(({ type, label, places }) => ({
                                value: type,
                                label: existingBracketTypesForDialog.has(type)
                                    ? `${label} — already added`
                                    : `${label} (${places})`,
                            }))}
                            placeholder="Select bracket"
                        />
                        {existingBracketTypesForDialog.has(newBracketType) && (
                            <p className="text-xs text-amber-400 flex items-start gap-1.5">
                                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                A {newBracketType} bracket already exists for this category. Delete it first
                                before adding another.
                            </p>
                        )}
                    </div>

                    {newBracketType !== 'THIRD_PLACE' ? (
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
                    ) : (
                        <div className="space-y-1">
                            <Label>Teams in this bracket</Label>
                            <p className="text-xs text-muted-foreground">
                                Fixed at 2 teams (contested by the two Cup Semi-Final losers).
                            </p>
                        </div>
                    )}

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

                    {newBracketType !== 'THIRD_PLACE' && (
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
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="cancel" onClick={() => setAddBracketOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleAddBracketSubmit}
                            isLoading={loading}
                            disabled={existingBracketTypesForDialog.has(newBracketType) || (hasCategories && !newBracketCategoryId)}
                        >
                            Add Bracket
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={assignCategoryBracketId !== null}
                onClose={() => {
                    setAssignCategoryBracketId(null);
                    setSelectedAssignCategoryId('');
                }}
                title={`Assign Category to ${assignCategoryBracketId ? getBracketTitle(assignCategoryBracketId) : 'Bracket'}`}
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                        This bracket is not assigned to a category and is currently hidden on the public site. Select a category to assign to every stage and match in this bracket.
                    </p>
                    <div className="space-y-2">
                        <Label>Category <span className="text-[var(--accent-text)]">*</span></Label>
                        <SearchableSelect
                            value={selectedAssignCategoryId}
                            onChange={(val) => setSelectedAssignCategoryId(val as string)}
                            options={categories.map(c => ({
                                value: c.id,
                                label: c.name,
                            }))}
                            placeholder="Select category"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="cancel"
                            onClick={() => {
                                setAssignCategoryBracketId(null);
                                setSelectedAssignCategoryId('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleAssignCategory}
                            isLoading={assigningCategory}
                            disabled={!selectedAssignCategoryId}
                        >
                            Assign Category
                        </Button>
                    </div>
                </div>
            </Modal>

            {bracketGroups.map((bracket) => {
                const isExpanded = expandedBrackets.has(bracket.id);
                const matchCount = bracket.rounds.reduce((total, round) => total + round.matches.length, 0);
                const isUnassigned = hasCategories && (
                    stages.some(s => s.knockoutStage && getBracketTypeId(s.name, s.stageType) === bracket.id && !s.categoryId) ||
                    bracket.rounds.some(r => r.matches.some(m => !m.stage?.categoryId))
                );

                return (
                <GlassCard key={bracket.id} className="border-t-4 border-t-primary transition-all duration-300">
                    <GlassCardHeader
                        className={`py-3 px-3 md:py-3.5 md:px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${isExpanded ? 'border-b border-white/10' : ''}`}
                    >
                        <div className="flex items-center justify-between w-full sm:w-auto flex-1 min-w-0 gap-2">
                            <button
                                type="button"
                                onClick={() => toggleBracket(bracket.id)}
                                aria-expanded={isExpanded}
                                aria-controls={`bracket-panel-${bracket.id}`}
                                className="flex items-center gap-2 min-w-0 flex-1 text-left rounded-lg -m-1 p-1 hover:bg-white/5 transition-colors"
                            >
                                <CaretRight
                                    className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                                    aria-hidden="true"
                                />
                                <span className="min-w-0 flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
                                    <GlassCardTitle className="text-sm md:text-base font-bold tracking-tight uppercase truncate">
                                        {bracket.title}
                                    </GlassCardTitle>
                                    <span className="text-xs font-normal normal-case text-muted-foreground whitespace-nowrap">
                                        {bracket.rounds.length} {bracket.rounds.length === 1 ? 'round' : 'rounds'}
                                        {' · '}
                                        {matchCount} {matchCount === 1 ? 'match' : 'matches'}
                                    </span>
                                </span>
                            </button>
                            {!readonly && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setBracketToDelete(bracket.id)}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 px-2 shrink-0 sm:hidden"
                                    aria-label="Delete bracket"
                                >
                                    <Trash className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto">
                            {!readonly && isUnassigned && (
                                <div className="flex flex-wrap items-center justify-between gap-2 w-full sm:w-auto">
                                    <span className="text-xs font-semibold text-[var(--accent-text)]">
                                        Not assigned to a category — hidden on the public site
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="tertiary"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setAssignCategoryBracketId(bracket.id);
                                            setSelectedAssignCategoryId(selectedCategoryId || (categories.length === 1 ? categories[0].id : ''));
                                        }}
                                        className="h-7 px-2 text-xs text-[var(--accent-text)] border-[var(--accent)]/30 hover:bg-[var(--accent)]/10"
                                    >
                                        Assign category
                                    </Button>
                                </div>
                            )}
                            {!readonly && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setBracketToDelete(bracket.id)}
                                    className="hidden sm:inline-flex text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 px-2 shrink-0"
                                    aria-label="Delete bracket"
                                >
                                    <Trash className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Delete Bracket</span>
                                </Button>
                            )}
                        </div>
                    </GlassCardHeader>
                    <GlassCardContent
                        id={`bracket-panel-${bracket.id}`}
                        hidden={!isExpanded}
                        className="p-3 md:p-6 overflow-x-auto"
                    >
                        <div className="flex gap-4 md:gap-8 min-w-max pb-2">
                            {bracket.rounds.map((round, roundIdx) => (
                                <div key={round.id || round.name} className="w-64 md:w-72 shrink-0 flex flex-col">
                                    <div className="text-xs font-black uppercase tracking-wider text-primary mb-4 text-center pb-2 border-b border-white/10 flex items-center justify-center gap-1.5">
                                        <span>{round.name}</span>
                                        {roundIdx < bracket.rounds.length - 1 && (
                                            <CaretRight className="w-4 h-4 opacity-50" />
                                        )}
                                        {/* The 3rd place playoff sits inside Cup, so it gets its own remove action
                                            (Delete Bracket on Cup would remove the whole Cup). */}
                                        {!readonly && round.stageType === 'THIRD_PLACE' && (
                                            <button
                                                type="button"
                                                aria-label="Remove 3rd Place Playoff"
                                                title="Remove 3rd Place Playoff"
                                                disabled={loading}
                                                onClick={() => {
                                                    setBracketDeleteCategoryId(round.matches[0]?.stage?.categoryId || null);
                                                    setBracketToDelete('THIRD_PLACE');
                                                }}
                                                className="ml-1 p-1 rounded text-black/60 dark:text-white/60 hover:text-crimson dark:hover:text-crimson-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy"
                                            >
                                                <Trash className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-4 flex-1 justify-around">
                                        {round.matches.map((match) => (
                                            <div
                                                key={match.id}
                                                className="bg-background/60 border border-white/10 rounded-xl overflow-hidden relative group hover:border-primary/60 transition-all shadow-md"
                                            >
                                                {/* Admin edit button: hover-reveal on desktop; phones get a full-width row below the teams */}
                                                {!readonly && (
                                                <div className="hidden md:block absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-10">
                                                    <button
                                                        onClick={() => onMatchEdit(match)}
                                                        className="p-1.5 bg-primary/30 hover:bg-primary text-white rounded-lg backdrop-blur-md transition-colors"
                                                        title="Edit Match"
                                                        aria-label="Edit Match"
                                                    >
                                                        <PencilSimple className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                )}

                                                <div className="text-[10px] text-muted-foreground/80 px-3 py-1 bg-black/40 border-b border-white/5 uppercase tracking-wider flex justify-between font-mono">
                                                    {/* Bracket cards are narrow: show the number and venue, and keep the long generated code in the tooltip. */}
                                                    <span
                                                        className="truncate"
                                                        title={[match.matchNumber ? `Match ${match.matchNumber}` : null, match.venue?.trim() || null, match.matchCode || null].filter(Boolean).join(' • ')}
                                                    >
                                                        {match.matchNumber
                                                            ? `M${match.matchNumber}${hasMultiVenues ? ` · ${match.venue?.trim() || 'Venue TBC'}` : ''}`
                                                            : (match.matchCode || 'MATCH')}
                                                    </span>
                                                    <span className="truncate max-w-[100px]">
                                                        {match.matchDate ? match.matchDate.substring(5) : ''} {match.kickOffTime?.substring(0, 5)}
                                                    </span>
                                                </div>

                                                <div className="flex flex-col p-1 space-y-1">
                                                    {/* Home Team */}
                                                    <div className="flex justify-between items-center px-2.5 py-1.5 rounded-lg bg-black/20">
                                                        <span className={`text-xs truncate pr-2 font-medium ${!match.homeTeamName ? 'text-muted-foreground italic' : 'text-foreground'}`}>
                                                            {match.homeTeamName || formatFeederPlaceholder(match.homeTeamPlaceholder, match.venue, matches, match.homeFromWinnerOfMatchId || match.homeFromLoserOfMatchId) || 'EMPTY SPOT'}
                                                        </span>
                                                        <span className="font-mono font-bold text-xs bg-black/40 px-2 py-0.5 rounded text-white min-w-[24px] text-center">
                                                            {match.homeScore ?? '-'}
                                                        </span>
                                                    </div>

                                                    {/* Away Team */}
                                                    <div className="flex justify-between items-center px-2.5 py-1.5 rounded-lg bg-black/20">
                                                        <span className={`text-xs truncate pr-2 font-medium ${!match.awayTeamName ? 'text-muted-foreground italic' : 'text-foreground'}`}>
                                                            {match.awayTeamName || formatFeederPlaceholder(match.awayTeamPlaceholder, match.venue, matches, match.awayFromWinnerOfMatchId || match.awayFromLoserOfMatchId) || 'EMPTY SPOT'}
                                                        </span>
                                                        <span className="font-mono font-bold text-xs bg-black/40 px-2 py-0.5 rounded text-white min-w-[24px] text-center">
                                                            {match.awayScore ?? '-'}
                                                        </span>
                                                    </div>
                                                </div>
                                                {!readonly && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onMatchEdit(match)}
                                                        className="md:hidden w-full min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-primary/30 hover:bg-primary border-t border-white/10 transition-colors"
                                                    >
                                                        <PencilSimple className="w-4 h-4" aria-hidden="true" /> Edit match
                                                    </button>
                                                )}
                                            </div>
                                        ))}

                                        {round.matches.length === 0 && (
                                            <div className="text-xs text-center text-muted-foreground italic py-8 border border-dashed border-white/10 rounded-xl space-y-2">
                                                <p>No matches defined for this stage</p>
                                                {!readonly && round.id && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setStageToDelete({ id: round.id, name: round.name })}
                                                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-7 px-2 text-xs"
                                                    >
                                                        <Trash className="w-3.5 h-3.5 mr-1" /> Remove empty stage
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCardContent>
                </GlassCard>
                );
            })}

            {placementStages.map((stage) => {
                const stageMatches = categoryMatches.filter(m => m.stage?.id === stage.id);
                const slots = getStageSlots(stageMatches);
                const hasPlayedMatches = stageMatches.some(m => m.status === 'COMPLETED' || m.homeScore != null || m.awayScore != null);
                const isExpanded = expandedBrackets.has(stage.id);

                return (
                    <GlassCard key={stage.id} className="border-t-4 border-t-emerald-500 transition-all duration-300">
                        <GlassCardHeader
                            className={`py-3 px-3 md:py-3.5 md:px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${isExpanded ? 'border-b border-white/10' : ''}`}
                        >
                            <div className="flex items-center justify-between w-full sm:w-auto flex-1 min-w-0 gap-2">
                                <button
                                    type="button"
                                    onClick={() => toggleBracket(stage.id)}
                                    aria-expanded={isExpanded}
                                    aria-controls={`placement-panel-${stage.id}`}
                                    className="flex items-center gap-2 min-w-0 flex-1 text-left rounded-lg -m-1 p-1 hover:bg-white/5 transition-colors"
                                >
                                    <CaretRight
                                        className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                                        aria-hidden="true"
                                    />
                                    <span className="min-w-0 flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
                                        <GlassCardTitle className="text-sm md:text-base font-bold tracking-tight uppercase truncate">
                                            {stage.name}
                                        </GlassCardTitle>
                                        <span className="text-xs font-normal normal-case text-muted-foreground whitespace-nowrap">
                                            {t('bracket.placementRoundRobin')} · {stage.firstPlace ? `${stage.firstPlace}th – ${stage.firstPlace + slots.length - 1}th` : ''} · {stageMatches.length} {stageMatches.length === 1 ? 'match' : 'matches'}
                                        </span>
                                    </span>
                                </button>
                                {!readonly && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setPlacementStageToDelete(stage)}
                                        disabled={hasPlayedMatches}
                                        title={hasPlayedMatches ? t('bracket.matchesPlayedWarning') : t('bracket.deletePlacementRoundRobin')}
                                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 px-2 shrink-0 sm:hidden"
                                        aria-label={t('bracket.deletePlacementRoundRobin')}
                                    >
                                        <Trash className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                            {!readonly && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPlacementStageToDelete(stage)}
                                    disabled={hasPlayedMatches}
                                    title={hasPlayedMatches ? t('bracket.matchesPlayedWarning') : t('bracket.deletePlacementRoundRobin')}
                                    className="hidden sm:inline-flex text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 px-2 shrink-0"
                                >
                                    <Trash className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">{t('bracket.deletePlacementRoundRobin')}</span>
                                </Button>
                            )}
                        </GlassCardHeader>
                        <GlassCardContent
                            id={`placement-panel-${stage.id}`}
                            hidden={!isExpanded}
                            className="p-3 md:p-6 space-y-6"
                        >
                            {/* Slots Management */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-primary">
                                        {t('bracket.slotSources')} ({slots.length})
                                    </h4>
                                    {hasPlayedMatches && (
                                        <span className="text-xs text-amber-400 font-medium">
                                            {t('bracket.matchesPlayedWarning')}
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {slots.map((slot, sIdx) => (
                                        <div
                                            key={slot.key}
                                            className="p-3 rounded-xl bg-black/20 border border-white/10 flex flex-col justify-between gap-2.5"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-mono text-muted-foreground">
                                                    {t('bracket.slot', { number: sIdx + 1 })}
                                                </span>
                                                {slot.teamId ? (
                                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                        Team
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                                        Placeholder
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2.5">
                                                {slot.teamLogoUrl && (
                                                    <img src={slot.teamLogoUrl} alt="" className="w-6 h-6 object-contain shrink-0" />
                                                )}
                                                <span className="text-sm font-bold text-white truncate">
                                                    {slot.label}
                                                </span>
                                            </div>
                                            {!readonly && (
                                                <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                                                    <Button
                                                        size="sm"
                                                        variant="tertiary"
                                                        disabled={loading || hasPlayedMatches}
                                                        onClick={() => {
                                                            setChangeSlotStage(stage);
                                                            setSlotToChange(slot);
                                                            setNewSlotTeamId('');
                                                            setChangeSlotModalOpen(true);
                                                        }}
                                                        className="flex-1 h-7 text-xs"
                                                        title={hasPlayedMatches ? t('bracket.matchesPlayedWarning') : t('bracket.changeTeam')}
                                                    >
                                                        <PencilSimple className="w-3.5 h-3.5 mr-1" /> {t('bracket.changeTeam')}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="tertiary"
                                                        disabled={loading || hasPlayedMatches || slots.length < 2}
                                                        onClick={() => {
                                                            setSwapSlotsStage(stage);
                                                            setSlotToSwap1(slot);
                                                            setSlotToSwap2Key('');
                                                            setSwapSlotsModalOpen(true);
                                                        }}
                                                        className="flex-1 h-7 text-xs"
                                                        title={hasPlayedMatches ? t('bracket.matchesPlayedWarning') : t('bracket.swapTeam')}
                                                    >
                                                        <ArrowsLeftRight className="w-3.5 h-3.5 mr-1" /> {t('bracket.swapTeam')}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Fixtures / Matches */}
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-wider text-primary mb-3">
                                    {t('bracket.fixtures')} ({stageMatches.length})
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {stageMatches.map((match) => (
                                        <div
                                            key={match.id}
                                            className="bg-background/60 border border-white/10 rounded-xl overflow-hidden relative group hover:border-primary/60 transition-all shadow-md"
                                        >
                                            {!readonly && (
                                                <div className="hidden md:block absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-10">
                                                    <button
                                                        onClick={() => onMatchEdit(match)}
                                                        className="p-1.5 bg-primary/30 hover:bg-primary text-white rounded-lg backdrop-blur-md transition-colors"
                                                        title="Edit Match"
                                                        aria-label="Edit Match"
                                                    >
                                                        <PencilSimple className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                            <div className="text-[10px] text-muted-foreground/80 px-3 py-1 bg-black/40 border-b border-white/5 uppercase tracking-wider flex justify-between font-mono">
                                                <span className="truncate">
                                                    {match.matchNumber ? `M${match.matchNumber}` : (match.matchCode || 'MATCH')}
                                                </span>
                                                <span className="truncate">
                                                    {match.matchDate ? match.matchDate.substring(5) : ''} {match.kickOffTime?.substring(0, 5)}
                                                </span>
                                            </div>
                                            <div className="flex flex-col p-1 space-y-1">
                                                <div className="flex justify-between items-center px-2.5 py-1.5 rounded-lg bg-black/20">
                                                    <span className={`text-xs truncate pr-2 font-medium ${!match.homeTeamName ? 'text-muted-foreground italic' : 'text-foreground'}`}>
                                                        {match.homeTeamName || match.homeTeamPlaceholder || 'TBD'}
                                                    </span>
                                                    <span className="font-mono font-bold text-xs bg-black/40 px-2 py-0.5 rounded text-white min-w-[24px] text-center">
                                                        {match.homeScore ?? '-'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center px-2.5 py-1.5 rounded-lg bg-black/20">
                                                    <span className={`text-xs truncate pr-2 font-medium ${!match.awayTeamName ? 'text-muted-foreground italic' : 'text-foreground'}`}>
                                                        {match.awayTeamName || match.awayTeamPlaceholder || 'TBD'}
                                                    </span>
                                                    <span className="font-mono font-bold text-xs bg-black/40 px-2 py-0.5 rounded text-white min-w-[24px] text-center">
                                                        {match.awayScore ?? '-'}
                                                    </span>
                                                </div>
                                            </div>
                                            {!readonly && (
                                                <button
                                                    type="button"
                                                    onClick={() => onMatchEdit(match)}
                                                    className="md:hidden w-full min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-primary/30 hover:bg-primary border-t border-white/10 transition-colors"
                                                >
                                                    <PencilSimple className="w-4 h-4" aria-hidden="true" /> Edit match
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </GlassCardContent>
                    </GlassCard>
                );
            })}

            {bracketGroups.length === 0 && placementStages.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-2xl text-muted-foreground">
                    <p>No knockout or placement brackets configured.</p>
                    <p className="text-sm mt-1">Generate matches or add a custom bracket above.</p>
                </div>
            )}

            <Modal
                isOpen={addPlacementOpen}
                onClose={() => setAddPlacementOpen(false)}
                title={t('bracket.addPlacementRoundRobin')}
                size="md"
            >
                <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                    {hasCategories && (
                        <div className="space-y-2">
                            <Label>Category <span className="text-[var(--accent-text)]">*</span></Label>
                            <SearchableSelect
                                value={newPlacementCategoryId}
                                onChange={(value) => setNewPlacementCategoryId(value as string)}
                                options={categories.map(c => ({
                                    value: c.id,
                                    label: c.name,
                                }))}
                                placeholder="Select category"
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Stage Name <span className="text-[var(--accent-text)]">*</span></Label>
                        <Input
                            value={newPlacementName}
                            onChange={(e) => setNewPlacementName(e.target.value)}
                            placeholder="e.g. 13th to 15th place"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('bracket.firstPlaceLabel')}</Label>
                            <Input
                                type="number"
                                min={1}
                                max={99}
                                value={newPlacementFirstPlace}
                                onChange={(e) => handlePlacementFirstPlaceChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            />
                            <p className="text-xs text-muted-foreground">
                                {t('bracket.firstPlaceHint')}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('bracket.teamCount')}</Label>
                            <SearchableSelect
                                value={String(newPlacementTeamCount)}
                                onChange={(val) => handlePlacementTeamCountChange(Number(val))}
                                options={[3, 4, 5, 6].map(n => ({
                                    value: String(n),
                                    label: `${n} teams`,
                                }))}
                            />
                        </div>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-white/10">
                        <Label className="text-xs uppercase font-bold text-primary tracking-wider">
                            {t('bracket.slotSources')}
                        </Label>
                        {newPlacementSlots.slice(0, newPlacementTeamCount).map((slot, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-black/20 border border-white/5 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-white">
                                        {t('bracket.slot', { number: idx + 1 })}
                                    </span>
                                    <div className="flex items-center gap-3 text-xs">
                                        <label className="flex items-center gap-1 cursor-pointer">
                                            <input
                                                type="radio"
                                                name={`slot-type-${idx}`}
                                                checked={slot.type === 'placeholder'}
                                                onChange={() => {
                                                    setNewPlacementSlots(prev => {
                                                        const copy = [...prev];
                                                        copy[idx] = { ...copy[idx], type: 'placeholder', teamId: '' };
                                                        return copy;
                                                    });
                                                }}
                                            />
                                            <span>{t('bracket.rankSource')}</span>
                                        </label>
                                        <label className="flex items-center gap-1 cursor-pointer">
                                            <input
                                                type="radio"
                                                name={`slot-type-${idx}`}
                                                checked={slot.type === 'team'}
                                                onChange={() => {
                                                    setNewPlacementSlots(prev => {
                                                        const copy = [...prev];
                                                        copy[idx] = { ...copy[idx], type: 'team' };
                                                        return copy;
                                                    });
                                                }}
                                            />
                                            <span>{t('bracket.manualTeamSource')}</span>
                                        </label>
                                    </div>
                                </div>
                                {slot.type === 'placeholder' ? (
                                    <Input
                                        value={slot.placeholder}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setNewPlacementSlots(prev => {
                                                const copy = [...prev];
                                                copy[idx] = { ...copy[idx], placeholder: val };
                                                return copy;
                                            });
                                        }}
                                        placeholder={`Rank ${newPlacementFirstPlace + idx}`}
                                    />
                                ) : (
                                    <SearchableSelect
                                        value={slot.teamId}
                                        onChange={(val) => {
                                            setNewPlacementSlots(prev => {
                                                const copy = [...prev];
                                                copy[idx] = { ...copy[idx], teamId: val as string };
                                                return copy;
                                            });
                                        }}
                                        options={teams
                                            .filter(t => !newPlacementCategoryId || !t.tournamentCategoryId || t.tournamentCategoryId === newPlacementCategoryId)
                                            .map(t => ({
                                                value: t.id,
                                                label: t.name,
                                            }))}
                                        placeholder="Select team"
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                        <Button type="button" variant="cancel" onClick={() => setAddPlacementOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleAddPlacementSubmit}
                            isLoading={loading}
                            disabled={!newPlacementName.trim() || (hasCategories && !newPlacementCategoryId)}
                        >
                            Add Round Robin
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={changeSlotModalOpen}
                onClose={() => {
                    setChangeSlotModalOpen(false);
                    setSlotToChange(null);
                    setChangeSlotStage(null);
                    setNewSlotTeamId('');
                }}
                title={t('bracket.changeTeam')}
                size="sm"
            >
                <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-black/20 border border-white/10 space-y-1">
                        <span className="text-xs text-muted-foreground">Current Assignment</span>
                        <p className="text-sm font-bold text-white">{slotToChange?.label}</p>
                    </div>

                    <div className="space-y-2">
                        <Label>{t('bracket.selectNewTeam')} <span className="text-[var(--accent-text)]">*</span></Label>
                        <SearchableSelect
                            value={newSlotTeamId}
                            onChange={(val) => setNewSlotTeamId(val as string)}
                            options={teams
                                .filter(t => !changeSlotStage?.categoryId || !t.tournamentCategoryId || t.tournamentCategoryId === changeSlotStage.categoryId)
                                .map(t => ({
                                    value: t.id,
                                    label: t.name,
                                }))}
                            placeholder="Select team"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="cancel"
                            onClick={() => {
                                setChangeSlotModalOpen(false);
                                setSlotToChange(null);
                                setChangeSlotStage(null);
                                setNewSlotTeamId('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleChangeSlotSubmit}
                            isLoading={loading}
                            disabled={!newSlotTeamId}
                        >
                            Confirm
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={swapSlotsModalOpen}
                onClose={() => {
                    setSwapSlotsModalOpen(false);
                    setSlotToSwap1(null);
                    setSwapSlotsStage(null);
                    setSlotToSwap2Key('');
                }}
                title={t('bracket.swapTeam')}
                size="sm"
            >
                <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-black/20 border border-white/10 space-y-1">
                        <span className="text-xs text-muted-foreground">Selected Slot</span>
                        <p className="text-sm font-bold text-white">{slotToSwap1?.label}</p>
                    </div>

                    <div className="space-y-2">
                        <Label>{t('bracket.selectSlotToSwap')} <span className="text-[var(--accent-text)]">*</span></Label>
                        <SearchableSelect
                            value={slotToSwap2Key}
                            onChange={(val) => setSlotToSwap2Key(val as string)}
                            options={(() => {
                                if (!swapSlotsStage) return [];
                                const stageMatches = matches.filter(m => m.stage?.id === swapSlotsStage.id);
                                return getStageSlots(stageMatches)
                                    .filter(s => s.key !== slotToSwap1?.key)
                                    .map(s => ({
                                        value: s.key,
                                        label: s.label,
                                    }));
                            })()}
                            placeholder={t('bracket.selectSlotToSwap')}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="cancel"
                            onClick={() => {
                                setSwapSlotsModalOpen(false);
                                setSlotToSwap1(null);
                                setSwapSlotsStage(null);
                                setSlotToSwap2Key('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSwapSlotsSubmit}
                            isLoading={loading}
                            disabled={!slotToSwap2Key}
                        >
                            Confirm
                        </Button>
                    </div>
                </div>
            </Modal>

            <ConfirmModal
                isOpen={placementStageToDelete !== null}
                onClose={() => setPlacementStageToDelete(null)}
                onConfirm={handleDeletePlacementStage}
                title={t('bracket.deletePlacementRoundRobin')}
                message={t('bracket.deletePlacementRoundRobinConfirm')}
                confirmText="Delete"
                variant="destructive"
            />

            <ConfirmModal
                isOpen={bracketToDelete !== null}
                onClose={() => { setBracketToDelete(null); setBracketDeleteCategoryId(null); }}
                onConfirm={handleDeleteBracket}
                title={bracketToDelete === 'THIRD_PLACE' ? 'Remove 3rd Place Playoff' : 'Delete Bracket'}
                message={bracketToDelete === 'THIRD_PLACE'
                    ? 'Remove the 3rd Place Playoff? Its match will be deleted and the semi-finals will no longer send their losers to it. This cannot be undone.'
                    : `Delete the entire ${bracketToDelete} bracket? Every match in it will be removed, and any match feeding into it will lose that link. This cannot be undone.`}
                confirmText={bracketToDelete === 'THIRD_PLACE' ? 'Remove' : 'Delete Bracket'}
                variant="destructive"
            />

            <ConfirmModal
                isOpen={stageToDelete !== null}
                onClose={() => setStageToDelete(null)}
                onConfirm={handleDeleteStage}
                title="Remove empty stage"
                message={`Remove '${stageToDelete?.name}'? This cannot be undone.`}
                confirmText="Remove"
                variant="destructive"
            />
        </div>
    );
}
