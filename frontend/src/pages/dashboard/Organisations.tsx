import { useEffect } from "react";
import { Card } from "../../components/Card";
import { useOrganisationsStore } from "../../store/organisations.store";
import { StatusPill } from "../../components/StatusPill";

export default function Organisations() {
    const { organisations, loading, error, getOrganisations } = useOrganisationsStore();

    useEffect(() => {
        getOrganisations();
    }, [getOrganisations]);

    return (
        <Card>
            <div className="card-header-row" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <h2>Organisations</h2>
                    <p className="text-muted-foreground">Unions, state associations, clubs and schools</p>
                </div>
            </div>

            {loading && <p>Loading organisations…</p>}
            {error && <p>{error}</p>}

            {!loading && organisations.length === 0 && <p>No organisations found</p>}

            {!loading && organisations.length > 0 && (
                <table className="glass-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>State</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {organisations.map((org) => (
                            <tr key={org.id}>
                                <td style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    {org.logoUrl && (
                                        <img
                                            src={org.logoUrl}
                                            alt={org.name}
                                            style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                                        />
                                    )}
                                    {org.name}
                                </td>
                                <td>{org.type}</td>
                                <td>{org.state}</td>
                                <td>
                                    <StatusPill status={org.status} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </Card>
    );
}
