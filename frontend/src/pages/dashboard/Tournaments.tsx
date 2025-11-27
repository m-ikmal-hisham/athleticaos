import { useEffect } from "react";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { useTournamentsStore } from "../../store/tournaments.store";
import { StatusPill } from "../../components/StatusPill";

export default function Tournaments() {
    const { tournaments, loading, error, getTournaments } = useTournamentsStore();

    useEffect(() => {
        getTournaments();
    }, [getTournaments]);

    return (
        <Card>
            <div className="card-header-row" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <h2>Tournaments</h2>
                    <p className="text-muted-foreground">Overview of rugby competitions</p>
                </div>
            </div>

            {loading && <p>Loading tournaments…</p>}
            {error && <p>{error}</p>}

            {!loading && tournaments.length === 0 && <p>No tournaments found</p>}

            {!loading && tournaments.length > 0 && (
                <table className="glass-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Level</th>
                            <th>Start Date</th>
                            <th>Status</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {tournaments.map((t) => (
                            <tr key={t.id}>
                                <td>{t.name}</td>
                                <td>{t.level}</td>
                                <td>{new Date(t.startDate).toLocaleDateString()}</td>
                                <td>
                                    <StatusPill status={t.status} />
                                </td>
                                <td>
                                    <Button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                                        View details
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </Card>
    );
}
