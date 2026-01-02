import { useEffect, useState, useMemo } from "react";
import { SearchableSelect } from "../../components/SearchableSelect";
import { deleteTeam } from "../../api/teams.api";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "../../components/GlassCard";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { useTeamsStore } from "../../store/teams.store";
import { StatusPill } from "../../components/StatusPill";
import { UsersThree, MagnifyingGlass, Plus, Funnel, PencilSimple, Trash } from "@phosphor-icons/react";
import toast from "react-hot-toast";
import { PageHeader } from "../../components/PageHeader";
import { SmartFilterPills, FilterOption } from "../../components/SmartFilterPills";
import { EmptyState } from "../../components/EmptyState";
import { useAuthStore } from "../../store/auth.store";

export default function Teams() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const isAdmin = user?.roles?.some(r => ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN'].includes(r));

    const [searchQuery, setSearchQuery] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const {
        filteredTeams,
        loading,
        getTeams,
        organisationFilter,
        categoryFilter,
        ageGroupFilter,
        stateFilter,
        setOrganisationFilter,
        setCategoryFilter,
        setAgeGroupFilter,
        setStateFilter
    } = useTeamsStore();

    useEffect(() => {
        getTeams();
    }, [getTeams]);

    // Extract unique values for filters
    const organisations = useMemo(() => Array.from(new Set(filteredTeams.map(t => t.organisationName).filter(Boolean))), [filteredTeams]);
    const categories = useMemo(() => Array.from(new Set(filteredTeams.map(t => t.category).filter(Boolean))), [filteredTeams]);
    const ageGroups = useMemo(() => Array.from(new Set(filteredTeams.map(t => t.ageGroup).filter(Boolean))), [filteredTeams]);
    const states = useMemo(() => Array.from(new Set(filteredTeams.map(t => t.state).filter(Boolean))), [filteredTeams]);

    // Apply search filter
    const searchFilteredTeams = filteredTeams.filter(team => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return team.name.toLowerCase().includes(query) ||
            team.organisationName?.toLowerCase().includes(query) ||
            team.division?.toLowerCase().includes(query);
    });

    // Smart Filter Options for Category
    const categoryOptions: FilterOption[] = useMemo(() => {
        return categories.map(cat => ({
            id: cat,
            label: cat,
            count: filteredTeams.filter(t => t.category === cat).length
        }));
    }, [categories, filteredTeams]);

    const handleAdd = () => {
        navigate('/dashboard/teams/new');
    };

    const handleEdit = (e: React.MouseEvent, teamId: string) => {
        e.stopPropagation();
        navigate(`/dashboard/teams/${teamId}/edit`);
    };

    const handleDelete = async (e: React.MouseEvent, teamId: string) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this team?")) {
            try {
                await deleteTeam(teamId);
                toast.success("Team deleted successfully");
                getTeams();
            } catch (error) {
                console.error("Failed to delete team", error);
                toast.error("Failed to delete team");
            }
        }
    };

    // Use ID preferably if slug is missing, but backend usually provides slug. 
    // Ideally we want to use /teams/:slug for public facing, but /teams/:id might be safer for admin if names change.
    // However, AppRoutes defines /teams/:slug -> TeamDetail.
    // I will check if TeamDetail handles ID, but for now assuming slug is primary for Detail.
    // Update: TeamDetail typically uses slug from URL.
    const handleCardClick = (team: any) => {
        // Fallback to ID if slug is missing (though slugs should exist)
        navigate(`/dashboard/teams/${team.slug || team.id}`);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <PageHeader
                title="Teams"
                description="Manage rugby teams and squads"
                action={
                    isAdmin && (
                        <Button onClick={handleAdd} className="gap-2">
                            <Plus className="w-4 h-4" />
                            Add Team
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
                                placeholder="Search by name, organisation..."
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
                        options={categoryOptions}
                        selectedId={categoryFilter || null}
                        onSelect={(id) => setCategoryFilter(id || "")}
                        className="w-full md:w-auto max-w-full overflow-hidden"
                    />
                </div>

                {/* Secondary Filters - Collapsible on mobile, always visible or grid on desktop if needed */}
                <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 transition-all duration-300 ${showFilters ? 'block' : 'hidden md:grid'}`}>
                    <SearchableSelect
                        placeholder="All Organisations"
                        value={organisationFilter}
                        onChange={(value) => setOrganisationFilter(value as string)}
                        options={[{ value: "", label: "All Organisations" }, ...organisations.map(org => ({ value: org || "", label: org || "Unknown" }))]}
                    />

                    <SearchableSelect
                        placeholder="All Age Groups"
                        value={ageGroupFilter}
                        onChange={(value) => setAgeGroupFilter(value as string)}
                        options={[{ value: "", label: "All Age Groups" }, ...ageGroups.map(age => ({ value: age || "", label: age || "Unknown" }))]}
                    />

                    <SearchableSelect
                        placeholder="All States"
                        value={stateFilter}
                        onChange={(value) => setStateFilter(value as string)}
                        options={[{ value: "", label: "All States" }, ...states.map(state => ({ value: state || "", label: state || "Unknown" }))]}
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <GlassCard key={i} className="h-40 animate-pulse flex flex-col p-6">
                            <div className="w-12 h-12 rounded-full bg-white/5 mb-4" />
                            <div className="w-3/4 h-5 bg-white/5 rounded mb-2" />
                            <div className="w-1/2 h-4 bg-white/5 rounded" />
                        </GlassCard>
                    ))}
                </div>
            ) : searchFilteredTeams.length === 0 ? (
                <EmptyState
                    icon={UsersThree}
                    title="No teams found"
                    description="Adjust filters or add a new team."
                    actionLabel={isAdmin ? "Add Team" : undefined}
                    onAction={isAdmin ? handleAdd : undefined}
                    className="min-h-[400px] border-dashed border-white/10"
                />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {searchFilteredTeams.map((t) => (
                        <GlassCard
                            key={t.id}
                            className="group relative flex flex-col p-5 hover:bg-white/5 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-glass-lg border-white/10"
                            onClick={() => handleCardClick(t)}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 overflow-hidden">
                                    {t.logoUrl ? (
                                        <img
                                            src={t.logoUrl.startsWith('http') ? t.logoUrl : `${(import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1').replace('/api/v1', '')}${t.logoUrl}`}
                                            alt={t.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-orange-500 text-lg font-bold">
                                            {t.name.substring(0, 2).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <StatusPill status={t.status} />
                                    {isAdmin && (
                                        <>
                                            <button
                                                onClick={(e) => handleEdit(e, t.id)}
                                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                                                aria-label="Edit team"
                                            >
                                                <PencilSimple className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(e, t.id)}
                                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-colors"
                                                aria-label="Delete team"
                                            >
                                                <Trash className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1 mb-4 flex-1">
                                <h3 className="font-semibold text-lg leading-tight truncate text-foreground group-hover:text-primary-400 transition-colors">
                                    {t.name}
                                </h3>
                                <p className="text-sm text-muted-foreground truncate">{t.organisationName || "No Organisation"}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/5 text-xs text-muted-foreground">
                                <div>
                                    <span className="block text-[10px] uppercase tracking-wider opacity-60">Category</span>
                                    <span className="font-medium text-foreground">{t.category} ({t.ageGroup})</span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-[10px] uppercase tracking-wider opacity-60">State</span>
                                    <span className="font-medium text-foreground">{t.state || "-"}</span>
                                </div>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}
        </div>
    );
}
