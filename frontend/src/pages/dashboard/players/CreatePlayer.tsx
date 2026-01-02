import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { PageHeader } from '@/components/PageHeader';
import { ArrowLeft } from '@phosphor-icons/react';
import { createPlayer } from '@/api/players.api';
import { fetchTeams } from '@/api/teams.api';
import { fetchOrganisations, Organisation } from '@/api/organisations.api';
import { Gender, DominantSide } from '@/types';
import { AddressInputs, AddressData } from '@/components/AddressInputs';
import { ImageUpload } from '@/components/common/ImageUpload';
import toast from 'react-hot-toast';
import { calculateAge } from '@/utils/date';

interface Team {
    id: string;
    name: string;
    organisationId?: string;
    organisationName?: string;
}

export const CreatePlayer = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Form Stats
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [photoUrl, setPhotoUrl] = useState("");
    const [gender, setGender] = useState<Gender>(Gender.MALE);
    const [dob, setDob] = useState("");
    const [identificationType, setIdentificationType] = useState("IC");
    const [identificationValue, setIdentificationValue] = useState("");
    const [nationality, setNationality] = useState("");
    const [phone, setPhone] = useState("");

    // Address
    const [addressLine1, setAddressLine1] = useState("");
    const [addressLine2, setAddressLine2] = useState("");
    const [postcode, setPostcode] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [country, setCountry] = useState("Malaysia"); // Default
    const [stateCode, setStateCode] = useState("");
    const [countryCode, setCountryCode] = useState("MY");

    // Rugby
    const [status, setStatus] = useState("ACTIVE");
    const [heightCm, setHeightCm] = useState("");
    const [weightKg, setWeightKg] = useState("");
    const [dominantHand, setDominantHand] = useState<DominantSide>(DominantSide.RIGHT);
    const [dominantLeg, setDominantLeg] = useState<DominantSide>(DominantSide.RIGHT);

    // Team Assignment
    const [organisations, setOrganisations] = useState<Organisation[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedOrganisationId, setSelectedOrganisationId] = useState("");
    const [selectedTeamId, setSelectedTeamId] = useState("");
    const [showTeamAssignment, setShowTeamAssignment] = useState(true); // Default open for Create

    useEffect(() => {
        // Load reference data
        Promise.all([
            fetchOrganisations(),
            fetchTeams()
        ]).then(([orgsRes, teamsRes]: [any, any]) => {
            const orgsData = Array.isArray(orgsRes) ? orgsRes : (orgsRes.data || []);
            const teamsData = Array.isArray(teamsRes) ? teamsRes : (teamsRes.data || []);
            setOrganisations(orgsData);
            setTeams(teamsData);
        }).catch(err => {
            console.error("Failed to load reference data:", err);
            toast.error("Failed to load organisations and teams");
        });
    }, []);

    // Filter teams based on selected organisation
    const filteredTeams = selectedOrganisationId
        ? teams.filter(t => t.organisationId === selectedOrganisationId)
        : teams;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const payload: any = {
            firstName,
            lastName,
            email,
            gender: String(gender),
            dob,
            identificationType,
            identificationValue,
            icOrPassport: identificationValue,
            nationality,
            phone: phone || undefined,
            addressLine1,
            addressLine2: addressLine2 || undefined,
            city,
            postcode,
            state,
            country,
            address: addressLine1,
            photoUrl: photoUrl || undefined,
            status,
            heightCm: heightCm ? parseInt(heightCm) : undefined,
            weightKg: weightKg ? parseInt(weightKg) : undefined,
            dominantHand: dominantHand ? String(dominantHand) : undefined,
            dominantLeg: dominantLeg ? String(dominantLeg) : undefined,
            teamId: selectedTeamId || undefined,
            organisationId: selectedOrganisationId || undefined
        };

        try {
            await createPlayer(payload);
            toast.success("Player created successfully");
            navigate('/dashboard/players');
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to create player');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/players')}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <PageHeader
                    title="Add Player"
                    description="Register a new player"
                />
            </div>

            <GlassCard className="max-w-4xl mx-auto p-8">
                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* Personal Information */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-primary-500 uppercase tracking-wider border-b border-white/10 pb-2">
                            Personal Information
                        </h3>

                        <div className="flex justify-center mb-6">
                            <ImageUpload
                                value={photoUrl}
                                onChange={setPhotoUrl}
                                label="Profile Photo"
                                className="w-32"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">First Name *</label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    required
                                    className="input-base w-full"
                                    aria-label="First Name"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Last Name *</label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    required
                                    className="input-base w-full"
                                    aria-label="Last Name"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Email *</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="input-base w-full"
                                    aria-label="Email"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="input-base w-full"
                                    aria-label="Phone"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">
                                    Date of Birth *
                                    {dob && <span className="ml-2 text-primary-500 text-xs font-normal">({calculateAge(dob)} yrs)</span>}
                                </label>
                                <input
                                    type="date"
                                    value={dob}
                                    onChange={(e) => setDob(e.target.value)}
                                    required
                                    className="input-base w-full"
                                    aria-label="Date of Birth"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Gender *</label>
                                <select
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value as Gender)}
                                    className="input-base w-full"
                                    required
                                    aria-label="Gender"
                                >
                                    <option value={Gender.MALE}>Male</option>
                                    <option value={Gender.FEMALE}>Female</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Identification Type</label>
                                <select
                                    value={identificationType}
                                    onChange={(e) => setIdentificationType(e.target.value)}
                                    className="input-base w-full"
                                    aria-label="Identification Type"
                                >
                                    <option value="IC">IC</option>
                                    <option value="PASSPORT">Passport</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">
                                    Identification Value *
                                </label>
                                <input
                                    type="text"
                                    value={identificationValue}
                                    onChange={(e) => setIdentificationValue(e.target.value)}
                                    required
                                    className="input-base w-full"
                                    placeholder="ID / Passport Number"
                                    aria-label="Identification Value"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Nationality *</label>
                            <input
                                type="text"
                                value={nationality}
                                onChange={(e) => setNationality(e.target.value)}
                                required
                                className="input-base w-full"
                                aria-label="Nationality"
                            />
                        </div>
                    </div>

                    {/* Address Details */}
                    <div className="space-y-4 pt-4 border-t border-white/10">
                        <h3 className="text-sm font-semibold text-primary-500 uppercase tracking-wider">
                            Address Details
                        </h3>
                        <AddressInputs
                            data={{
                                addressLine1,
                                addressLine2,
                                city,
                                postcode,
                                state,
                                stateCode,
                                country,
                                countryCode
                            }}
                            onChange={(newData: AddressData) => {
                                setAddressLine1(newData.addressLine1 || '');
                                setAddressLine2(newData.addressLine2 || '');
                                setCity(newData.city || '');
                                setPostcode(newData.postcode || '');
                                setState(newData.state || '');
                                setStateCode(newData.stateCode || '');
                                setCountry(newData.country || 'Malaysia');
                                setCountryCode(newData.countryCode || 'MY');
                            }}
                        />
                    </div>

                    {/* Rugby Profile */}
                    <div className="space-y-4 pt-4 border-t border-white/10">
                        <h3 className="text-sm font-semibold text-primary-500 uppercase tracking-wider">
                            Rugby Profile
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Status</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="input-base w-full"
                                    aria-label="Status"
                                >
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                    <option value="BANNED">Banned</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Height (cm)</label>
                                <input
                                    type="number"
                                    value={heightCm}
                                    onChange={(e) => setHeightCm(e.target.value)}
                                    className="input-base w-full"
                                    min="0"
                                    aria-label="Height (cm)"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Weight (kg)</label>
                                <input
                                    type="number"
                                    value={weightKg}
                                    onChange={(e) => setWeightKg(e.target.value)}
                                    className="input-base w-full"
                                    min="0"
                                    aria-label="Weight (kg)"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Dominant Hand</label>
                                <select
                                    value={dominantHand}
                                    onChange={(e) => setDominantHand(e.target.value as DominantSide)}
                                    className="input-base w-full"
                                    aria-label="Dominant Hand"
                                >
                                    <option value={DominantSide.RIGHT}>Right</option>
                                    <option value={DominantSide.LEFT}>Left</option>
                                    <option value={DominantSide.BOTH}>Both</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Dominant Leg</label>
                                <select
                                    value={dominantLeg}
                                    onChange={(e) => setDominantLeg(e.target.value as DominantSide)}
                                    className="input-base w-full"
                                    aria-label="Dominant Leg"
                                >
                                    <option value={DominantSide.RIGHT}>Right</option>
                                    <option value={DominantSide.LEFT}>Left</option>
                                    <option value={DominantSide.BOTH}>Both</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Team Assignment */}
                    <div className="pt-4 border-t border-white/10">
                        <button
                            type="button"
                            onClick={() => setShowTeamAssignment(!showTeamAssignment)}
                            className="text-sm text-primary-500 hover:text-primary-400 font-medium transition-colors"
                        >
                            {showTeamAssignment ? "Hide Team Assignment" : "Assign Team Now"}
                        </button>

                        {showTeamAssignment && (
                            <div className="mt-4 space-y-4 p-6 bg-white/5 rounded-2xl border border-white/10">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Filter by Organisation</label>
                                    <select
                                        value={selectedOrganisationId}
                                        onChange={(e) => {
                                            setSelectedOrganisationId(e.target.value);
                                            setSelectedTeamId(""); // Reset team when org changes
                                        }}
                                        className="input-base w-full"
                                        aria-label="Filter by Organisation"
                                    >
                                        <option value="">All Organisations</option>
                                        {organisations.map(org => (
                                            <option key={org.id} value={org.id}>{org.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Select Team</label>
                                    <select
                                        value={selectedTeamId}
                                        onChange={(e) => setSelectedTeamId(e.target.value)}
                                        className="input-base w-full"
                                        disabled={teams.length === 0}
                                        aria-label="Select Team"
                                    >
                                        <option value="">Choose a team...</option>
                                        {filteredTeams.map(team => (
                                            <option key={team.id} value={team.id}>
                                                {team.name} {team.organisationName && `(${team.organisationName})`}
                                            </option>
                                        ))}
                                    </select>
                                    {teams.length === 0 && <p className="text-xs text-muted-foreground">No teams found. Create a team first.</p>}
                                </div>
                                <p className="text-xs text-muted-foreground italic">
                                    Team assignment will be saved when you click "Save Player".
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                        <Button type="button" variant="cancel" onClick={() => navigate('/dashboard/players')}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Player'}
                        </Button>
                    </div>

                </form>
            </GlassCard>
        </div>
    );
};
