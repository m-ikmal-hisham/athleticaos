import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "../../components/GlassCard";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { useTeamsStore } from "../../store/teams.store";
import { StatusPill } from "../../components/StatusPill";
import { TableSkeleton } from "../../components/LoadingSkeleton";
import { EmptyState } from "../../components/EmptyState";
import { UsersThree, MagnifyingGlass } from "@phosphor-icons/react";
import { TeamModal } from "@/components/modals/TeamModal";
import { createTeam } from "@/api/teams.api";
import { PageHeader } from "../../components/PageHeader";

export default function Teams() {
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const {
        filteredTeams,
        loading,
        error,
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
    const organisations = Array.from(new Set(filteredTeams.map(t => t.organisationName).filter(Boolean)));
    const categories = Array.from(new Set(filteredTeams.map(t => t.category).filter(Boolean)));
    const ageGroups = Array.from(new Set(filteredTeams.map(t => t.ageGroup).filter(Boolean)));
    const states = Array.from(new Set(filteredTeams.map(t => t.state).filter(Boolean)));

    // Apply search filter
    const searchFilteredTeams = filteredTeams.filter(team => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return team.name.toLowerCase().includes(query) ||
            team.organisationName?.toLowerCase().includes(query) ||
            team.division?.toLowerCase().includes(query);
    });

    return (
        <div className="space-y-6">
            <PageHeader
                title="Teams"
                description="Manage rugby teams and squads"
                action={
                    <Button onClick={() => setIsCreateModalOpen(true)}>Add Team</Button>
                }
            />

            <GlassCard>
                <div className="p-0">
                    {/* Search Box */}
                    <div className="p-4 border-b border-glass-border">
                        <div className="relative">
                            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                            <Input
                                placeholder="Search by name, organisation, or division..."
                                className="pl-9 bg-glass-bg/50"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="p-4 border-b border-glass-border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <select
                            value={organisationFilter}
                            onChange={(e) => setOrganisationFilter(e.target.value)}
                            className="h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Filter by Organisation"
                        >
                            <option value="">All Organisations</option>
                            {organisations.map(org => (
                                <option key={org} value={org}>{org}</option>
                            ))}
                        </select>

                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Filter by Category"
                        >
                            <option value="">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>

                        <select
                            value={ageGroupFilter}
                            onChange={(e) => setAgeGroupFilter(e.target.value)}
                            className="h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            className="h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Filter by State"
                        >
                            <option value="">All States</option>
                            {states.map(state => (
                                <option key={state} value={state}>{state}</option>
                            ))}
                        </select>
                    </div>

                    {loading && (
                        <div className="p-4">
                            <TableSkeleton rows={5} cols={5} />
                        </div>
                    )}

                    {error && <p className="text-destructive p-4">{error}</p>}

                    {!loading && searchFilteredTeams.length === 0 && (
                        <div className="p-8">
                            <EmptyState
                                icon={UsersThree}
                                title="No teams found"
                                description="Adjust filters or add a new team."
                                actionLabel="Add Team"
                                onAction={() => setIsCreateModalOpen(true)}
                                className="border-none bg-transparent"
                            />
                        </div>
                    )}

                    {!loading && searchFilteredTeams.length > 0 && (
                        <div className="w-full overflow-auto">
                            <table className="glass-table w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border/60 text-muted-foreground text-sm">
                                        <th className="p-4 font-medium">Name</th>
                                        <th className="p-4 font-medium">Category</th>
                                        <th className="p-4 font-medium">Division</th>
                                        <th className="p-4 font-medium">State</th>
                                        <th className="p-4 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {searchFilteredTeams.map((t) => (
                                        <tr
                                            key={t.id}
                                            onClick={() => navigate(`/dashboard/teams/${t.slug || t.id}`)}
                                            className="border-b border-border/40 hover:bg-muted/30 transition-colors cursor-pointer"
                                        >
                                            <td className="p-4">{t.name}</td>
                                            <td className="p-4 text-muted-foreground">{t.category} ({t.ageGroup})</td>
                                            <td className="p-4">{t.division}</td>
                                            <td className="p-4">{t.state}</td>
                                            <td className="p-4">
                                                <StatusPill status={t.status} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </GlassCard>

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
