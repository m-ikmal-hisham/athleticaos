import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { useTeamsStore } from "../../store/teams.store";
import { StatusPill } from "../../components/StatusPill";

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

            {loading && <p>Loading teams…</p>}
            {error && <p>{error}</p>}

            {!loading && filteredTeams.length === 0 && <p>No teams found</p>}

            {!loading && filteredTeams.length > 0 && (
                <table className="glass-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Category</th>
                            <th>Division</th>
                            <th>State</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTeams.map((t) => (
                            <tr
                                key={t.id}
                                onClick={() => navigate(`/dashboard/teams/${t.slug || t.id}`)}
                                style={{ cursor: 'pointer' }}
                            >
                                <td>{t.name}</td>
                                <td>{t.category} ({t.ageGroup})</td>
                                <td>{t.division}</td>
                                <td>{t.state}</td>
                                <td>
                                    <StatusPill status={t.status} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </Card>
    );
}
