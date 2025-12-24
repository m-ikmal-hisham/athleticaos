import { useEffect, useState, memo } from 'react';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/GlassCard';
import { Pulse, Clock, CaretDown, CaretUp } from '@phosphor-icons/react';
import { useAuditStore } from '@/store/audit.store';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';

interface RecentActivityWidgetProps {
    scope?: 'global' | 'org' | 'user' | 'entity';
    entityType?: string;
    entityId?: string;
    title?: string;
    limit?: number;
}

export const RecentActivityWidget = memo(({
    scope = 'entity',
    entityType,
    entityId,
    title = "Recent Activity",
    limit = 5
}: RecentActivityWidgetProps) => {
    const { logs, fetchGlobalLogs, fetchOrgLogs, fetchUserLogs, fetchEntityLogs, isLoading } = useAuditStore();
    const [isExpanded, setIsExpanded] = useState(false);
    const INITIAL_DISPLAY_COUNT = 5;

    useEffect(() => {
        const params = { page: 0, size: limit };

        if (scope === 'global') {
            fetchGlobalLogs(params);
        } else if (scope === 'org' && entityId) {
            fetchOrgLogs(entityId, params);
        } else if (scope === 'user' && entityId) {
            fetchUserLogs(entityId, params);
        } else if (scope === 'entity' && entityType && entityId) {
            fetchEntityLogs(entityType, entityId, params);
        }
    }, [scope, entityType, entityId, limit, fetchGlobalLogs, fetchOrgLogs, fetchUserLogs, fetchEntityLogs]);

    const getActionBadgeVariant = (actionType: string) => {
        if (actionType.includes('CREATED')) return 'success';
        if (actionType.includes('UPDATED')) return 'warning';
        if (actionType.includes('DELETED')) return 'destructive';
        return 'secondary';
    };

    const displayLogs = isExpanded ? logs : logs.slice(0, INITIAL_DISPLAY_COUNT);

    if (isLoading && logs.length === 0) {
        return (
            <GlassCard className="h-full">
                <GlassCardHeader className="pb-2">
                    <GlassCardTitle className="text-lg font-medium flex items-center gap-2">
                        <Pulse className="w-5 h-5 text-primary-500" />
                        {title}
                    </GlassCardTitle>
                </GlassCardHeader>
                <GlassCardContent>
                    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                        Loading activity...
                    </div>
                </GlassCardContent>
            </GlassCard>
        );
    }

    return (
        <GlassCard variant="subtle" className="h-full flex flex-col">
            <GlassCardHeader className="pb-2 flex-none">
                <GlassCardTitle className="text-lg font-medium flex items-center gap-2">
                    <Pulse className="w-5 h-5 text-primary-500" />
                    {title}
                </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="flex-1 min-h-0 max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                        No recent activity
                    </div>
                ) : (
                    <div className="space-y-3">
                        {displayLogs.map((log) => (
                            <div key={log.id} className="flex gap-3 items-start group">
                                <div className="mt-1 relative">
                                    <div className="w-2 h-2 rounded-full bg-primary-500 ring-4 ring-primary-500/10" />
                                    <div className="absolute top-3 left-1 w-px h-full bg-border group-last:hidden" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-foreground">
                                            {log.actionType.replace(/_/g, ' ')}
                                        </p>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                        {log.entitySummary}
                                    </p>
                                    <div className="flex items-center gap-2 pt-1">
                                        <Badge variant={getActionBadgeVariant(log.actionType) as any} className="text-[10px] px-1.5 py-0 h-5">
                                            {log.actorEmail}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {logs.length > INITIAL_DISPLAY_COUNT && (
                    <div className="mt-4 pt-2 border-t border-border/50 flex justify-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-xs text-muted-foreground hover:text-foreground h-8"
                        >
                            {isExpanded ? (
                                <>
                                    <CaretUp className="w-3 h-3 mr-1" /> Show Less
                                </>
                            ) : (
                                <>
                                    <CaretDown className="w-3 h-3 mr-1" /> View All ({logs.length - INITIAL_DISPLAY_COUNT} more)
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </GlassCardContent>
        </GlassCard>
    );
});
