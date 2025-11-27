import { useEffect } from "react";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { usePlayersStore } from "../../store/players.store";
import { PlayerModal } from "../../components/modals/PlayerModal";
import { StatusPill } from "../../components/StatusPill";

export default function Players() {
    const {
        players,
        loading,
        error,
        getPlayers,
        isModalOpen,
        mode,
        selectedPlayer,
        openCreateModal,
        openEditModal,
        closeModal,
        savePlayer,
        toggleStatus
    } = usePlayersStore();

    useEffect(() => {
        getPlayers();
    }, [getPlayers]);

    return (
        <Card>
            <div className="card-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h2>Players</h2>
                    <p className="text-muted-foreground">Manage all registered rugby players</p>
                </div>
                <Button onClick={openCreateModal}>Add Player</Button>
            </div>

            {loading && <p>Loading players…</p>}
            {error && <p>{error}</p>}

            {!loading && players.length === 0 && <p>No players found</p>}

            {!loading && players.length > 0 && (
                <table className="glass-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Club</th>
                            <th>Status</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {players.map((p) => (
                            <tr key={p.id}>
                                <td>{p.firstName} {p.lastName}</td>
                                <td>{p.email}</td>
                                <td>{p.role || "PLAYER"}</td>
                                <td>{p.clubName || "—"}</td>
                                <td>
                                    <StatusPill
                                        status={p.status || "ACTIVE"}
                                        onClick={() => toggleStatus(p.id)}
                                    />
                                </td>
                                <td>
                                    <button onClick={() => openEditModal(p)} style={{ background: 'none', border: 'none', color: 'var(--athos-blue)', cursor: 'pointer' }}>Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <PlayerModal
                isOpen={isModalOpen}
                mode={mode}
                initialPlayer={selectedPlayer}
                onClose={closeModal}
                onSubmit={savePlayer}
            />
        </Card>
    );
}
