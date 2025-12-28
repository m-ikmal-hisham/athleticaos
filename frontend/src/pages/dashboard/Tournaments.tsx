import { useEffect, useState, useMemo } from "react";
import { GlassCard } from "../../components/GlassCard";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlass, Plus, Funnel, Trophy, Calendar, MapPin, PencilSimple } from "@phosphor-icons/react";
import { TournamentStatus } from "@/types";
import { useTournamentsStore } from "../../store/tournaments.store";
import { StatusPill } from "../../components/StatusPill";
import { useAuthStore } from "@/store/auth.store";
import { PageHeader } from "../../components/PageHeader";
import { SmartFilterPills, FilterOption } from "@/components/SmartFilterPills";
import { EmptyState } from "@/components/EmptyState";

export default function Tournaments() {
    const { tournaments, loading, getTournaments } = useTournamentsStore();
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [seasonFilter, setSeasonFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [levelFilter, setLevelFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        getTournaments();
    }, [getTournaments]);

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
                    <select
                        value={seasonFilter}
                        onChange={(e) => setSeasonFilter(e.target.value)}
                        className="h-10 px-3 rounded-xl border border-glass-border bg-glass-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-shadow appearance-none"
                        aria-label="Filter by Season"
                    >
                        <option value="">All Seasons</option>
                        {seasons.map(season => (
                            <option key={season} value={season}>{season}</option>
                        ))}
                    </select>

                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="h-10 px-3 rounded-xl border border-glass-border bg-glass-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-shadow appearance-none"
                        aria-label="Filter by Type"
                    >
                        <option value="">All Types</option>
                        {types.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>

                    <select
                        value={levelFilter}
                        onChange={(e) => setLevelFilter(e.target.value)}
                        className="h-10 px-3 rounded-xl border border-glass-border bg-glass-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-shadow appearance-none"
                        aria-label="Filter by Level"
                    >
                        <option value="">All Levels</option>
                        {levels.map(level => (
                            <option key={level} value={level}>{level}</option>
                        ))}
                    </select>
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
                                {t.logoUrl && <img src={t.logoUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50 blur-sm" />}
                                <div className="absolute top-4 right-4">
                                    <div className="shadow-lg backdrop-blur-md rounded-full">
                                        <StatusPill status={t.status} />
                                    </div>
                                </div>
                                <div className="absolute -bottom-6 left-6 w-16 h-16 rounded-xl bg-glass-bg border border-white/10 shadow-lg flex items-center justify-center overflow-hidden z-10">
                                    {t.logoUrl ? (
                                        <img src={t.logoUrl} alt={t.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <Trophy className="w-8 h-8 text-primary-400" weight="duotone" />
                                    )}
                                </div>
                            </div>

                            <div className="pt-8 p-6 flex-1 flex flex-col">
                                <div className="mb-4">
                                    <div className="text-xs font-semibold text-primary-400 mb-1 uppercase tracking-wider">{t.seasonName}</div>
                                    <h3 className="text-xl font-bold text-white group-hover:text-primary-400 transition-colors line-clamp-2">{t.name}</h3>
                                    <div className="text-sm text-muted-foreground mt-1">{t.level} • {t.competitionType}</div>
                                </div>

                                <div className="mt-auto space-y-3 pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-2 text-sm text-slate-400">
                                        <Calendar className="w-4 h-4 text-primary-500" />
                                        <span>{new Date(t.startDate).toLocaleDateString()} - {new Date(t.endDate).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-400">
                                        <MapPin className="w-4 h-4 text-primary-500" />
                                        <span className="truncate">{t.venue || 'Venue TBD'}</span>
                                    </div>
                                </div>

                                {isAdmin && (
                                    <div className="absolute top-4 right-auto left-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            size="sm"
                                            className="h-8 bg-black/50 hover:bg-black/70 backdrop-blur-md border hover:border-white/20 text-white"
                                            onClick={(e) => handleEdit(e, t.id)}
                                        >
                                            <PencilSimple className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}
        </div>
    );
}
