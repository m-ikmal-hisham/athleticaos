import { useState, useEffect } from "react";
import { Button } from "../Button";
import { Card } from "../Card";
import { Player } from "../../store/players.store";

interface Props {
    isOpen: boolean;
    mode: "create" | "edit";
    initialPlayer: Player | null;
    onClose: () => void;
    onSubmit: (payload: {
        firstName: string;
        lastName: string;
        email: string;
    }) => void;
}

export function PlayerModal({ isOpen, mode, initialPlayer, onClose, onSubmit }: Props) {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");

    useEffect(() => {
        if (mode === "edit" && initialPlayer) {
            setFirstName(initialPlayer.firstName || "");
            setLastName(initialPlayer.lastName || "");
            setEmail(initialPlayer.email || "");
        } else {
            setFirstName("");
            setLastName("");
            setEmail("");
        }
    }, [mode, initialPlayer]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ firstName, lastName, email });
    };

    return (
        <div className="modal-backdrop">
            <Card>
                <h3>{mode === "create" ? "Add Player" : "Edit Player"}</h3>
                <form onSubmit={handleSubmit} className="modal-form">
                    <input
                        type="text"
                        placeholder="First name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="input-base"
                    />
                    <input
                        type="text"
                        placeholder="Last name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        className="input-base"
                    />
                    <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="input-base"
                    />
                    <div className="modal-actions">
                        <Button type="submit">
                            {mode === "create" ? "Save Player" : "Update Player"}
                        </Button>
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancel
                        </button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
