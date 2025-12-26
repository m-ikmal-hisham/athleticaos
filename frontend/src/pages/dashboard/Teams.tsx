import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "../../components/GlassCard";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { useTeamsStore } from "../../store/teams.store";
import { StatusPill } from "../../components/StatusPill";
import { UsersThree, MagnifyingGlass, Plus, Funnel } from "@phosphor-icons/react";
import { TeamModal } from "@/components/modals/TeamModal";
import { createTeam } from "@/api/teams.api";
import { PageHeader } from "../../components/PageHeader";
import { SmartFilterPills, FilterOption } from "../../components/SmartFilterPills";
import { EmptyState } from "../../components/EmptyState";

export default function Teams() {
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <PageHeader
                title="Teams"
                description="Manage rugby teams and squads"
                action={
                    <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Team
                    </Button>
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
                    <select
                        value={organisationFilter}
                        onChange={(e) => setOrganisationFilter(e.target.value)}
                        className="h-10 px-3 rounded-xl border border-glass-border bg-glass-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-shadow appearance-none"
                        aria-label="Filter by Organisation"
                    >
                        <option value="">All Organisations</option>
                        {organisations.map(org => (
                            <option key={org} value={org}>{org}</option>
                        ))}
                    </select>

                    <select
                        value={ageGroupFilter}
                        onChange={(e) => setAgeGroupFilter(e.target.value)}
                        className="h-10 px-3 rounded-xl border border-glass-border bg-glass-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-shadow appearance-none"
                        aria-label="Filter by Age Group"
                    >
                        <option value="">All Age Groups</option>
                        {ageGroups.map(age => (
                            <option key={age} value={age}>{age}</option>
                        ))}
                    </select>

                    <select
                        value={stateFilter}
                        onChange={(e) => setStateFilter(e.target.value)}
                        className="h-10 px-3 rounded-xl border border-glass-border bg-glass-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-shadow appearance-none"
                        aria-label="Filter by State"
                    >
                        <option value="">All States</option>
                        {states.map(state => (
                            <option key={state} value={state}>{state}</option>
                        ))}
                    </select>
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
                    actionLabel="Add Team"
                    onAction={() => setIsCreateModalOpen(true)}
                    className="min-h-[400px] border-dashed border-white/10"
                />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {searchFilteredTeams.map((t) => (
                        <GlassCard
                            key={t.id}
                            className="group relative flex flex-col p-5 hover:bg-white/5 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-glass-lg border-white/10"
                            onClick={() => navigate(`/dashboard/teams/${t.slug || t.id}`)}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 text-lg font-bold border border-orange-500/20">
                                    {t.name.substring(0, 2).toUpperCase()}
                                </div>
                                <StatusPill status={t.status} />
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

            <TeamModal
                isOpen={isCreateModalOpen}
                mode="create"
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={async (data) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    await createTeam(data as any);
                }}
                onSuccess={() => {
                    getTeams();
                }}
            />
        </div>
    );
}
