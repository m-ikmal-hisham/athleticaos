import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Activity, Clock } from 'lucide-react';
import { useAuditStore } from '@/store/audit.store';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/Badge';

interface RecentActivityWidgetProps {
    entityType: string;
    entityId: string;
    title?: string;
    limit?: number;
}

export function RecentActivityWidget({
    entityType,
    entityId,
    title = "Recent Activity",
    limit = 5
}: RecentActivityWidgetProps) {
    const { logs, fetchEntityLogs, isLoading } = useAuditStore();

    useEffect(() => {
        if (entityId) {
            fetchEntityLogs(entityType, entityId, { page: 0, size: limit });
        }
    }, [entityType, entityId, limit, fetchEntityLogs]);

    const getActionBadgeVariant = (actionType: string) => {
        if (actionType.includes('CREATED')) return 'success';
        if (actionType.includes('UPDATED')) return 'warning';
        if (actionType.includes('DELETED')) return 'destructive';
        return 'secondary';
    };

    if (isLoading && logs.length === 0) {
        return (
            <Card className="h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary-500" />
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                        Loading activity...
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary-500" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {logs.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                        No recent activity
                    </div>
                ) : (
                    <div className="space-y-4">
                        {logs.slice(0, limit).map((log) => (
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
            </CardContent>
        </Card>
    );
}
