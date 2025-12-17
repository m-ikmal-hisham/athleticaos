import { useState, useEffect } from "react";
import { Button } from "../Button";
import { AddressInputs, AddressData } from "../AddressInputs";
import { Modal } from "../Modal";
import { Player, Gender, DominantSide } from "../../types";
import { fetchTeams } from "../../api/teams.api";
import { fetchOrganisations, Organisation } from "../../api/organisations.api";
import { assignPlayerToTeam } from "../../api/playerTeams.api";
import toast from "react-hot-toast";
import { calculateAge } from "../../utils/date";

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
    organisationId?: string;
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
    const [nationality, setNationality] = useState("");
    const [phone, setPhone] = useState("");

    // Structured Address Fields
    const [addressLine1, setAddressLine1] = useState("");
    const [addressLine2, setAddressLine2] = useState("");
    const [postcode, setPostcode] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [country, setCountry] = useState("");

    // Rugby Fields
    const [status, setStatus] = useState("ACTIVE");
    const [heightCm, setHeightCm] = useState("");
    const [weightKg, setWeightKg] = useState("");
    const [dominantHand, setDominantHand] = useState<DominantSide>(DominantSide.RIGHT);
    const [dominantLeg, setDominantLeg] = useState<DominantSide>(DominantSide.RIGHT);

    // Team assignment fields
    const [organisations, setOrganisations] = useState<Organisation[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);

    const [selectedOrganisationId, setSelectedOrganisationId] = useState(""); // Filter
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
            setNationality(initialPlayer.nationality || "");
            setPhone(initialPlayer.phone || "");

            // Address
            setAddressLine1(initialPlayer.addressLine1 || initialPlayer.address || "");
            setAddressLine2(initialPlayer.addressLine2 || "");
            setCity(initialPlayer.city || "");
            setPostcode(initialPlayer.postcode || "");
            setState(initialPlayer.state || "");
            setCountry(initialPlayer.country || "");

            // Rugby
            setStatus(initialPlayer.status || "ACTIVE");
            setHeightCm(initialPlayer.heightCm?.toString() || "");
            setWeightKg(initialPlayer.weightKg?.toString() || "");
            setDominantHand(initialPlayer.dominantHand || DominantSide.RIGHT);
            setDominantLeg(initialPlayer.dominantLeg || DominantSide.RIGHT);

            // Pre-fill assignment if exists
            if (initialPlayer.organisationId) setSelectedOrganisationId(initialPlayer.organisationId);
            // Note: Currently Player object doesn't have active team ID directly exposed easily besides teamNames array 
            // unless we enhance getPlayerById response. 
            // For now, we leave assignment blank on edit unless we fetch more details, OR explicit "Assign new team" action.

        } else {
            // Reset all
            setFirstName("");
            setLastName("");
            setEmail("");
            setGender(Gender.MALE);
            setDob("");
            setIdentificationType("IC");
            setIdentificationValue("");
            setNationality("");
            setPhone("");

            setAddressLine1("");
            setAddressLine2("");
            setCity("");
            setPostcode("");
            setState("");
            setCountry("");

            setStatus("ACTIVE");
            setHeightCm("");
            setWeightKg("");
            setDominantHand(DominantSide.RIGHT);
            setDominantLeg(DominantSide.RIGHT);

            setSelectedOrganisationId("");
        }

        // Reset team assignment local state
        setSelectedTeamId("");
        setJerseyNumber("");
        setPosition("");
        // Show team assignment by default in CREATE mode usually not, but requested to allow immediate selection
        setShowTeamAssignment(mode === "create");
    }, [mode, initialPlayer]);

    useEffect(() => {
        if (isOpen) {
            // Load Organisations and Teams
            Promise.all([
                fetchOrganisations(),
                fetchTeams()
            ]).then(([orgsRes, teamsRes]: [any, any]) => {
                // Check if orgsRes is array or object with data property
                const orgsData = Array.isArray(orgsRes) ? orgsRes : (orgsRes.data || []);
                // Check if teamsRes is array or object with data property
                const teamsData = Array.isArray(teamsRes) ? teamsRes : (teamsRes.data || []);

                setOrganisations(orgsData);
                setTeams(teamsData);
            }).catch(err => {
                console.error("Failed to load reference data:", err);
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Filter teams based on selected organisation
    const filteredTeams = selectedOrganisationId
        ? teams.filter(t => t.organisationId === selectedOrganisationId)
        : teams;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const payload: any = {
            // PII
            firstName,
            lastName,
            email,
            gender: String(gender),
            dob,
            identificationType,
            identificationValue,
            icOrPassport: identificationValue, // Legacy
            nationality,
            phone: phone || undefined,

            // Structured Address
            addressLine1,
            addressLine2: addressLine2 || undefined,
            city,
            postcode,
            state,
            country,
            address: addressLine1, // Legacy check

            // Rugby
            status,
            heightCm: heightCm ? parseInt(heightCm) : undefined,
            weightKg: weightKg ? parseInt(weightKg) : undefined,
            dominantHand: dominantHand ? String(dominantHand) : undefined,
            dominantLeg: dominantLeg ? String(dominantLeg) : undefined,

            // Immediate Assignment (Create Mode)
            teamId: (mode === 'create' && selectedTeamId) ? selectedTeamId : undefined,
            organisationId: (mode === 'create' && selectedOrganisationId) ? selectedOrganisationId : undefined
        };

        console.log('Submitting player payload:', JSON.stringify(payload, null, 2));
        onSubmit(payload);
    };

    const handleAssignTeamDirectly = async () => {
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
            if (mode === 'edit') setShowTeamAssignment(false);
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

                {/* Personal Information */}
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
                            <label className="text-sm font-medium text-muted">
                                Date of Birth *
                                {dob && <span className="ml-2 text-primary text-xs font-normal">({calculateAge(dob)} yrs)</span>}
                            </label>
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
                                className="input-base w-full"
                                placeholder="ID / Passport Number"
                            />
                        </div>
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

                {/* Structured Address */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">
                        Address Details
                    </h3>

                    <AddressInputs
                        data={{
                            addressLine1,
                            addressLine2,
                            city,
                            postcode,
                            state,
                            country
                        }}
                        onChange={(newData: AddressData) => {
                            setAddressLine1(newData.addressLine1 || '');
                            setAddressLine2(newData.addressLine2 || '');
                            setCity(newData.city || '');
                            setPostcode(newData.postcode || '');
                            setState(newData.state || '');
                            setCountry(newData.country || '');
                        }}
                    />
                </div>

                {/* Rugby Profile */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">
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

                {/* Team Assignment - Always visible now if toggled or in create mode */}
                <div className="pt-4 border-t border-white/10">
                    <button
                        type="button"
                        onClick={() => setShowTeamAssignment(!showTeamAssignment)}
                        className="text-sm text-primary hover:text-primary-glow font-medium transition-colors"
                    >
                        {showTeamAssignment ? "Hide Team Assignment" : (mode === 'create' ? "Assign Team Now" : "Assign to Team")}
                    </button>

                    {showTeamAssignment && (
                        <div className="mt-4 space-y-4 p-4 bg-white/5 rounded-lg border border-white/10">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted">Filter by Organisation</label>
                                <select
                                    value={selectedOrganisationId}
                                    onChange={(e) => {
                                        setSelectedOrganisationId(e.target.value);
                                        setSelectedTeamId(""); // Reset team when org changes
                                    }}
                                    className="input-base w-full"
                                >
                                    <option value="">All Organisations</option>
                                    {organisations.map(org => (
                                        <option key={org.id} value={org.id}>{org.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted">Select Team</label>
                                <select
                                    value={selectedTeamId}
                                    onChange={(e) => setSelectedTeamId(e.target.value)}
                                    className="input-base w-full"
                                    disabled={teams.length === 0}
                                >
                                    <option value="">Choose a team...</option>
                                    {filteredTeams.map(team => (
                                        <option key={team.id} value={team.id}>
                                            {team.name} {team.organisationName && `(${team.organisationName})`}
                                        </option>
                                    ))}
                                </select>
                                {teams.length === 0 && <p className="text-xs text-muted">No teams found. Create a team first.</p>}
                            </div>

                            {/* Only show assign button in edit mode, in create mode it submits with main form */}
                            {mode === 'edit' && (
                                <>
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
                                        onClick={handleAssignTeamDirectly}
                                        className="w-full"
                                        disabled={!selectedTeamId}
                                    >
                                        Assign to Team
                                    </Button>
                                </>
                            )}

                            {mode === 'create' && (
                                <p className="text-xs text-muted italic">
                                    Team assignment will be saved when you click "Save Player".
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <Button type="button" variant="cancel" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit">
                        {mode === "create" ? "Save Player" : "Update Player"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
