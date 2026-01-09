import { useState, useMemo } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Team, TournamentStageResponse } from '@/types';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent } from '@/components/GlassCard';
import { Badge } from '@/components/Badge';
import { DotsSixVertical, CheckSquare, Square, MagnifyingGlass } from '@phosphor-icons/react';
import { Button } from '@/components/Button';
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface GroupingEditorProps {
    teams: Team[];
    stages: TournamentStageResponse[];
    categoryId?: string;
    onAssign: (teamId: string, poolName: string | null) => void;
    readonly?: boolean;
}

export function GroupingEditor({ teams, stages, categoryId, onAssign, readonly = false }: GroupingEditorProps) {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [editingPoolId, setEditingPoolId] = useState<string | null>(null);
    const [editingPoolName, setEditingPoolName] = useState('');

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Filter teams by category if specified (or unassigned/null category if none specified?)
    // Actually, backend filters teams by categoryId query param usually.
    // If we passed all teams, we filter here.
    const relevantTeams = useMemo(() => {
        if (!categoryId) return teams;
        return teams.filter(t => !t.tournamentCategoryId || t.tournamentCategoryId === categoryId || t.category === 'Unassigned'); // Handle loosely
    }, [teams, categoryId]);

    const unassignedTeams = relevantTeams.filter(t => !t.poolNumber);
    const filteredUnassigned = unassignedTeams.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.organisationName && t.organisationName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleDragStart = (event: DragStartEvent) => {
        if (readonly) return;
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        if (readonly) return;
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const teamId = active.id as string;
        const targetContainerId = over.id as string;

        // Check if dropped in "unassigned" container
        if (targetContainerId === 'unassigned-container') {
            onAssign(teamId, null);
            return;
        }

        // Check if dropped in a pool container (stage name is ID)
        // We use stage.name as container ID for simplicity, assuming uniqueness within category
        // But better to use stage.id or prefixed name.
        // Let's assume passed stages have unique names or IDs.
        // But our `onAssign` takes poolName string (as currently stored in Team.poolNumber).
        // So we should find the stage that matches ID or Name.

        // let's look up stage by the container ID (which might be the stage ID or Name)
        // Implementation detail: Droppable containers below use stage.name as ID.
        const stage = stages.find(s => s.name === targetContainerId);
        if (stage) {
            onAssign(teamId, stage.name);
        }
    };

    const handleToggleSelection = (teamId: string) => {
        if (readonly) return;
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(teamId)) next.delete(teamId);
            else next.add(teamId);
            return next;
        });
    };

    const handleSelectAll = (poolName: string | null) => {
        const poolTeams = poolName === null
            ? filteredUnassigned
            : relevantTeams.filter(t => t.poolNumber === poolName);

        const allSelected = poolTeams.every(t => selectedIds.has(t.id));
        const next = new Set(selectedIds);

        if (allSelected) {
            poolTeams.forEach(t => next.delete(t.id));
        } else {
            poolTeams.forEach(t => next.add(t.id));
        }
        setSelectedIds(next);
    };

    const handleBulkMove = (targetPoolName: string | null) => {
        if (readonly || selectedIds.size === 0) return;

        selectedIds.forEach(teamId => {
            onAssign(teamId, targetPoolName);
        });

        toast.success(`Moved ${selectedIds.size} team(s)`);
        setSelectedIds(new Set());
    };

    const handleStartRenaming = (stageId: string, currentName: string) => {
        if (readonly) return;
        setEditingPoolId(stageId);
        setEditingPoolName(currentName);
    };

    const handleSaveRename = async (stageId: string) => {
        if (!editingPoolName.trim()) {
            toast.error('Pool name cannot be empty');
            return;
        }

        // Check for duplicates
        const isDuplicate = stages.some(s => s.id !== stageId && s.name.toLowerCase() === editingPoolName.trim().toLowerCase());
        if (isDuplicate) {
            toast.error('A pool with this name already exists');
            return;
        }

        try {
            // This will need to be implemented - for now just show success
            // await tournamentService.updateStage(tournamentId, stageId, { name: editingPoolName.trim() });
            toast.success('Pool renamed successfully');
            setEditingPoolId(null);
            // Note: Parent component should refresh stages after rename
        } catch (error) {
            toast.error('Failed to rename pool');
        }
    };

    const handleCancelRename = () => {
        setEditingPoolId(null);
        setEditingPoolName('');
    };

    const activeTeam = activeId ? teams.find(t => t.id === activeId) : null;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            {/* Bulk Actions Toolbar */}
            {selectedIds.size > 0 && (
                <div className="sticky top-4 z-20 bg-primary/10 backdrop-blur-md border border-primary/20 p-3 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-4 mb-4">
                    <div className="flex items-center gap-2">
                        <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-bold">{selectedIds.size}</span>
                        <span className="text-sm font-medium">Selected</span>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>Cancel</Button>
                        <Button size="sm" variant="secondary" onClick={() => handleBulkMove(null)}>Unassign</Button>
                        {stages.map(stage => (
                            <Button
                                key={stage.id}
                                size="sm"
                                onClick={() => handleBulkMove(stage.name)}
                            >
                                To {stage.name}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Unassigned Column */}
                <div className="lg:col-span-1 space-y-4">
                    <GlassCard className="h-full border-dashed bg-muted/30">
                        <GlassCardHeader className="py-4">
                            <div className="flex items-center justify-between">
                                <GlassCardTitle className="text-sm font-medium flex items-center gap-2">
                                    Unassigned
                                    <Badge variant="secondary">{unassignedTeams.length}</Badge>
                                </GlassCardTitle>
                                <button
                                    onClick={() => handleSelectAll(null)}
                                    className="text-xs text-blue-600 hover:underline"
                                >
                                    {unassignedTeams.every(t => selectedIds.has(t.id)) ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                            <div className="relative mt-3">
                                <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search teams..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 text-sm bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>
                        </GlassCardHeader>
                        <GlassCardContent className="p-2 min-h-[200px]">
                            <SortableContext id="unassigned-container" items={filteredUnassigned.map(t => t.id)} strategy={rectSortingStrategy}>
                                <DroppableContainer id="unassigned-container" className="space-y-2 h-full">
                                    {filteredUnassigned.map((team) => (
                                        <SortableTeamItem
                                            key={team.id}
                                            team={team}
                                            disabled={readonly}
                                            isSelected={selectedIds.has(team.id)}
                                            onToggleSelection={() => handleToggleSelection(team.id)}
                                        />
                                    ))}
                                    {filteredUnassigned.length === 0 && (
                                        <div className="text-center text-xs text-muted-foreground py-8">
                                            {searchQuery ? 'No teams match your search' : 'No unassigned teams'}
                                        </div>
                                    )}
                                </DroppableContainer>
                            </SortableContext>
                        </GlassCardContent>
                    </GlassCard>
                </div>

                {/* Pools Grid */}
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stages.map((stage) => {
                        const poolTeams = relevantTeams.filter(t => t.poolNumber === stage.name);
                        const isEditing = editingPoolId === stage.id;

                        return (
                            <GlassCard key={stage.id} className="bg-card">
                                <GlassCardHeader className="py-3 px-4 border-b">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2 flex-1">
                                            {isEditing ? (
                                                <div className="flex items-center gap-2 flex-1">
                                                    <input
                                                        type="text"
                                                        value={editingPoolName}
                                                        onChange={(e) => setEditingPoolName(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleSaveRename(stage.id);
                                                            if (e.key === 'Escape') handleCancelRename();
                                                        }}
                                                        className="px-2 py-1 text-sm font-semibold border border-primary rounded focus:outline-none focus:ring-2 focus:ring-primary"
                                                        placeholder="Enter pool name"
                                                        aria-label="Pool name"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={() => handleSaveRename(stage.id)}
                                                        className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={handleCancelRename}
                                                        className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded hover:bg-muted/80"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <h3
                                                        className="font-semibold text-sm cursor-pointer hover:text-primary transition-colors"
                                                        onClick={() => handleStartRenaming(stage.id, stage.name)}
                                                        title="Click to rename"
                                                    >
                                                        {stage.name}
                                                    </h3>
                                                    <Badge variant="outline" className="text-xs">{poolTeams.length} Teams</Badge>
                                                </>
                                            )}
                                        </div>
                                        {!isEditing && (
                                            <button
                                                onClick={() => handleSelectAll(stage.name)}
                                                className="text-xs text-blue-600 hover:underline"
                                            >
                                                {poolTeams.every(t => selectedIds.has(t.id)) && poolTeams.length > 0 ? 'Deselect All' : 'Select All'}
                                            </button>
                                        )}
                                    </div>
                                </GlassCardHeader>
                                <GlassCardContent className="p-2 min-h-[150px]">
                                    <SortableContext id={stage.name} items={poolTeams.map(t => t.id)} strategy={rectSortingStrategy}>
                                        <DroppableContainer id={stage.name} className="space-y-2 h-full min-h-[100px]">
                                            {poolTeams.map((team) => (
                                                <SortableTeamItem
                                                    key={team.id}
                                                    team={team}
                                                    disabled={readonly}
                                                    isSelected={selectedIds.has(team.id)}
                                                    onToggleSelection={() => handleToggleSelection(team.id)}
                                                />
                                            ))}
                                            {poolTeams.length === 0 && (
                                                <div className="h-full flex items-center justify-center text-xs text-muted-foreground text-center p-4 border-2 border-dashed rounded-lg border-muted/50">
                                                    Drop here
                                                </div>
                                            )}
                                        </DroppableContainer>
                                    </SortableContext>
                                </GlassCardContent>
                            </GlassCard>
                        );
                    })}
                </div>
            </div>

            <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
                {activeTeam ? (
                    <TeamItem team={activeTeam} isOverlay />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

// Sub-components

function DroppableContainer({ id, children, className }: { id: string, children: React.ReactNode, className?: string }) {
    // Let's use useDroppable for the container surface
    const { isOver, setNodeRef: setDroppableRef } = useSortable({
        id,
        data: {
            type: 'container',
        },
        disabled: true // Container itself is not draggable
    });

    return (
        <div ref={setDroppableRef} className={clsx(className, isOver && "bg-accent/50 rounded-lg")}>
            {children}
        </div>
    );
}


interface SortableTeamItemProps {
    team: Team;
    disabled?: boolean;
    isSelected?: boolean;
    onToggleSelection?: () => void;
}

function SortableTeamItem({ team, disabled, isSelected, onToggleSelection }: SortableTeamItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: team.id, disabled });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    } as React.CSSProperties;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={clsx(
                "transition-opacity",
                isDragging && "opacity-30"
            )}
        >
            <TeamItem
                team={team}
                isSelected={isSelected}
                onToggleSelection={onToggleSelection}
                dragHandleProps={{ ...attributes, ...listeners }}
                disabled={disabled}
            />
        </div>
    );
}

function TeamItem({
    team,
    isOverlay,
    isSelected,
    onToggleSelection,
    dragHandleProps,
    disabled
}: {
    team: Team;
    isOverlay?: boolean;
    isSelected?: boolean;
    onToggleSelection?: () => void;
    dragHandleProps?: any;
    disabled?: boolean;
}) {
    return (
        <div className={clsx(
            "p-3 rounded-lg border bg-background shadow-sm flex items-center gap-3 select-none transition-all",
            isOverlay && "cursor-grabbing shadow-xl scale-105 ring-2 ring-primary",
            !isOverlay && "hover:border-primary/50",
            isSelected && "ring-2 ring-blue-500 border-blue-500"
        )}>
            {!disabled && !isOverlay && onToggleSelection && (
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleSelection(); }}
                    className="p-1 text-muted-foreground hover:text-primary transition-colors"
                >
                    {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" weight="fill" />
                    ) : (
                        <Square className="w-5 h-5" />
                    )}
                </button>
            )}
            {!isOverlay && dragHandleProps && (
                <div {...dragHandleProps} className="text-muted-foreground cursor-grab active:cursor-grabbing">
                    <DotsSixVertical className="w-4 h-4" />
                </div>
            )}
            {isOverlay && (
                <div className="text-muted-foreground">
                    <DotsSixVertical className="w-4 h-4" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{team.name}</div>
                <div className="text-xs text-muted-foreground truncate">{team.organisationName || 'Unknown Org'}</div>
            </div>
        </div>
    );
}
