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
import { showToast } from '@/lib/customToast';

interface Props {
    matchId: string;
    teamId: string;
    homeTeamId: string; // Added to distinguish between home and away hints
    isLocked?: boolean;
    maxStarters?: number;
    maxBench?: number;
    onLineupUpdate?: () => void;
}

// Icons
import {
    ArrowRight,
    ArrowLeft,
    X,
    CheckSquare,
    Square
} from '@phosphor-icons/react';

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

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

        } catch (err: any) {
            console.error(err);
            showToast.error("Failed to load lineups");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateNumber = (playerId: string, newNumber: number) => {
        // Validate duplicates in Starters and Bench
        const allActive = [...items[LineupRole.STARTER], ...items[LineupRole.BENCH]];
        const isDuplicate = allActive.some(p => p.playerId !== playerId && p.jerseyNumber === newNumber);

        if (isDuplicate) {
            showToast.error(`Jersey number ${newNumber} is already taken!`);
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
                showToast.error(`Too many starters! Max ${maxStarters}.`);
                setSaving(false);
                return;
            }

            await matchLineupService.updateLineup(matchId, teamId, entries);
            showToast.success("Lineups saved successfully");
            if (onLineupUpdate) {
                onLineupUpdate();
            }
        } catch (err: any) {
            console.error(err);
            showToast.error(err.response?.data?.message || "Failed to save lineups");
        } finally {
            setSaving(false);
        }
    };

    // --- New Interaction Handlers ---

    const handleToggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAll = (role: LineupRole) => {
        const allInRole = items[role];
        const allSelected = allInRole.every(i => selectedIds.has(i.playerId));

        const next = new Set(selectedIds);
        if (allSelected) {
            allInRole.forEach(i => next.delete(i.playerId));
        } else {
            // Check limits if trying to select too many? No, selection strictly doesn't enforce limit, movement does.
            // But maybe visual feedback?
            allInRole.forEach(i => next.add(i.playerId));
            if (role === LineupRole.STARTER || role === LineupRole.BENCH) {
                // select max? No.
            }
        }
        setSelectedIds(next);
        if (!allSelected) {
            showToast.success(`Selected ${allInRole.length} players`);
        }
    };

    const handleMove = (playerId: string, targetRole: LineupRole) => {
        // Find current role
        let currentRole: LineupRole | undefined;
        let currentItem: MatchLineupEntry | undefined;

        for (const role of Object.keys(items) as LineupRole[]) {
            const found = items[role].find(i => i.playerId === playerId);
            if (found) {
                currentRole = role;
                currentItem = found;
                break;
            }
        }

        if (!currentRole || !currentItem) return;
        if (currentRole === targetRole) return;

        // Check limits
        if (targetRole === LineupRole.STARTER && items[LineupRole.STARTER].length >= maxStarters) {
            showToast.error(`Starters limit reached (${maxStarters})`);
            return;
        }
        if (targetRole === LineupRole.BENCH && items[LineupRole.BENCH].length >= maxBench) {
            showToast.error(`Bench limit reached (${maxBench})`);
            return;
        }

        setItems(prev => ({
            ...prev,
            [currentRole!]: prev[currentRole!].filter(i => i.playerId !== playerId),
            [targetRole]: [...prev[targetRole], currentItem!]
        }));

        // Clear selection if moved
        if (selectedIds.has(playerId)) {
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(playerId);
                return next;
            });
        }
    };

    const handleBulkMove = (targetRole: LineupRole) => {
        const selectedPlayers: { role: LineupRole, item: MatchLineupEntry }[] = [];

        // Gather selected items
        for (const role of Object.keys(items) as LineupRole[]) {
            items[role].forEach(item => {
                if (selectedIds.has(item.playerId)) {
                    selectedPlayers.push({ role, item });
                }
            });
        }

        if (selectedPlayers.length === 0) return;

        // Validate limits
        const addingCount = selectedPlayers.filter(p => p.role !== targetRole).length;
        if (targetRole === LineupRole.STARTER && items[LineupRole.STARTER].length + addingCount > maxStarters) {
            showToast.error(`Cannot add ${addingCount} players. Starters limit (${maxStarters}) will be exceeded.`);
            return;
        }
        if (targetRole === LineupRole.BENCH && items[LineupRole.BENCH].length + addingCount > maxBench) {
            showToast.error(`Cannot add ${addingCount} players. Bench limit (${maxBench}) will be exceeded.`);
            return;
        }

        setItems(prev => {
            const next = { ...prev };
            selectedPlayers.forEach(({ role, item }) => {
                if (role !== targetRole) {
                    next[role] = next[role].filter(i => i.playerId !== item.playerId);
                    next[targetRole] = [...next[targetRole], item];
                }
            });
            return next;
        });

        setSelectedIds(new Set());
        showToast.success(`Moved ${selectedPlayers.length} players`);
    };

    if (loading) return <div>Loading roster...</div>;

    const renderSortableItem = (item: MatchLineupEntry, currentRole: LineupRole) => {
        return (
            <SortableItem
                key={item.playerId}
                id={item.playerId}
                item={item}
                isLocked={isLocked}
                currentRole={currentRole}
                isSelected={selectedIds.has(item.playerId)}
                onToggleSelection={() => handleToggleSelection(item.playerId)}
                onMove={handleMove}
                index={currentRole === LineupRole.STARTER ? items[LineupRole.STARTER].indexOf(item) + 1 : undefined}
                onUpdateNumber={handleUpdateNumber} // Only passed if needed (logic inside SortableItem can handle it)
            />
        );
    };

    const filteredSquad = items[LineupRole.NOT_SELECTED].filter(p =>
        p.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.jerseyNumber && p.jerseyNumber.toString().includes(searchQuery)) ||
        (p.positionDisplay && p.positionDisplay.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const selectionCount = selectedIds.size;

    return (
        <div className="space-y-4">
            {/* Bulk Actions Toolbar */}
            {selectionCount > 0 && (
                <div className="sticky top-4 z-10 bg-primary/10 backdrop-blur-md border border-primary/20 p-3 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center gap-2">
                        <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-bold">{selectionCount}</span>
                        <span className="text-sm font-medium">Selected</span>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>Cancel</Button>
                        <Button size="sm" variant="secondary" onClick={() => handleBulkMove(LineupRole.NOT_SELECTED)}>Remove</Button>
                        <Button size="sm" variant="secondary" onClick={() => handleBulkMove(LineupRole.BENCH)}>To Bench</Button>
                        <Button size="sm" onClick={() => handleBulkMove(LineupRole.STARTER)}>To Starters</Button>
                    </div>
                </div>
            )}
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

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800/50 p-2 rounded-md border border-slate-200 dark:border-slate-700/50">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Actions:</span>
                <div className="flex items-center gap-1.5">
                    <div className="p-0.5 bg-slate-200 dark:bg-slate-700 rounded text-blue-600"><ArrowRight className="w-3 h-3" /></div>
                    <span>To Starters</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="p-0.5 bg-slate-200 dark:bg-slate-700 rounded text-slate-500"><ArrowRight className="w-3 h-3 rotate-45" /></div>
                    <span>To Bench</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="p-0.5 bg-slate-200 dark:bg-slate-700 rounded text-green-600"><ArrowLeft className="w-3 h-3" /></div>
                    <span>Promote</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="p-0.5 bg-slate-200 dark:bg-slate-700 rounded text-red-500"><X className="w-3 h-3" /></div>
                    <span>Remove</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-blue-600" weight="fill" />
                    <span>Select Multiple</span>
                </div>
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
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Squad</h3>
                                <button
                                    onClick={() => handleSelectAll(LineupRole.NOT_SELECTED)}
                                    className="text-xs text-blue-600 hover:underline"
                                >
                                    {items[LineupRole.NOT_SELECTED].every(i => selectedIds.has(i.playerId)) ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
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
                                {filteredSquad.map(item => renderSortableItem(item, LineupRole.NOT_SELECTED))}
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
                                {items[LineupRole.STARTER].map((item) => renderSortableItem(item, LineupRole.STARTER))}
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
                                {items[LineupRole.BENCH].map((item) => renderSortableItem(item, LineupRole.BENCH))}
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

function SortableItem({
    id,
    item,
    index,
    isLocked,
    currentRole,
    isSelected,
    onToggleSelection,
    onMove,
    onUpdateNumber
}: {
    id: string,
    item: MatchLineupEntry,
    index?: number,
    isLocked?: boolean,
    currentRole?: LineupRole,
    isSelected?: boolean,
    onToggleSelection?: () => void,
    onMove?: (id: string, target: LineupRole) => void,
    onUpdateNumber?: (id: string, num: number) => void
}) {
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

    const isStarter = currentRole === LineupRole.STARTER;
    const isBench = currentRole === LineupRole.BENCH;

    return (
        <div
            ref={setNodeRef}
            {...{ style }}
            className={`
                flex items-center gap-2 p-2 rounded-lg border bg-card hover:border-primary/50 transition-colors group
                ${isStarter ? 'border-l-4 border-l-blue-500' : ''}
                ${isLocked ? 'opacity-70 cursor-not-allowed' : ''}
                ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''}
            `}
        >
            {!isLocked && (
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleSelection?.(); }}
                        className="p-1 text-slate-400 hover:text-blue-500"
                    >
                        {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" weight="fill" />
                        ) : (
                            <Square className="w-5 h-5" />
                        )}
                    </button>
                    <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground">
                        <DotsSixVertical className="w-4 h-4" />
                    </div>
                </div>
            )}

            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0 ${isStarter || onUpdateNumber ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                {onUpdateNumber && !isLocked && (isStarter || isBench) ? (
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

            {/* Quick Actions */}
            {!isLocked && onMove && (
                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {currentRole === LineupRole.NOT_SELECTED && (
                        <>
                            <button
                                onClick={() => onMove(id, LineupRole.STARTER)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-blue-600 tooltip"
                                title="Add to Starters"
                            >
                                <ArrowRight className="w-4 h-4" />
                                <span className="sr-only">To Starters</span>
                            </button>
                            <button
                                onClick={() => onMove(id, LineupRole.BENCH)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 tooltip"
                                title="Add to Bench"
                            >
                                <ArrowRight className="w-4 h-4 rotate-45" />
                                <span className="sr-only">To Bench</span>
                            </button>
                        </>
                    )}
                    {currentRole === LineupRole.STARTER && (
                        <>
                            <button
                                onClick={() => onMove(id, LineupRole.BENCH)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500"
                                title="Move to Bench"
                            >
                                <ArrowRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => onMove(id, LineupRole.NOT_SELECTED)}
                                className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500"
                                title="Remove from Lineup"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </>
                    )}
                    {currentRole === LineupRole.BENCH && (
                        <>
                            <button
                                onClick={() => onMove(id, LineupRole.STARTER)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-green-600"
                                title="Promote to Starter"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => onMove(id, LineupRole.NOT_SELECTED)}
                                className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500"
                                title="Remove from Lineup"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
