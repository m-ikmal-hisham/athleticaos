import { useEffect, useState } from 'react';
import { Search, Filter, Play, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card, CardContent } from '@/components/Card';
import { MatchModal } from '@/components/modals/MatchModal';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/Table';
import { Badge } from '@/components/Badge';
import { useMatchesStore, MatchStatus } from '@/store/matches.store';
import { useAuthStore } from '@/store/auth.store';
import { updateMatch } from '@/api/matches.api';

export const Matches = () => {
    const navigate = useNavigate();
    const { matches, loadingList, filters, setFilters, loadMatches } = useMatchesStore();
    const { user } = useAuthStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        loadMatches();
    }, [loadMatches, filters]);

    const isAdmin = user?.roles?.some(r => ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN'].includes(r));

    const filteredMatches = matches.filter(m =>
        m.homeTeamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.awayTeamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.venue && m.venue.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getStatusVariant = (status: MatchStatus) => {
        switch (status) {
            case 'SCHEDULED': return 'primary';
            case 'ONGOING': return 'blue';
            case 'COMPLETED': return 'green';
            case 'CANCELLED': return 'destructive';
            default: return 'secondary';
        }
    };

    const handleStartMatch = async (matchId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        if (!window.confirm('Start this match? This will change the status to ONGOING.')) {
            return;
        }

        try {
            const match = matches.find(m => m.id === matchId);
            if (!match) return;

            await updateMatch(matchId, {
                matchDate: match.matchDate,
                kickOffTime: match.kickOffTime,
                venue: match.venue,
                status: 'ONGOING',
                homeScore: 0,
                awayScore: 0,
                phase: match.phase,
                matchCode: match.matchCode
            });

            await loadMatches();
        } catch (error) {
            console.error('Failed to start match', error);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Matches"
                description="View and manage match schedules and results."
                action={
                    isAdmin && (
                        <Button onClick={() => setIsCreateModalOpen(true)}>
                            New Match
                        </Button>
                    )
                }
            />

            <Card>
                <CardContent className="p-0">
                    <div className="p-4 flex flex-col md:flex-row gap-4 border-b border-glass-border items-center">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                            <Input
                                placeholder="Search matches..."
                                className="pl-9 bg-glass-bg/50"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            {/* TODO: Later, add Organisation filter that respects hierarchy:
                                Country -> State -> Division/District -> Club/School
                                This should map onto Organisation and parentOrgId from backend. */}
                            <select
                                className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                                value={filters.status || 'ALL'}
                                onChange={(e) => setFilters({ status: e.target.value as MatchStatus | 'ALL' })}
                            >
                                <option value="ALL">All Status</option>
                                <option value="SCHEDULED">Scheduled</option>
                                <option value="ONGOING">Ongoing</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                            <Button variant="outline" className="gap-2">
                                <Filter className="w-4 h-4" />
                                More Filters
                            </Button>
                        </div>
                    </div>

                    <Table>
                        <TableHeader className="border-b border-border/60">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="text-xs font-medium text-muted-foreground">Date & Time</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground">Match</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground">Score</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingList ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">Loading matches...</TableCell>
                                </TableRow>
                            ) : filteredMatches.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No matches found.</TableCell>
                                </TableRow>
                            ) : (
                                filteredMatches.map((m) => (
                                    <TableRow
                                        key={m.id}
                                        className="group hover:bg-muted/30 transition-colors cursor-pointer border-b border-border/40"
                                        onClick={() => navigate(`/dashboard/matches/${m.matchCode || m.id}`)}
                                    >
                                        <TableCell className="py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">
                                                    {new Date(m.matchDate).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {m.kickOffTime}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold">
                                                    {m.homeTeamName} vs {m.awayTeamName}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {m.venue || 'TBA'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            {m.status === 'SCHEDULED' ? (
                                                <span className="text-sm text-muted-foreground">-</span>
                                            ) : (
                                                <span className="text-sm font-bold font-mono">
                                                    {m.homeScore ?? 0} - {m.awayScore ?? 0}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <Badge variant={getStatusVariant(m.status) as any} className="text-xs">
                                                {m.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {isAdmin && m.status === 'SCHEDULED' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => handleStartMatch(m.id, e)}
                                                        className="h-8 px-3"
                                                    >
                                                        <Play className="w-4 h-4 mr-1" />
                                                        Start
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <MatchModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                    loadMatches();
                }}
            />
        </div>
    );
};
