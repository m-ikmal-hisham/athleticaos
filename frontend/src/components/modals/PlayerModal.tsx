import { useState, useEffect } from "react";
import { Button } from "../Button";
import { Modal } from "../Modal";
import { Player, Gender, DominantSide } from "../../types";
import { fetchTeams } from "../../api/teams.api";
import { assignPlayerToTeam } from "../../api/playerTeams.api";
import toast from "react-hot-toast";

interface Props {
    isOpen: boolean;
    mode: "create" | "edit";
    initialPlayer: Player | null;
    onClose: () => void;
    onSubmit: (payload: any) => void;
}

interface Team {
    id: string;
    name: string;
    organisationName?: string;
}

export function PlayerModal({ isOpen, mode, initialPlayer, onClose, onSubmit }: Props) {
    // PII Fields
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [gender, setGender] = useState<Gender>(Gender.MALE);
    const [dob, setDob] = useState("");
    const [identificationType, setIdentificationType] = useState("IC");
    const [identificationValue, setIdentificationValue] = useState("");
    // const [icOrPassport, setIcOrPassport] = useState(""); // Removed in favor of active fields
    const [nationality, setNationality] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");

    // Rugby Fields
    const [status, setStatus] = useState("ACTIVE");
    const [heightCm, setHeightCm] = useState("");
    const [weightKg, setWeightKg] = useState("");
    const [dominantHand, setDominantHand] = useState<DominantSide>(DominantSide.RIGHT);
    const [dominantLeg, setDominantLeg] = useState<DominantSide>(DominantSide.RIGHT);

    // Team assignment fields
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState("");
    const [jerseyNumber, setJerseyNumber] = useState("");
    const [position, setPosition] = useState("");
    const [showTeamAssignment, setShowTeamAssignment] = useState(false);

    useEffect(() => {
        if (mode === "edit" && initialPlayer) {
            // PII
            setFirstName(initialPlayer.firstName || "");
            setLastName(initialPlayer.lastName || "");
            setEmail(initialPlayer.email || "");
            setGender(initialPlayer.gender || Gender.MALE);
            setDob(initialPlayer.dob || "");
            setIdentificationType(initialPlayer.identificationType || "IC");
            setIdentificationValue(initialPlayer.identificationValue || initialPlayer.icOrPassport || "");
            // setIcOrPassport(initialPlayer.icOrPassport || ""); // Deprecated state
            setNationality(initialPlayer.nationality || "");
            setPhone(initialPlayer.phone || "");
            setAddress(initialPlayer.address || "");

            // Rugby
            setStatus(initialPlayer.status || "ACTIVE");
            setHeightCm(initialPlayer.heightCm?.toString() || "");
            setWeightKg(initialPlayer.weightKg?.toString() || "");
            setDominantHand(initialPlayer.dominantHand || DominantSide.RIGHT);
            setDominantLeg(initialPlayer.dominantLeg || DominantSide.RIGHT);
        } else {
            // Reset all
            setFirstName("");
            setLastName("");
            setEmail("");
            setGender(Gender.MALE);
            setDob("");
            setIdentificationType("IC");
            setIdentificationValue("");
            // setIcOrPassport("");
            setNationality("");
            setPhone("");
            setAddress("");
            setStatus("ACTIVE");
            setHeightCm("");
            setWeightKg("");
            setDominantHand(DominantSide.RIGHT);
            setDominantLeg(DominantSide.RIGHT);
        }

        // Reset team assignment
        setSelectedTeamId("");
        setJerseyNumber("");
        setPosition("");
        setShowTeamAssignment(false);
    }, [mode, initialPlayer]);

    useEffect(() => {
        if (isOpen && mode === "edit") {
            fetchTeams().then(res => {
                setTeams(res.data || []);
            }).catch(err => {
                console.error("Failed to load teams:", err);
            });
        }
    }, [isOpen, mode]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const payload: any = {
            // PII - all required fields
            firstName,
            lastName,
            email,
            gender: String(gender), // Ensure it's a string
            dob,
            icOrPassport: identificationValue, // Legacy mapping for validation
            identificationType,
            identificationValue,
            // icOrPassport, // Always include (disabled in edit mode, so value is preserved)
            nationality,
            phone: phone || undefined,
            address: address || undefined,
            // Rugby
            status,
            heightCm: heightCm ? parseInt(heightCm) : undefined,
            weightKg: weightKg ? parseInt(weightKg) : undefined,
            dominantHand: dominantHand ? String(dominantHand) : undefined,
            dominantLeg: dominantLeg ? String(dominantLeg) : undefined
        };

        console.log('Submitting player payload:', JSON.stringify(payload, null, 2));
        onSubmit(payload);
    };

    const handleTeamAssignment = async () => {
        if (!initialPlayer?.id || !selectedTeamId) {
            toast.error("Please select a team");
            return;
        }

        try {
            await assignPlayerToTeam({
                playerId: String(initialPlayer.id),
                teamId: selectedTeamId,
                jerseyNumber: jerseyNumber ? parseInt(jerseyNumber) : undefined,
                position: position || undefined
            });
            toast.success("Player assigned to team successfully!");
            setSelectedTeamId("");
            setJerseyNumber("");
            setPosition("");
            setShowTeamAssignment(false);
        } catch (err: any) {
            const errorMsg = err?.response?.data?.message || err?.message || "Failed to assign player to team";
            toast.error(errorMsg);
            console.error("Assignment error:", err);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={mode === "create" ? "Add Player" : "Edit Player"}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Personal Information Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wider border-b border-white/10 pb-2">
                        Personal Information
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted">First Name *</label>
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                required
                                className="input-base w-full"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted">Last Name *</label>
                            <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                required
                                className="input-base w-full"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted">Email *</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="input-base w-full"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted">Phone</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="input-base w-full"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted">Date of Birth *</label>
                            <input
                                type="date"
                                value={dob}
                                onChange={(e) => setDob(e.target.value)}
                                required
                                className="input-base w-full"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted">Gender *</label>
                            <select
                                value={gender}
                                onChange={(e) => setGender(e.target.value as Gender)}
                                className="input-base w-full"
                                required
                            >
                                <option value={Gender.MALE}>Male</option>
                                <option value={Gender.FEMALE}>Female</option>
                                <option value={Gender.OTHER}>Other</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted">Identification Type</label>
                            <select
                                value={identificationType}
                                onChange={(e) => setIdentificationType(e.target.value)}
                                className="input-base w-full"
                            >
                                <option value="IC">IC</option>
                                <option value="PASSPORT">Passport</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted">
                                Identification Value {mode === 'create' && '*'}
                            </label>
                            <input
                                type="text"
                                value={identificationValue}
                                onChange={(e) => setIdentificationValue(e.target.value)}
                                required={mode === 'create'}
                                // Disabled in edit mode removed to allow updates as per requirement
                                className="input-base w-full"
                                placeholder="Identification Number"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted">Nationality *</label>
                            <input
                                type="text"
                                value={nationality}
                                onChange={(e) => setNationality(e.target.value)}
                                required
                                className="input-base w-full"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-muted">Address</label>
                        <textarea
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="input-base w-full h-20 resize-none"
                        />
                    </div>
                </div>

                {/* Rugby Profile Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wider border-b border-white/10 pb-2">
                        Rugby Profile
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted">Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="input-base w-full"
                            >
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                                <option value="BANNED">Banned</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted">Height (cm)</label>
                            <input
                                type="number"
                                value={heightCm}
                                onChange={(e) => setHeightCm(e.target.value)}
                                className="input-base w-full"
                                min="0"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted">Weight (kg)</label>
                            <input
                                type="number"
                                value={weightKg}
                                onChange={(e) => setWeightKg(e.target.value)}
                                className="input-base w-full"
                                min="0"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted">Dominant Hand</label>
                            <select
                                value={dominantHand}
                                onChange={(e) => setDominantHand(e.target.value as DominantSide)}
                                className="input-base w-full"
                            >
                                <option value={DominantSide.RIGHT}>Right</option>
                                <option value={DominantSide.LEFT}>Left</option>
                                <option value={DominantSide.BOTH}>Both</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted">Dominant Leg</label>
                            <select
                                value={dominantLeg}
                                onChange={(e) => setDominantLeg(e.target.value as DominantSide)}
                                className="input-base w-full"
                            >
                                <option value={DominantSide.RIGHT}>Right</option>
                                <option value={DominantSide.LEFT}>Left</option>
                                <option value={DominantSide.BOTH}>Both</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Team Assignment Section - Only in Edit Mode */}
                {mode === "edit" && initialPlayer && (
                    <div className="pt-4 border-t border-white/10">
                        <button
                            type="button"
                            onClick={() => setShowTeamAssignment(!showTeamAssignment)}
                            className="text-sm text-primary hover:text-primary-glow font-medium transition-colors"
                        >
                            {showTeamAssignment ? "Hide Team Assignment" : "Assign to Team"}
                        </button>

                        {showTeamAssignment && (
                            <div className="mt-4 space-y-4 p-4 bg-white/5 rounded-lg border border-white/10">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-muted">Select Team</label>
                                    <select
                                        value={selectedTeamId}
                                        onChange={(e) => setSelectedTeamId(e.target.value)}
                                        className="input-base w-full"
                                    >
                                        <option value="">Choose a team...</option>
                                        {teams.map(team => (
                                            <option key={team.id} value={team.id}>
                                                {team.name} {team.organisationName && `(${team.organisationName})`}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-muted">Jersey Number</label>
                                        <input
                                            type="number"
                                            placeholder="7"
                                            value={jerseyNumber}
                                            onChange={(e) => setJerseyNumber(e.target.value)}
                                            className="input-base w-full"
                                            min="1"
                                            max="99"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-muted">Position</label>
                                        <input
                                            type="text"
                                            placeholder="Fly-half"
                                            value={position}
                                            onChange={(e) => setPosition(e.target.value)}
                                            className="input-base w-full"
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="button"
                                    onClick={handleTeamAssignment}
                                    className="w-full"
                                    disabled={!selectedTeamId}
                                >
                                    Assign to Team
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <button type="button" onClick={onClose} className="btn-secondary">
                        Cancel
                    </button>
                    <Button type="submit">
                        {mode === "create" ? "Save Player" : "Update Player"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
