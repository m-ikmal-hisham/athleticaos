import { useState, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { matchLineupService } from '@/services/matchLineupService';
import { MatchLineupEntry, LineupRole } from '@/types';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { GripVertical, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
    matchId: string;
    teamId: string;
    homeTeamId: string; // Added to distinguish between home and away hints
    isLocked?: boolean;
    maxStarters?: number;
    maxBench?: number;
}

export function MatchLineupEditor({ matchId, teamId, homeTeamId, isLocked = false, maxStarters = 15, maxBench = 8 }: Props) {
    const [items, setItems] = useState<{
        [key in LineupRole]: MatchLineupEntry[];
    }>({
        [LineupRole.STARTER]: [],
        [LineupRole.BENCH]: [],
        [LineupRole.NOT_SELECTED]: [], // Using RESERVE logic for available pool
        [LineupRole.RESERVE]: []
    });

    const [activeId, setActiveId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        loadBones();
    }, [matchId, teamId]);

    const loadBones = async () => {
        setLoading(true);
        try {
            // Fetch existing lineup
            const lineup = await matchLineupService.getLineup(matchId, teamId);

            // Also fetch hints later if we want "Available squad" that aren't in lineup yet.
            // For now, let's assume getLineup returns comprehensive list or we fetch squad separately?
            // Usually we need "Available Players"
            // The service `getLineup` returns `MatchLineupEntryDTO` from `match_lineups`.
            // If empty, we need to fetch 'eligible players' from Team Roster.
            // But `matchLineupService.getLineup` only gets what is saved.
            // I should use `tournamentService.getTeams` or something to get roster?
            // Actually `rosterService.getEligiblePlayers(matchId)` would be best.
            // But for now, let's just use what we have. If empty, maybe show empty state or fetch roster.
            // Wait, existing impl `getLineup` fetches `MatchLineup`.
            // I need a way to get "Unselected Players".
            // I'll update `matchLineupService` or `MatchLineupController` to merge with roster or have separate endpoint.
            // For MVP, if lineup is empty, maybe I can use `hints` endpoint?

            // Let's assume we implement a `getAvailableSquad` or similar.
            // Or use `getLineupHints` which I saw in controller.

            const hints = await matchLineupService.getHints(matchId);
            // hints contains `availablePlayers` (PlayerDTO).
            // I need to merge these.

            // Sort into containers
            const starters: MatchLineupEntry[] = [];
            const bench: MatchLineupEntry[] = [];
            const reserve: MatchLineupEntry[] = []; // Not selected

            // Map existing lineup
            const existingIds = new Set(lineup.map(l => l.playerId));

            lineup.forEach(l => {
                if (l.role === LineupRole.STARTER || l.isStarter) starters.push({ ...l, role: LineupRole.STARTER });
                else if (l.role === LineupRole.BENCH) bench.push({ ...l, role: LineupRole.BENCH });
                else reserve.push(l);
            });

            // Add remaining from hints as reserve
            // Select the correct list based on teamId
            // If the current teamId matches homeTeamId, use homeTeamPlayers, else use awayTeamPlayers
            const availablePlayers = (teamId === homeTeamId)
                ? (hints?.homeTeamPlayers || [])
                : (hints?.awayTeamPlayers || []);

            if (availablePlayers.length > 0) {
                availablePlayers.forEach((p: any) => {
                    if (!existingIds.has(p.playerId)) {
                        reserve.push({
                            playerId: p.playerId,
                            playerName: p.playerName,
                            isCaptain: false,
                            role: LineupRole.NOT_SELECTED,
                            orderIndex: 999
                        });
                    }
                });
            }

            // Sort by orderIndex
            starters.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
            bench.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

            setItems({
                [LineupRole.STARTER]: starters,
                [LineupRole.BENCH]: bench,
                [LineupRole.NOT_SELECTED]: reserve,
                [LineupRole.RESERVE]: []
            });

        } catch (err) {
            console.error(err);
            toast.error("Failed to load lineups");
        } finally {
            setLoading(false);
        }
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        // Find containers
        const activeContainer = findContainer(active.id as string);
        const overContainer = findContainer(over.id as string) || (over.id in items ? over.id : null);

        if (!activeContainer || !overContainer || activeContainer === overContainer) {
            return;
        }

        setItems(prev => {
            const activeItems = prev[activeContainer as LineupRole];
            const overItems = prev[overContainer as LineupRole];
            const activeIndex = activeItems.findIndex(i => i.playerId === active.id);
            const overIndex = overItems.findIndex(i => i.playerId === over.id);

            let newIndex;
            if (over.id in items) {
                newIndex = overItems.length + 1;
            } else {
                const isBelowOverItem =
                    over &&
                    active.rect.current.translated &&
                    active.rect.current.translated.top > over.rect.top + over.rect.height;

                const modifier = isBelowOverItem ? 1 : 0;
                newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
            }

            return {
                ...prev,
                [activeContainer]: [
                    ...prev[activeContainer as LineupRole].filter(item => item.playerId !== active.id)
                ],
                [overContainer]: [
                    ...prev[overContainer as LineupRole].slice(0, newIndex),
                    activeItems[activeIndex],
                    ...prev[overContainer as LineupRole].slice(newIndex, prev[overContainer as LineupRole].length),
                ],
            };
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) {
            setActiveId(null);
            return;
        }
        const activeContainer = findContainer(active.id as string);
        const overContainer = findContainer(over.id as string) || (over.id in items ? over.id : null);

        if (activeContainer && overContainer && activeContainer === overContainer) {
            const activeIndex = items[activeContainer as LineupRole].findIndex(i => i.playerId === active.id);
            const overIndex = items[overContainer as LineupRole].findIndex(i => i.playerId === over.id);

            if (activeIndex !== overIndex) {
                setItems((items) => ({
                    ...items,
                    [activeContainer]: arrayMove(items[activeContainer as LineupRole], activeIndex, overIndex),
                }));
            }
        }

        setActiveId(null);
    };

    const findContainer = (id: string) => {
        if (id in items) return id;
        return Object.keys(items).find(key =>
            items[key as LineupRole].find(item => item.playerId === id)
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Prepare update request
            const entries = [
                ...items[LineupRole.STARTER].map((p, idx) => ({ ...p, role: LineupRole.STARTER, orderIndex: idx, isStarter: true })),
                ...items[LineupRole.BENCH].map((p, idx) => ({ ...p, role: LineupRole.BENCH, orderIndex: idx, isStarter: false })),
                // We don't save NOT_SELECTED usually, dependent on if we want to explicitly remove them from DB if previously selected.
                // updateLineup replaces all. So anyone NOT in this list is deleted.
                // So correct.
            ];

            // Client side validation check
            if (items[LineupRole.STARTER].length > maxStarters) {
                toast.error(`Too many starters! Max ${maxStarters}.`);
                setSaving(false);
                return;
            }

            await matchLineupService.updateLineup(matchId, teamId, entries);
            toast.success("Lineups saved successfully");
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to save lineups");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading roster...</div>;

    const renderSortableItem = (item: MatchLineupEntry) => {
        return <SortableItem key={item.playerId} id={item.playerId} item={item} isLocked={isLocked} />;
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                    Starters: <span className={items.STARTER.length === maxStarters ? 'text-green-600 font-bold' : items.STARTER.length > maxStarters ? 'text-red-600 font-bold' : ''}>{items.STARTER.length}/{maxStarters}</span> |
                    Bench: {items.BENCH.length}/{maxBench}
                </div>
                {!isLocked && (
                    <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
                        {saving ? 'Saving...' : 'Save Lineups'}
                    </Button>
                )}
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Available Pool */}
                    <Card className="p-4 bg-slate-50 dark:bg-slate-900/50">
                        <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Squad</h3>
                        <SortableContext
                            id={LineupRole.NOT_SELECTED}
                            items={items[LineupRole.NOT_SELECTED].map(i => i.playerId)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-2 min-h-[200px]">
                                {items[LineupRole.NOT_SELECTED].map(renderSortableItem)}
                            </div>
                        </SortableContext>
                    </Card>

                    {/* Starters */}
                    <Card className="p-4 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/10">
                        <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-blue-600 dark:text-blue-400">Starters</h3>
                        <SortableContext
                            id={LineupRole.STARTER}
                            items={items[LineupRole.STARTER].map(i => i.playerId)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-2 min-h-[200px]">
                                {items[LineupRole.STARTER].map((item, index) => (
                                    <SortableItem
                                        key={item.playerId}
                                        id={item.playerId}
                                        item={item}
                                        index={index + 1}
                                        isStarter
                                        isLocked={isLocked}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </Card>

                    {/* Bench */}
                    <Card className="p-4 bg-slate-50 dark:bg-slate-900/50">
                        <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Bench</h3>
                        <SortableContext
                            id={LineupRole.BENCH}
                            items={items[LineupRole.BENCH].map(i => i.playerId)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-2 min-h-[200px]">
                                {items[LineupRole.BENCH].map((item, index) => (
                                    <SortableItem
                                        key={item.playerId}
                                        id={item.playerId}
                                        item={item}
                                        index={index + 16}
                                        isLocked={isLocked}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </Card>
                </div>

                <DragOverlay>
                    {activeId ? (
                        <div className="bg-background p-3 rounded-lg shadow-xl border flex items-center gap-3">
                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                            <UserIcon className="w-8 h-8 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500" />
                            <span className="font-medium">Dragging...</span>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}

function SortableItem({ id, item, index, isStarter, isLocked }: { id: string, item: MatchLineupEntry, index?: number, isStarter?: boolean, isLocked?: boolean }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id, disabled: isLocked });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`
                flex items-center gap-3 p-2 rounded-lg border bg-card hover:border-primary/50 transition-colors
                ${isStarter ? 'border-l-4 border-l-blue-500' : ''}
                ${isLocked ? 'opacity-70 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}
            `}
        >
            {!isLocked && <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />}

            <div className="flex items-center justify-center w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0">
                {isStarter ? index : item.jerseyNumber || '-'}
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.playerName}</p>
                {item.positionDisplay && <p className="text-xs text-muted-foreground truncate">{item.positionDisplay}</p>}
            </div>

            {item.isCaptain && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-yellow-100 text-yellow-700 rounded border border-yellow-200 uppercase">
                    C
                </span>
            )}
        </div>
    );
}
