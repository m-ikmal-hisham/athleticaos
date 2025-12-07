import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { useTeamsStore } from "../../store/teams.store";
import { StatusPill } from "../../components/StatusPill";
import { TableSkeleton } from "../../components/LoadingSkeleton";
import { EmptyState } from "../../components/EmptyState";
import { Users2 } from "lucide-react";

export default function Teams() {
    const navigate = useNavigate();
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

    return (
        <Card>
            <div className="card-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h2>Teams</h2>
                    <p className="text-muted-foreground">Manage rugby teams and squads</p>
                </div>
                <div title="Coming soon">
                    <Button disabled>Add Team</Button>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <select
                    value={organisationFilter}
                    onChange={(e) => setOrganisationFilter(e.target.value)}
                    className="input-base"
                    style={{ cursor: 'pointer' }}
                >
                    <option value="">All Organisations</option>
                    {organisations.map(org => (
                        <option key={org} value={org}>{org}</option>
                    ))}
                </select>

                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="input-base"
                    style={{ cursor: 'pointer' }}
                >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>

                <select
                    value={ageGroupFilter}
                    onChange={(e) => setAgeGroupFilter(e.target.value)}
                    className="input-base"
                    style={{ cursor: 'pointer' }}
                >
                    <option value="">All Age Groups</option>
                    {ageGroups.map(age => (
                        <option key={age} value={age}>{age}</option>
                    ))}
                </select>

                <select
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value)}
                    className="input-base"
                    style={{ cursor: 'pointer' }}
                >
                    <option value="">All States</option>
                    {states.map(state => (
                        <option key={state} value={state}>{state}</option>
                    ))}
                </select>
            </div>

            {loading && (
                <div className="py-4">
                    <TableSkeleton rows={5} cols={5} />
                </div>
            )}

            {error && <p className="text-destructive py-4">{error}</p>}

            {!loading && filteredTeams.length === 0 && (
                <EmptyState
                    icon={Users2}
                    title="No teams found"
                    description="Adjust filters or add a new team."
                    actionLabel="Add Team"
                    onAction={() => { }} // Placeholder as Add Team is disabled
                    className="border-none bg-transparent"
                />
            )}

            {!loading && filteredTeams.length > 0 && (
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
                            {filteredTeams.map((t) => (
                                <tr
                                    key={t.id}
                                    onClick={() => navigate(`/dashboard/teams/${t.slug || t.id}`)}
                                    style={{ cursor: 'pointer' }}
                                    className="border-b border-border/40 hover:bg-muted/30 transition-colors"
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
        </Card>
    );
}
