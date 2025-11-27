import { useEffect } from "react";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { useTeamsStore } from "../../store/teams.store";
import { StatusPill } from "../../components/StatusPill";

export default function Teams() {
    const { teams, loading, error, getTeams } = useTeamsStore();

    useEffect(() => {
        getTeams();
    }, [getTeams]);

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

            {loading && <p>Loading teams…</p>}
            {error && <p>{error}</p>}

            {!loading && teams.length === 0 && <p>No teams found</p>}

            {!loading && teams.length > 0 && (
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
                        {teams.map((t) => (
                            <tr key={t.id}>
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
