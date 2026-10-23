import { useEffect, useState, useMemo } from "react";
import { formatCompetitionType, formatTournamentStatus } from '@/utils/formatters';
import { SearchableSelect } from "@/components/SearchableSelect";
import { GlassCard } from "../../components/GlassCard";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlass, Plus, Funnel, Trophy, Calendar, MapPin, PencilSimple, Trash, CaretUp, CaretDown, Star } from "@phosphor-icons/react";
import { Tournament, TournamentStatus } from "@/types";
import { useTournamentsStore } from "../../store/tournaments.store";

import { useAuthStore } from "@/store/auth.store";
import { PageHeader } from "../../components/PageHeader";
import { SmartFilterPills, FilterOption } from "@/components/SmartFilterPills";
import { EmptyState } from "@/components/EmptyState";
import { getImageUrl } from "../../utils/image";
import ConfirmDeleteModal from "@/components/modals/ConfirmDeleteModal";
import { deleteTournament, updateTournamentFeatured } from "@/api/tournaments.api";
import { publicTournamentApi, PublicTournamentSummary } from "@/api/public.api";
import { showToast } from "@/lib/customToast";

export default function Tournaments() {
    const { tournaments, loading, getTournaments, refreshTournaments } = useTournamentsStore();
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [seasonFilter, setSeasonFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [levelFilter, setLevelFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [showFilters, setShowFilters] = useState(false);

    // Delete State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [tournamentToDelete, setTournamentToDelete] = useState<Tournament | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Featured State
    const [publicFeatured, setPublicFeatured] = useState<PublicTournamentSummary[]>([]);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [reorderingId, setReorderingId] = useState<string | null>(null);

    const isSuperAdmin = Boolean(user?.roles?.includes('ROLE_SUPER_ADMIN'));
    const isOrgAdmin = Boolean(user?.roles?.includes('ROLE_ORG_ADMIN'));
    const canSeeFeaturedPanel = isSuperAdmin || isOrgAdmin;

    const loadPublicFeatured = async () => {
        try {
            const data = await publicTournamentApi.getFeaturedTournaments(true);
            setPublicFeatured(data);
        } catch (error) {
            console.error('Failed to load featured tournaments', error);
        }
    };

    useEffect(() => {
        getTournaments();
        if (canSeeFeaturedPanel) {
            loadPublicFeatured();
        }
    }, [getTournaments, canSeeFeaturedPanel]);

    const canToggleFeatured = (t: Tournament) => {
        return Boolean(isSuperAdmin || (isOrgAdmin && t.accessLevel === 'MANAGE'));
    };

    const handleToggleFeatured = async (e: React.MouseEvent, tournament: Tournament) => {
        e.stopPropagation();
        if (togglingId) return;
        const newFeatured = !tournament.featured;
        try {
            setTogglingId(tournament.id);
            await updateTournamentFeatured(tournament.id, { featured: newFeatured });
            showToast.success(newFeatured ? 'Tournament featured' : 'Tournament unfeatured');
            await Promise.all([refreshTournaments(), loadPublicFeatured()]);
        } catch (err: unknown) {
            const anyErr = err as { response?: { data?: { message?: string } } };
            const message = anyErr.response?.data?.message || 'Failed to update featured status';
            showToast.error(message);
        } finally {
            setTogglingId(null);
        }
    };

    const handleMoveFeatured = async (id: string, newOrder: number) => {
        if (reorderingId) return;
        try {
            setReorderingId(id);
            await updateTournamentFeatured(id, { featured: true, featuredOrder: newOrder });
            await Promise.all([refreshTournaments(), loadPublicFeatured()]);
        } catch (err: unknown) {
            const anyErr = err as { response?: { data?: { message?: string } } };
            const message = anyErr.response?.data?.message || 'Failed to reorder tournament';
            showToast.error(message);
        } finally {
            setReorderingId(null);
        }
    };

    const isAdmin = user?.roles?.some(r => ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN'].includes(r));

    // Extract unique values for filters
    const seasons = Array.from(new Set(tournaments.map(t => t.seasonName).filter(Boolean)));
    const types = Array.from(new Set(tournaments.map(t => t.competitionType).filter(Boolean)));
    const levels = Array.from(new Set(tournaments.map(t => t.level).filter(Boolean)));

    // Apply search and filters
    const filteredTournaments = tournaments.filter(tournament => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesSearch = tournament.name.toLowerCase().includes(query) ||
                tournament.seasonName?.toLowerCase().includes(query) ||
                tournament.level?.toLowerCase().includes(query);
            if (!matchesSearch) return false;
        }

        // Dropdown filters
        if (seasonFilter && tournament.seasonName !== seasonFilter) return false;
        if (typeFilter && tournament.competitionType !== typeFilter) return false;
        if (levelFilter && tournament.level !== levelFilter) return false;
        if (statusFilter && statusFilter !== 'ALL' && tournament.status !== statusFilter) return false;

        return true;
    });

    const statusOptions: FilterOption[] = useMemo(() => [
        { id: 'ALL', label: 'All Statuses' },
        { id: TournamentStatus.UPCOMING, label: 'Upcoming', count: tournaments.filter(t => t.status === TournamentStatus.UPCOMING).length },
        { id: TournamentStatus.ONGOING, label: 'Live', count: tournaments.filter(t => t.status === TournamentStatus.ONGOING).length },
        { id: TournamentStatus.COMPLETED, label: 'Completed', count: tournaments.filter(t => t.status === TournamentStatus.COMPLETED).length },
        { id: TournamentStatus.DRAFT, label: 'Draft', count: tournaments.filter(t => t.status === TournamentStatus.DRAFT).length },
    ], [tournaments]);

    const handleAdd = () => {
        navigate('/dashboard/tournaments/new');
    };

    const handleEdit = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        navigate(`/dashboard/tournaments/${id}/edit`);
    };

    const handleDeleteClick = (e: React.MouseEvent, tournament: Tournament) => {
        e.stopPropagation();
        setTournamentToDelete(tournament);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!tournamentToDelete) return;
        try {
            setIsDeleting(true);
            await deleteTournament(tournamentToDelete.id);
            await getTournaments(); // Refresh list
            setDeleteModalOpen(false);
            setTournamentToDelete(null);
        } catch (error) {
            console.error("Failed to delete tournament", error);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <PageHeader
                title="Tournaments"
                description="Overview of rugby competitions"
                action={
                    isAdmin && (
                        <Button onClick={handleAdd} className="gap-2">
                            <Plus className="w-4 h-4" />
                            New Tournament
                        </Button>
                    )
                }
            />

            {/* Featured on home page panel */}
            {canSeeFeaturedPanel && (
                <GlassCard className="p-4 sm:p-5 space-y-3 border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Star className="w-5 h-5 text-navy dark:text-navy-tint" weight="duotone" />
                            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                Featured on home page
                            </h2>
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-navy/10 text-navy dark:text-navy-tint border border-navy/20">
                                {publicFeatured.length}/6
                            </span>
                        </div>
                        <span className="text-xs text-black/60 dark:text-white/60">
                            {isSuperAdmin
                                ? 'Platform administrators can feature and reorder up to six tournaments.'
                                : 'Shows up to six tournaments on the public home page.'}
                        </span>
                    </div>

                    {isSuperAdmin ? (
                        publicFeatured.length === 0 ? (
                            <p className="text-sm text-black/60 dark:text-white/60 py-2">
                                No tournaments are currently featured on the home page. Use the switches below to feature up to six.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                                {publicFeatured.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-3 rounded-[10px] bg-black/4 dark:bg-white/6 border border-black/10 dark:border-white/12 gap-3"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="shrink-0 w-6 h-6 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center">
                                                {index + 1}
                                            </span>
                                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate" title={item.name}>
                                                {item.name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                type="button"
                                                aria-label={`Move ${item.name} up`}
                                                disabled={index === 0 || reorderingId !== null}
                                                onClick={() => handleMoveFeatured(item.id, index)}
                                                className="w-11 h-11 flex items-center justify-center rounded-lg text-black/72 dark:text-white/72 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                title="Move up"
                                            >
                                                <CaretUp className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                aria-label={`Move ${item.name} down`}
                                                disabled={index === publicFeatured.length - 1 || reorderingId !== null}
                                                onClick={() => handleMoveFeatured(item.id, index + 2)}
                                                className="w-11 h-11 flex items-center justify-center rounded-lg text-black/72 dark:text-white/72 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                title="Move down"
                                            >
                                                <CaretDown className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        (() => {
                            const ownFeatured = tournaments.filter(t => t.featured && t.accessLevel === 'MANAGE');
                            return ownFeatured.length === 0 ? (
                                <p className="text-sm text-black/60 dark:text-white/60 py-2">
                                    Your organisation has no featured tournaments at the moment.
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                                    {ownFeatured.map((t) => (
                                        <div
                                            key={t.id}
                                            className="flex items-center p-3 rounded-[10px] bg-black/4 dark:bg-white/6 border border-black/10 dark:border-white/12 gap-2.5 min-w-0"
                                        >
                                            <span className="shrink-0 w-6 h-6 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center">
                                                {t.featuredOrder ?? '•'}
                                            </span>
                                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate" title={t.name}>
                                                {t.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()
                    )}
                </GlassCard>
            )}

            {/* Controls Layout */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <div className="flex gap-2 w-full md:w-auto flex-1 max-w-lg">
                        <div className="relative flex-1">
                            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted border-glass-border" />
                            <Input
                                placeholder="Search tournaments..."
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
                        selectedId={statusFilter || 'ALL'}
                        onSelect={(id) => setStatusFilter(id === 'ALL' ? '' : id || '')}
                        className="w-full md:w-auto overflow-hidden"
                    />
                </div>

                {/* Secondary Filters */}
                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-all duration-300 ${showFilters ? 'block' : 'hidden md:grid'}`}>
                    <SearchableSelect
                        placeholder="All Seasons"
                        value={seasonFilter}
                        onChange={(value) => setSeasonFilter(value as string)}
                        options={[{ value: "", label: "All Seasons" }, ...seasons.map(season => ({ value: season || "", label: season || "Unknown" }))]}
                    />

                    <SearchableSelect
                        placeholder="All Types"
                        value={typeFilter}
                        onChange={(value) => setTypeFilter(value as string)}
                        options={[{ value: "", label: "All Types" }, ...types.map(type => ({ value: type || "", label: type || "Unknown" }))]}
                    />

                    <SearchableSelect
                        placeholder="All Levels"
                        value={levelFilter}
                        onChange={(value) => setLevelFilter(value as string)}
                        options={[{ value: "", label: "All Levels" }, ...levels.map(level => ({ value: level || "", label: level || "Unknown" }))]}
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <GlassCard key={i} className="h-64 animate-pulse p-6 flex flex-col">
                            <div className="w-16 h-16 rounded-xl bg-white/5 mb-6" />
                            <div className="w-3/4 h-6 bg-white/5 rounded mb-4" />
                            <div className="w-1/2 h-4 bg-white/5 rounded" />
                        </GlassCard>
                    ))}
                </div>
            ) : filteredTournaments.length === 0 ? (
                <EmptyState
                    icon={Trophy}
                    title="No tournaments found"
                    description="Adjust filters or create a new tournament."
                    actionLabel={isAdmin ? "New Tournament" : undefined}
                    onAction={isAdmin ? handleAdd : undefined}
                    className="min-h-[400px] border-dashed border-white/10"
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTournaments.map((t) => (
                        <GlassCard
                            key={t.id}
                            className="group relative flex flex-col hover:bg-white/5 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-glass-lg border-white/10 overflow-hidden"
                            onClick={() => navigate(`/dashboard/tournaments/${t.slug || t.id}`)}
                        >
                            {/* Top Banner / Image Placeholder */}
                            <div className="h-32 bg-gradient-to-br from-primary-500/10 to-blue-500/10 relative overflow-hidden">
                                {t.logoUrl && <img src={getImageUrl(t.logoUrl)} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50 blur-sm" />}
                                <div className="absolute top-2 right-2 flex items-center gap-2">
                                    {t.featured && t.featuredOrder != null && (
                                        <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-glass-bg backdrop-blur-2xl border border-navy/40 text-navy dark:text-navy-tint text-xs font-semibold shadow-lg">
                                            Featured · {t.featuredOrder}
                                        </div>
                                    )}
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-glass-bg backdrop-blur-2xl border border-glass-border shadow-lg text-foreground text-xs font-medium">
                                        <span className={`w-2 h-2 rounded-full ${t.status === TournamentStatus.ONGOING ? 'bg-green-500 animate-pulse' : t.status === TournamentStatus.COMPLETED ? 'bg-slate-400' : 'bg-navy'}`} />
                                        {formatTournamentStatus(t.status)}
                                    </div>
                                </div>
                            </div>

                            {/* Logo - Moved out of overflow-hidden header to prevent clipping */}
                            <div className="absolute top-24 left-6 w-16 h-16 rounded-xl bg-glass-bg border border-white/10 shadow-lg flex items-center justify-center overflow-hidden z-20">
                                {t.logoUrl ? (
                                    <img src={getImageUrl(t.logoUrl)} alt={t.name} className="w-full h-full object-cover" />
                                ) : (
                                    <Trophy className="w-8 h-8 text-navy dark:text-navy-tint" />
                                )}
                            </div>

                            <div className="pt-10 p-6 flex-1 flex flex-col">
                                <div className="mb-4">
                                    <div className="text-xs font-semibold text-primary-400 mb-1 uppercase tracking-wider">{t.seasonName}</div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-primary-400 transition-colors line-clamp-2">{t.name}</h3>
                                    <div className="text-sm text-muted-foreground mt-1">{t.level} • {formatCompetitionType(t.competitionType)}</div>
                                </div>

                                <div className="mt-auto space-y-3 pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-2 text-sm text-slate-400">
                                        <Calendar className="w-4 h-4 text-navy dark:text-navy-tint" />
                                        <span>{new Date(t.startDate).toLocaleDateString()} - {new Date(t.endDate).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-400">
                                        <MapPin className="w-4 h-4 text-navy dark:text-navy-tint" />
                                        <span className="truncate">{t.venue || 'Venue TBD'}</span>
                                    </div>
                                    {canToggleFeatured(t) && (
                                        <div className="pt-2 flex items-center justify-between border-t border-white/5">
                                            <span className="text-xs text-slate-400">Featured on home page</span>
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={Boolean(t.featured)}
                                                aria-label="Featured on home page"
                                                disabled={togglingId === t.id}
                                                onClick={(e) => handleToggleFeatured(e, t)}
                                                className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-navy"
                                                title="Featured on home page"
                                            >
                                                <span className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${t.featured ? 'bg-navy' : 'bg-slate-700'}`}>
                                                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${t.featured ? 'translate-x-4' : 'translate-x-0'}`} />
                                                </span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {(t.accessLevel === 'MANAGE' || user?.roles?.includes('ROLE_SUPER_ADMIN')) && (
                                    <div className="absolute top-4 right-auto left-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                        {t.accessLevel === 'MANAGE' && (
                                            <button
                                                onClick={(e) => handleEdit(e, t.id)}
                                                className="w-8 h-8 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-md hover:bg-white/20 text-white transition-colors border border-white/10"
                                                title="Edit Tournament"
                                            >
                                                <PencilSimple className="w-4 h-4" />
                                            </button>
                                        )}
                                        {user?.roles?.includes('ROLE_SUPER_ADMIN') && (
                                            <button
                                                onClick={(e) => handleDeleteClick(e, t)}
                                                className="w-8 h-8 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-md hover:bg-red-500/80 text-white hover:border-red-500/50 transition-colors border border-white/10"
                                                title="Delete Tournament"
                                            >
                                                <Trash className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}

            <ConfirmDeleteModal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setTournamentToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                title="Delete Tournament"
                message={`Are you sure you want to delete "${tournamentToDelete?.name}"? This action cannot be undone and will remove all matches, teams, and stats associated with this tournament.`}
                isDeleting={isDeleting}
            />
        </div>
    );
}
