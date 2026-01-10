import { useEffect, useState, useMemo } from 'react';
import { SearchableSelect } from '@/components/SearchableSelect';
import { useNavigate } from 'react-router-dom';
import { Plus, MagnifyingGlass, Funnel, CalendarBlank, Buildings, PencilSimple, Trash, Trophy } from '@phosphor-icons/react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { GlassCard } from '@/components/GlassCard';
import { Badge } from '@/components/Badge';
import { StatusPill } from '@/components/StatusPill';
import { getSeasons, deleteSeason } from '@/api/seasons.api';
import { Season, SeasonLevel, SeasonStatus } from '@/types/season.types';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { SmartFilterPills, FilterOption } from '@/components/SmartFilterPills';
import ConfirmDeleteModal from '@/components/modals/ConfirmDeleteModal';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';

export const Seasons = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const isAdmin = user?.roles?.some(r => ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN'].includes(r));

    const [seasons, setSeasons] = useState<Season[]>([]);
    const [loading, setLoading] = useState(true);
    const [, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterLevel, setFilterLevel] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [showFilters, setShowFilters] = useState(false);

    // Delete State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [seasonToDelete, setSeasonToDelete] = useState<Season | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        loadSeasons();
    }, []);

    const loadSeasons = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getSeasons();
            setSeasons(data);
        } catch (err: any) {
            console.error('Failed to load seasons', err);
            if (err.response?.status === 403) {
                setError('You do not have permission to view seasons.');
            } else {
                setError('Failed to load seasons.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, season: Season) => {
        e.stopPropagation();
        setSeasonToDelete(season);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!seasonToDelete) return;
        try {
            setIsDeleting(true);
            await deleteSeason(seasonToDelete.id);
            toast.success('Season deleted successfully');
            await loadSeasons();
            setDeleteModalOpen(false);
            setSeasonToDelete(null);
        } catch (error) {
            console.error('Failed to delete season', error);
            toast.error('Failed to delete season');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEdit = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        navigate(`/dashboard/competitions/seasons/${id}/edit`);
    };

    // Filters
    const filteredSeasons = seasons.filter((season) => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesSearch = season.name.toLowerCase().includes(query) ||
                season.code?.toLowerCase().includes(query) ||
                season.level?.toLowerCase().includes(query);
            if (!matchesSearch) return false;
        }
        if (filterLevel && season.level !== filterLevel) return false;
        if (filterStatus !== 'ALL' && season.status !== filterStatus) return false;
        return true;
    });

    const statusOptions: FilterOption[] = useMemo(() => [
        { id: 'ALL', label: 'All Statuses' },
        { id: SeasonStatus.PLANNED, label: 'Planned', count: seasons.filter(s => s.status === SeasonStatus.PLANNED).length },
        { id: SeasonStatus.ACTIVE, label: 'Active', count: seasons.filter(s => s.status === SeasonStatus.ACTIVE).length },
        { id: SeasonStatus.COMPLETED, label: 'Completed', count: seasons.filter(s => s.status === SeasonStatus.COMPLETED).length },
    ], [seasons]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <PageHeader
                title="Competitions & Seasons"
                description="Manage and review national, state, and age-grade rugby seasons."
                action={
                    isAdmin && (
                        <Button onClick={() => navigate('/dashboard/competitions/seasons/new')} className="gap-2">
                            <Plus className="w-4 h-4" />
                            New Season
                        </Button>
                    )
                }
            />

            {/* Controls */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <div className="flex gap-2 w-full md:w-auto flex-1 max-w-lg">
                        <div className="relative flex-1">
                            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted border-glass-border" />
                            <Input
                                placeholder="Search seasons..."
                                className="pl-9 bg-glass-bg border-glass-border focus:border-primary-500/50 transition-colors"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button
                            variant="outline"
                            className={`px-3 md:hidden ${showFilters ? 'bg-primary-500/10 border-primary-500/50 text-primary-500' : ''}`}
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <Funnel className="w-4 h-4" />
                        </Button>
                    </div>

                    <SmartFilterPills
                        options={statusOptions}
                        selectedId={filterStatus}
                        onSelect={(id) => setFilterStatus(id || 'ALL')}
                        className="w-full md:w-auto overflow-hidden"
                    />
                </div>

                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-all duration-300 ${showFilters ? 'block' : 'hidden md:grid'}`}>
                    <SearchableSelect
                        placeholder="All Levels"
                        value={filterLevel}
                        onChange={(value) => setFilterLevel(value as string)}
                        options={[{ value: '', label: 'All Levels' }, ...Object.values(SeasonLevel).map(level => ({ value: level, label: level }))]}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <LoadingSpinner />
                </div>
            ) : filteredSeasons.length === 0 ? (
                <EmptyState
                    icon={Trophy}
                    title="No seasons found"
                    description="Adjust filters or create a new season."
                    actionLabel={isAdmin ? "New Season" : undefined}
                    onAction={isAdmin ? () => navigate('/dashboard/competitions/seasons/new') : undefined}
                    className="min-h-[400px] border-dashed border-white/10"
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSeasons.map((season) => (
                        <GlassCard
                            key={season.id}
                            className="group relative flex flex-col hover:bg-white/5 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-glass-lg border-white/10 overflow-hidden"
                            onClick={() => navigate(`/dashboard/competitions/seasons/${season.id}`)}
                        >
                            {/* Gradient Top Banner */}
                            <div className="h-24 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 relative overflow-hidden">
                                <div className="absolute top-3 right-3">
                                    <StatusPill status={season.status} />
                                </div>
                            </div>

                            <div className="p-6 pt-0 flex-1 flex flex-col -mt-8">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-16 h-16 rounded-xl bg-glass-bg border border-white/10 shadow-lg flex items-center justify-center overflow-hidden z-10 text-primary-400">
                                        <Trophy className="w-8 h-8" weight="duotone" />
                                    </div>

                                    {/* Action Buttons */}
                                    {isAdmin && (
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 mt-8 mr-[-8px]">
                                            <button
                                                onClick={(e) => handleEdit(e, season.id)}
                                                className="w-8 h-8 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-md hover:bg-white/20 text-white transition-colors border border-white/10"
                                                title="Edit Season"
                                            >
                                                <PencilSimple className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteClick(e, season)}
                                                className="w-8 h-8 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-md hover:bg-red-500/80 text-white hover:border-red-500/50 transition-colors border border-white/10"
                                                title="Delete Season"
                                            >
                                                <Trash className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="mb-4">
                                    <div className="text-xs font-semibold text-primary-400 mb-1 uppercase tracking-wider">{season.code}</div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-primary-400 transition-colors line-clamp-2">
                                        {season.name}
                                    </h3>
                                    <div className="flex gap-2 mt-2">
                                        <Badge variant="secondary" className="text-[10px]">{season.level}</Badge>
                                    </div>
                                </div>

                                <div className="mt-auto space-y-3 pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-2 text-sm text-slate-400">
                                        <CalendarBlank className="w-4 h-4 text-primary-500" />
                                        <span>{season.startDate} - {season.endDate}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-400">
                                        <Buildings className="w-4 h-4 text-primary-500" />
                                        <span className="truncate">{season.organiser?.name || 'Unknown Organiser'}</span>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}

            <ConfirmDeleteModal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setSeasonToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                title="Delete Season"
                message={`Are you sure you want to delete "${seasonToDelete?.name}"? This action cannot be undone.`}
                isDeleting={isDeleting}
            />
        </div>
    );
};
