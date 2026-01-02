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
    useDroppable,
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
import { GlassCard } from '@/components/GlassCard';
import { DotsSixVertical, User as UserIcon } from '@phosphor-icons/react';
import toast from 'react-hot-toast';

interface Props {
    matchId: string;
    teamId: string;
    homeTeamId: string; // Added to distinguish between home and away hints
    isLocked?: boolean;
    maxStarters?: number;
    maxBench?: number;
    onLineupUpdate?: () => void;
}

export function MatchLineupEditor({ matchId, teamId, homeTeamId, isLocked = false, maxStarters = 15, maxBench = 8, onLineupUpdate }: Props) {
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

    const [searchQuery, setSearchQuery] = useState('');

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
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

            const hints = await matchLineupService.getHints(matchId);

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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                availablePlayers.forEach((p: any) => {
                    if (!existingIds.has(p.playerId)) {
                        reserve.push({
                            playerId: p.playerId,
                            playerName: p.playerName,
                            isCaptain: false,
                            role: LineupRole.NOT_SELECTED,
                            orderIndex: 999,
                            jerseyNumber: p.playerNumber ? parseInt(p.playerNumber) : undefined,
                            positionDisplay: p.position
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

    const handleUpdateNumber = (playerId: string, newNumber: number) => {
        // Validate duplicates in Starters and Bench
        const allActive = [...items[LineupRole.STARTER], ...items[LineupRole.BENCH]];
        const isDuplicate = allActive.some(p => p.playerId !== playerId && p.jerseyNumber === newNumber);

        if (isDuplicate) {
            toast.error(`Jersey number ${newNumber} is already taken!`);
            return;
        }

        setItems(prev => {
            const updateList = (list: MatchLineupEntry[]) => list.map(p => p.playerId === playerId ? { ...p, jerseyNumber: newNumber } : p);
            return {
                ...prev,
                [LineupRole.STARTER]: updateList(prev[LineupRole.STARTER]),
                [LineupRole.BENCH]: updateList(prev[LineupRole.BENCH]),
                [LineupRole.NOT_SELECTED]: updateList(prev[LineupRole.NOT_SELECTED]) // Allow updating in pool too if needed
            };
        });
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
            if (onLineupUpdate) {
                onLineupUpdate();
            }
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

    const filteredSquad = items[LineupRole.NOT_SELECTED].filter(p =>
        p.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.jerseyNumber && p.jerseyNumber.toString().includes(searchQuery)) ||
        (p.positionDisplay && p.positionDisplay.toLowerCase().includes(searchQuery.toLowerCase()))
    );

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
                    <GlassCard className="p-4 bg-slate-50 dark:bg-slate-900/50">
                        <div className="flex flex-col gap-3 mb-4">
                            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Squad</h3>
                            <div className="relative">
                                <UserIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search squad..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                        <SortableContext
                            id={LineupRole.NOT_SELECTED}
                            items={filteredSquad.map(i => i.playerId)}
                            strategy={verticalListSortingStrategy}
                        >
                            <DroppableContainer id={LineupRole.NOT_SELECTED} className="space-y-2 min-h-[200px]">
                                {filteredSquad.map(renderSortableItem)}
                            </DroppableContainer>
                        </SortableContext>
                    </GlassCard>

                    {/* Starters */}
                    <GlassCard className="p-4 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/10">
                        <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-blue-600 dark:text-blue-400">Starters</h3>
                        <SortableContext
                            id={LineupRole.STARTER}
                            items={items[LineupRole.STARTER].map(i => i.playerId)}
                            strategy={verticalListSortingStrategy}
                        >
                            <DroppableContainer id={LineupRole.STARTER} className="space-y-2 min-h-[200px]">
                                {items[LineupRole.STARTER].map((item, index) => (
                                    <SortableItem
                                        key={item.playerId}
                                        id={item.playerId}
                                        item={item}
                                        index={index + 1}
                                        isStarter
                                        isLocked={isLocked}
                                        onUpdateNumber={handleUpdateNumber}
                                    />
                                ))}
                            </DroppableContainer>
                        </SortableContext>
                    </GlassCard>

                    {/* Bench */}
                    <GlassCard className="p-4 bg-slate-50 dark:bg-slate-900/50">
                        <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Bench</h3>
                        <SortableContext
                            id={LineupRole.BENCH}
                            items={items[LineupRole.BENCH].map(i => i.playerId)}
                            strategy={verticalListSortingStrategy}
                        >
                            <DroppableContainer id={LineupRole.BENCH} className="space-y-2 min-h-[200px]">
                                {items[LineupRole.BENCH].map((item, index) => (
                                    <SortableItem
                                        key={item.playerId}
                                        id={item.playerId}
                                        item={item}
                                        index={index + 16}
                                        isLocked={isLocked}
                                        onUpdateNumber={handleUpdateNumber}
                                    />
                                ))}
                            </DroppableContainer>
                        </SortableContext>
                    </GlassCard>
                </div>

                <DragOverlay>
                    {activeId ? (
                        <div className="bg-background p-3 rounded-lg shadow-xl border flex items-center gap-3">
                            <DotsSixVertical className="w-4 h-4 text-muted-foreground" />
                            <UserIcon className="w-8 h-8 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500" />
                            <span className="font-medium">Dragging...</span>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}

function DroppableContainer({ id, children, className }: { id: string, children: React.ReactNode, className?: string }) {
    const { setNodeRef } = useDroppable({ id });
    return (
        <div ref={setNodeRef} className={className}>
            {children}
        </div>
    );
}

function SortableItem({ id, item, index, isStarter, isLocked, onUpdateNumber }: { id: string, item: MatchLineupEntry, index?: number, isStarter?: boolean, isLocked?: boolean, onUpdateNumber?: (id: string, num: number) => void }) {
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

    // Handler for number change
    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!onUpdateNumber) return;
        const val = parseInt(e.target.value);
        if (!isNaN(val)) {
            onUpdateNumber(id, val);
        }
    };

    return (
        <div
            ref={setNodeRef}
            {...{ style }}
            className={`
                flex items-center gap-3 p-2 rounded-lg border bg-card hover:border-primary/50 transition-colors
                ${isStarter ? 'border-l-4 border-l-blue-500' : ''}
                ${isLocked ? 'opacity-70 cursor-not-allowed' : ''}
            `}
        >
            {!isLocked && (
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-foreground">
                    <DotsSixVertical className="w-4 h-4" />
                </div>
            )}

            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0 ${isStarter || onUpdateNumber ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                {onUpdateNumber && !isLocked ? (
                    <input
                        type="number"
                        value={item.jerseyNumber || ''}
                        onChange={handleNumberChange}
                        className="w-full h-full text-center bg-transparent border-none focus:ring-2 focus:ring-blue-500 rounded-full appearance-none p-0"
                        onKeyDown={(e) => e.stopPropagation()} // Prevent drag trigger on input
                        onPointerDown={(e) => e.stopPropagation()} // Prevent drag trigger
                        placeholder="#"
                    />
                ) : (
                    <span>{item.jerseyNumber || (isStarter ? index : '-')}</span>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{item.playerName}</p>
                    {isStarter && (
                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                            #{index}
                        </span>
                    )}
                </div>
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
