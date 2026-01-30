import { useEffect, useState, useMemo } from 'react';
import { MagnifyingGlass, Plus, Calendar, Clock, MapPin, Play, PencilSimple, Trash, CheckSquare, X } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { GlassCard } from '@/components/GlassCard';
import { Badge } from '@/components/Badge';
import { useMatchesStore } from '@/store/matches.store';
import { MatchStatus } from '@/types';
import { useAuthStore } from '@/store/auth.store';
import { updateMatch } from '@/api/matches.api';
import { SmartFilterPills, FilterOption } from '@/components/SmartFilterPills';
import { EmptyState } from '@/components/EmptyState';
import { clsx } from 'clsx';
import { showToast } from '@/lib/customToast';

import { ConfirmModal } from '@/components/ConfirmModal';

export const Matches = () => {
    const navigate = useNavigate();
    const { matches, loadingList, filters, setFilters, loadMatches, deleteMatch, deleteMatches } = useMatchesStore();
    const { user } = useAuthStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        variant: 'primary' as 'primary' | 'destructive',
        confirmText: 'Confirm'
    });

    useEffect(() => {
        loadMatches();
    }, [loadMatches, filters]);

    const isAdmin = user?.roles?.some(r => ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN'].includes(r));
    const canDelete = user?.roles?.some(r => ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN'].includes(r));

    const filteredMatches = matches.filter(m =>
        (m.homeTeamName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.awayTeamName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
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

    const handleStartMatch = (matchId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        setConfirmModal({
            isOpen: true,
            title: 'Start Match',
            message: 'Start this match? This will change the status to ONGOING.',
            confirmText: 'Start Match',
            variant: 'primary',
            onConfirm: async () => {
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
            }
        });
    };

    const handleEdit = (matchId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/dashboard/matches/${matchId}/edit`);
    };

    const toggleSelection = (matchId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSelected = new Set(selectedIds);
        if (newSelected.has(matchId)) {
            newSelected.delete(matchId);
        } else {
            newSelected.add(matchId);
        }
        setSelectedIds(newSelected);
        if (newSelected.size === 0) {
            setIsSelectionMode(false);
        }
    };

    const handleSelectAll = () => {
        if (selectedIds.size === filteredMatches.length) {
            setSelectedIds(new Set());
            setIsSelectionMode(false);
        } else {
            setSelectedIds(new Set(filteredMatches.map(m => m.id)));
            setIsSelectionMode(true);
        }
    };

    const toggleSelectionMode = () => {
        if (isSelectionMode) {
            setSelectedIds(new Set());
            setIsSelectionMode(false);
        } else {
            setIsSelectionMode(true);
        }
    };

    const handleBulkDelete = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Matches',
            message: `Are you sure you want to delete ${selectedIds.size} matches? This action cannot be undone.`,
            confirmText: 'Delete',
            variant: 'destructive',
            onConfirm: async () => {
                try {
                    await deleteMatches(Array.from(selectedIds));
                    setSelectedIds(new Set());
                    setIsSelectionMode(false);
                    showToast.success('Matches deleted successfully');
                } catch (error) {
                    console.error('Failed to bulk delete', error);
                    showToast.error('Failed to delete matches');
                }
            }
        });
    };

    const handleDelete = (matchId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirmModal({
            isOpen: true,
            title: 'Delete Match',
            message: 'Are you sure you want to delete this match? This action cannot be undone.',
            confirmText: 'Delete',
            variant: 'destructive',
            onConfirm: async () => {
                try {
                    await deleteMatch(matchId);
                    // Toast is handled by store or we can add here if store doesn't
                } catch (error) {
                    console.error('Failed to delete match', error);
                }
            }
        });
    };

    // Filter Options
    const statusOptions: FilterOption[] = useMemo(() => [
        { id: 'SCHEDULED', label: 'Scheduled', count: matches.filter(m => m.status === 'SCHEDULED').length },
        { id: 'ONGOING', label: 'Live', count: matches.filter(m => m.status === 'ONGOING').length },
        { id: 'COMPLETED', label: 'Finished', count: matches.filter(m => m.status === 'COMPLETED').length },
        { id: 'CANCELLED', label: 'Cancelled' },
    ], [matches]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative">
            <PageHeader
                title="Matches"
                description="View and manage match schedules and results."
                action={
                    <div className="flex gap-2">
                        {isAdmin && (
                            <Button
                                variant={isSelectionMode ? "secondary" : "ghost"}
                                onClick={toggleSelectionMode}
                                title="Toggle Selection Mode"
                            >
                                <CheckSquare className={clsx("w-5 h-5", isSelectionMode && "text-primary-400")} />
                            </Button>
                        )}
                        {isAdmin && (
                            <Button onClick={() => navigate('/dashboard/matches/new')} className="gap-2">
                                <Plus className="w-4 h-4" />
                                New Match
                            </Button>
                        )}
                    </div>
                }
            />

            {/* Controls Layout */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex gap-2 w-full md:w-auto flex-1 max-w-lg">
                    <div className="relative flex-1">
                        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted border-glass-border" />
                        <Input
                            placeholder="Search matches by team or venue..."
                            className="pl-9 bg-glass-bg border-glass-border focus:border-primary-500/50 transition-colors"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <SmartFilterPills
                    options={statusOptions}
                    selectedId={filters.status && filters.status !== 'ALL' ? filters.status : null}
                    onSelect={(id) => setFilters({ status: (id as MatchStatus) || 'ALL' })}
                    className="w-full md:w-auto"
                />
            </div>

            {loadingList ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 9 }).map((_, i) => (
                        <GlassCard key={i} className="h-48 animate-pulse flex flex-col p-6">
                            <div className="w-full h-4 bg-white/5 rounded mb-4" />
                            <div className="w-full h-12 bg-white/5 rounded mb-4" />
                            <div className="w-1/2 h-4 bg-white/5 rounded" />
                        </GlassCard>
                    ))}
                </div>
            ) : filteredMatches.length === 0 ? (
                <EmptyState
                    icon={Calendar}
                    title="No matches found"
                    description="Try adjusting your search or filters."
                    actionLabel={isAdmin ? "Schedule Match" : undefined}
                    onAction={isAdmin ? () => navigate('/dashboard/matches/new') : undefined}
                    className="min-h-[400px] border-dashed border-white/10"
                />
            ) : (
                <>
                    {/* Bulk Actions Bar */}
                    {isSelectionMode && selectedIds.size > 0 && (
                        <div className="sticky top-4 z-40 bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl p-3 flex items-center justify-between shadow-2xl animate-in slide-in-from-top-4 mb-4">
                            <div className="flex items-center gap-4 px-2">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setSelectedIds(new Set())}
                                    className="h-8 w-8 p-0"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                                <div className="text-sm font-medium">
                                    <span className="text-primary-400 font-bold">{selectedIds.size}</span> selected
                                </div>
                                <div className="h-4 w-px bg-white/10" />
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleSelectAll}
                                    className="text-xs h-7"
                                >
                                    {selectedIds.size === filteredMatches.length ? 'Deselect All' : 'Select All'}
                                </Button>
                            </div>

                            <div className="flex items-center gap-2">
                                {canDelete && (
                                    <Button
                                        size="sm"
                                        className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border-0"
                                        onClick={handleBulkDelete}
                                    >
                                        <Trash className="w-4 h-4 mr-2" />
                                        Delete Selected
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredMatches.map((m) => {
                            const isSelected = selectedIds.has(m.id);
                            return (
                                <GlassCard
                                    key={m.id}
                                    className={clsx(
                                        "group relative flex flex-col transition-all duration-300 cursor-pointer overflow-hidden border-white/10",
                                        isSelected ? "bg-primary-500/10 border-primary-500/50 ring-1 ring-primary-500/50" : "hover:bg-white/5 hover:-translate-y-1 hover:shadow-glass-lg"
                                    )}
                                    onClick={(e) => {
                                        if (isSelectionMode) {
                                            toggleSelection(m.id, e);
                                        } else {
                                            navigate(`/dashboard/matches/${m.matchCode || m.id}`);
                                        }
                                    }}
                                >
                                    {/* Selection Overlay/Checkbox */}
                                    {isSelectionMode && (
                                        <div className="absolute top-3 right-3 z-20">
                                            <div
                                                className={clsx(
                                                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                                    isSelected ? "bg-primary-500 border-primary-500" : "bg-black/40 border-white/30 hover:border-white/60"
                                                )}
                                                onClick={(e) => toggleSelection(m.id, e)}
                                            >
                                                {isSelected && <CheckSquare className="w-3.5 h-3.5 text-white" weight="fill" />}
                                            </div>
                                        </div>
                                    )}

                                    {/* Status Indicator Bar */}
                                    <div className={`h-1 w-full ${m.status === 'ONGOING' ? 'bg-blue-500 animate-pulse' :
                                        m.status === 'COMPLETED' ? 'bg-green-500' :
                                            m.status === 'CANCELLED' ? 'bg-red-500' : 'bg-primary-500/50'
                                        }`} />

                                    <div className="p-5 flex flex-col h-full">
                                        {/* Header: Date & Status */}
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                                <Calendar className="w-3.5 h-3.5" />
                                                <span>{new Date(m.matchDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                                <span className="w-1 h-1 rounded-full bg-white/20" />
                                                <Clock className="w-3.5 h-3.5" />
                                                <span>{m.kickOffTime}</span>
                                            </div>
                                            <Badge variant={getStatusVariant(m.status) as any} className="text-[10px] px-1.5 h-5 uppercase tracking-wider">
                                                {m.status === 'ONGOING' ? 'LIVE' : m.status}
                                            </Badge>
                                        </div>

                                        {/* Teams & Score */}
                                        <div className="flex-1 flex items-center justify-between gap-4 mb-6">
                                            <div className="flex-1 text-center">
                                                <div className="font-bold text-lg leading-tight truncate px-1" title={m.homeTeamName}>{m.homeTeamName}</div>
                                            </div>

                                            <div className="flex flex-col items-center shrink-0 min-w-[60px]">
                                                {m.status === 'SCHEDULED' ? (
                                                    <span className="text-xl font-bold text-muted-foreground/40 font-mono">VS</span>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-2xl font-bold font-mono tracking-tight">
                                                        <span className={(m.homeScore ?? 0) > (m.awayScore ?? 0) ? 'text-primary-400' : ''}>{m.homeScore ?? 0}</span>
                                                        <span className="text-muted-foreground/30">-</span>
                                                        <span className={(m.awayScore ?? 0) > (m.homeScore ?? 0) ? 'text-primary-400' : ''}>{m.awayScore ?? 0}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 text-center">
                                                <div className="font-bold text-lg leading-tight truncate px-1" title={m.awayTeamName}>{m.awayTeamName}</div>
                                            </div>
                                        </div>

                                        {/* Footer: Venue & Action */}
                                        <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate max-w-[70%]">
                                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                                <span className="truncate">{m.venue || 'Venue TBA'}</span>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex gap-2">
                                                {isAdmin && m.status === 'SCHEDULED' && (
                                                    <Button
                                                        size="sm"
                                                        className="h-7 px-2.5 text-xs bg-primary-500/10 hover:bg-primary-500 hover:text-white text-primary-500 border-0"
                                                        onClick={(e) => handleStartMatch(m.id, e)}
                                                    >
                                                        <Play className="w-3 h-3 mr-1.5 fill-current" weight="fill" />
                                                        Start
                                                    </Button>
                                                )}
                                                {isAdmin && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-9 w-9 p-0 rounded-full hover:bg-white/10"
                                                        onClick={(e) => handleEdit(m.id, e)}
                                                    >
                                                        <PencilSimple className="w-5 h-5" />
                                                    </Button>
                                                )}
                                                {canDelete && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-9 w-9 p-0 rounded-full text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                                        onClick={(e) => handleDelete(m.id, e)}
                                                    >
                                                        <Trash className="w-5 h-5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </GlassCard>
                            );
                        })}
                    </div>
                </>
            )}
            {/* Other existing modals/content */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                variant={confirmModal.variant}
            />
        </div>
    );
};
