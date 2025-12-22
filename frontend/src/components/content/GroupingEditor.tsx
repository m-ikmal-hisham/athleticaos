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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { GripVertical } from 'lucide-react';
import clsx from 'clsx';

interface GroupingEditorProps {
    teams: Team[];
    stages: TournamentStageResponse[];
    categoryId?: string;
    onAssign: (teamId: string, poolName: string | null) => void;
    readonly?: boolean;
}

export function GroupingEditor({ teams, stages, categoryId, onAssign, readonly = false }: GroupingEditorProps) {
    const [activeId, setActiveId] = useState<string | null>(null);

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

    const activeTeam = activeId ? teams.find(t => t.id === activeId) : null;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Unassigned Column */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className="h-full border-dashed bg-muted/30">
                        <CardHeader className="py-4">
                            <CardTitle className="text-sm font-medium flex justify-between items-center">
                                Unassigned
                                <Badge variant="secondary">{unassignedTeams.length}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 min-h-[200px]">
                            <SortableContext id="unassigned-container" items={unassignedTeams.map(t => t.id)} strategy={rectSortingStrategy}>
                                <DroppableContainer id="unassigned-container" className="space-y-2 h-full">
                                    {unassignedTeams.map((team) => (
                                        <SortableTeamItem key={team.id} team={team} disabled={readonly} />
                                    ))}
                                    {unassignedTeams.length === 0 && (
                                        <div className="text-center text-xs text-muted-foreground py-8">
                                            No unassigned teams
                                        </div>
                                    )}
                                </DroppableContainer>
                            </SortableContext>
                        </CardContent>
                    </Card>
                </div>

                {/* Pools Grid */}
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stages.map((stage) => {
                        const poolTeams = relevantTeams.filter(t => t.poolNumber === stage.name);
                        return (
                            <Card key={stage.id} className="bg-card">
                                <CardHeader className="py-3 px-4 border-b">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-semibold text-sm">{stage.name}</h3>
                                        <Badge variant="outline" className="text-xs">{poolTeams.length} Teams</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-2 min-h-[150px]">
                                    <SortableContext id={stage.name} items={poolTeams.map(t => t.id)} strategy={rectSortingStrategy}>
                                        <DroppableContainer id={stage.name} className="space-y-2 h-full min-h-[100px]">
                                            {poolTeams.map((team) => (
                                                <SortableTeamItem key={team.id} team={team} disabled={readonly} />
                                            ))}
                                            {poolTeams.length === 0 && (
                                                <div className="h-full flex items-center justify-center text-xs text-muted-foreground text-center p-4 border-2 border-dashed rounded-lg border-muted/50">
                                                    Drop here
                                                </div>
                                            )}
                                        </DroppableContainer>
                                    </SortableContext>
                                </CardContent>
                            </Card>
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
}

function SortableTeamItem({ team, disabled }: SortableTeamItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: team.id, disabled });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        // eslint-disable-next-line
        <div
            ref={setNodeRef}
            style={style}
            className={clsx(isDragging && "opacity-30")}
            {...attributes}
            {...listeners}
        >
            <TeamItem team={team} />
        </div>
    );
}

function TeamItem({ team, isOverlay }: { team: Team, isOverlay?: boolean }) {
    return (
        <div className={clsx(
            "p-3 rounded-lg border bg-background shadow-sm flex items-center gap-3 select-none",
            isOverlay && "cursor-grabbing shadow-xl scale-105 ring-2 ring-primary",
            !isOverlay && "cursor-grab hover:border-primary/50"
        )}>
            <div className="text-muted-foreground">
                <GripVertical className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{team.name}</div>
                <div className="text-xs text-muted-foreground truncate">{team.organisationName || 'Unknown Org'}</div>
            </div>
        </div>
    );
}
