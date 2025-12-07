import { useEffect, useState } from 'react';
import { Search, Filter, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card, CardContent } from '@/components/Card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/Table';
import { Badge } from '@/components/Badge';
import { useAuditStore } from '@/store/audit.store';
import { useAuthStore } from '@/store/auth.store';
import { format } from 'date-fns';

export default function Activity() {
    const { user: currentUser } = useAuthStore();
    const { logs, isLoading, fetchGlobalLogs, fetchOrgLogs, fetchUserLogs, currentPage, pageSize } = useAuditStore();
    const [activeTab, setActiveTab] = useState<'global' | 'org' | 'user'>('user');
    const [searchQuery, setSearchQuery] = useState('');

    const isSuperAdmin = currentUser?.roles?.includes('ROLE_SUPER_ADMIN');
    const isOrgAdmin = currentUser?.roles?.includes('ROLE_ORG_ADMIN');

    useEffect(() => {
        loadLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, currentPage]);

    const loadLogs = () => {
        const params = { page: currentPage, size: pageSize };
        if (activeTab === 'global' && isSuperAdmin) {
            fetchGlobalLogs(params);
        } else if (activeTab === 'org' && (isOrgAdmin || isSuperAdmin) && currentUser?.organisationId) {
            fetchOrgLogs(currentUser.organisationId, params);
        } else {
            if (currentUser?.id) {
                fetchUserLogs(currentUser.id, params);
            }
        }
    };

    const handleTabChange = (tab: 'global' | 'org' | 'user') => {
        setActiveTab(tab);
    };

    const getActionBadgeVariant = (actionType: string) => {
        if (actionType.includes('CREATED')) return 'success';
        if (actionType.includes('UPDATED')) return 'warning';
        if (actionType.includes('DELETED')) return 'destructive';
        if (actionType.includes('LOGIN')) return 'default';
        return 'secondary';
    };

    const filteredLogs = logs.filter(log =>
        log.entitySummary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.actionType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.actorEmail.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <PageHeader
                title="Activity & Logs"
                description="Track system activity and audit logs"
                action={
                    <Button variant="outline" size="sm" onClick={loadLogs}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                }
            />

            {/* Tabs */}
            <div className="flex space-x-1 bg-glass-bg/50 p-1 rounded-lg w-fit border border-glass-border">
                <button
                    onClick={() => handleTabChange('user')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'user'
                        ? 'bg-primary-500 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        }`}
                >
                    My Activity
                </button>
                {(isOrgAdmin || isSuperAdmin) && (
                    <button
                        onClick={() => handleTabChange('org')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'org'
                            ? 'bg-primary-500 text-white shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                            }`}
                    >
                        Organisation
                    </button>
                )}
                {isSuperAdmin && (
                    <button
                        onClick={() => handleTabChange('global')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'global'
                            ? 'bg-primary-500 text-white shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                            }`}
                    >
                        Global System
                    </button>
                )}
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="p-4 border-b border-glass-border flex justify-between items-center">
                        <div className="relative w-full max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                            <Input
                                placeholder="Search logs..."
                                className="pl-9 bg-glass-bg/50"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                                <Filter className="w-4 h-4 mr-2" />
                                Filter
                            </Button>
                        </div>
                    </div>

                    <Table>
                        <TableHeader className="border-b border-border/60">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="text-xs font-medium text-muted-foreground">Timestamp</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground">Action</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground">Actor</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground">Details</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground">IP Address</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">Loading logs...</TableCell>
                                </TableRow>
                            ) : filteredLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No activity found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLogs.map((log) => (
                                    <TableRow
                                        key={log.id}
                                        className="hover:bg-muted/30 transition-colors border-b border-border/40"
                                    >
                                        <TableCell className="py-4">
                                            <span className="text-sm text-muted-foreground">
                                                {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <Badge
                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                variant={getActionBadgeVariant(log.actionType) as any}
                                                className="text-xs"
                                            >
                                                {log.actionType}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">{log.actorEmail}</span>
                                                <span className="text-xs text-muted-foreground">{log.actorRole}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <span className="text-sm">{log.entitySummary}</span>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <span className="text-xs text-muted-foreground font-mono">
                                                {log.ipAddress || '—'}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination (Simple implementation for now) */}
                    <div className="p-4 border-t border-glass-border flex justify-between items-center text-sm text-muted-foreground">
                        <span>Showing {filteredLogs.length} of {activeTab === 'user' ? 'recent' : 'many'} logs</span>
                        {/* Add pagination controls if needed later */}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
