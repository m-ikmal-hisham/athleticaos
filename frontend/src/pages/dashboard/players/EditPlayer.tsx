import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { PageHeader } from '@/components/PageHeader';
import { ArrowLeft } from '@phosphor-icons/react';
import { SearchableSelect } from '@/components/SearchableSelect';
import { fetchPlayerById, updatePlayer } from '@/api/players.api';
import { assignPlayerToTeam } from '@/api/playerTeams.api';
import { fetchTeams } from '@/api/teams.api';
import { fetchOrganisations, Organisation } from '@/api/organisations.api';
import { Gender, DominantSide } from '@/types';
import { AddressInputs, AddressData } from '@/components/AddressInputs';
import { ImageUpload } from '@/components/common/ImageUpload';
import { showToast } from '@/lib/customToast';
import { calculateAge } from '@/utils/date';
import { formatGender } from '@/utils/formatters';
import { IdentityVerificationPanel } from '@/components/admin/persons/IdentityVerificationPanel';
import { IdentityVerificationSummary } from '@/api/persons.api';

interface Team {
    id: string;
    name: string;
    organisationId?: string;
    organisationName?: string;
}

export const EditPlayer = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form Stats
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [photoUrl, setPhotoUrl] = useState("");
    const [gender, setGender] = useState<Gender | "">("");
    const [dob, setDob] = useState("");
    const [existingIdentificationType, setExistingIdentificationType] = useState<string | null>(null);
    const [replacementIdentificationType, setReplacementIdentificationType] = useState("");
    const [identificationValue, setIdentificationValue] = useState("");
    const [identificationPresent, setIdentificationPresent] = useState(false);
    const [nationality, setNationality] = useState("");
    const [phone, setPhone] = useState("");
    const [emailError, setEmailError] = useState("");
    const [duplicateIcError, setDuplicateIcError] = useState("");
    const [personId, setPersonId] = useState("");
    const [identityVerification, setIdentityVerification] = useState<IdentityVerificationSummary | null>(null);

    // OBS-05B: Track loaded DOB and gender for reentry detection
    const loadedDob = useRef("");
    const loadedGender = useRef("");

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
    const [showTeamAssignment, setShowTeamAssignment] = useState(false);
    const [jerseyNumber, setJerseyNumber] = useState("");
    const [position, setPosition] = useState("");

    useEffect(() => {
        const loadData = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const [playerRes, orgsRes, teamsRes]: [any, any, any] = await Promise.all([
                    fetchPlayerById(id),
                    fetchOrganisations(),
                    fetchTeams()
                ]);

                const player = playerRes.data;
                const orgsData = Array.isArray(orgsRes) ? orgsRes : (orgsRes.data || []);
                const teamsData = Array.isArray(teamsRes) ? teamsRes : (teamsRes.data || []);

                setOrganisations(orgsData);
                setTeams(teamsData);

                // Populate Form
                setFirstName(player.firstName || "");
                setLastName(player.lastName || "");
                setEmail(player.email || "");
                setEmailError("");
                setPhotoUrl(player.photoUrl || "");
                const rawGender = (player.gender || "").trim().toUpperCase();
                const initialGender = (rawGender === Gender.MALE || rawGender === Gender.FEMALE) ? (rawGender as Gender) : "";
                setGender(initialGender);
                setDob(player.dob || "");
                loadedDob.current = player.dob || "";
                loadedGender.current = rawGender;
                setExistingIdentificationType(player.identificationType || null);
                setReplacementIdentificationType("");
                setIdentificationPresent(Boolean(player.identificationPresent));
                setIdentificationValue(""); // Phase 1: do not preload raw identification
                setNationality(player.nationality || "");
                setPhone(player.phone || "");
                setPersonId(player.personId || "");
                setIdentityVerification(player.identityVerification || null);

                setAddressLine1(player.addressLine1 || player.address || "");
                setAddressLine2(player.addressLine2 || "");
                setCity(player.city || "");
                setPostcode(player.postcode || "");
                setState(player.state || "");
                setCountry(player.country || "");
                // Can ideally populate stateCode/countryCode if API returns it, otherwise default or infer

                setStatus(player.status || "ACTIVE");
                setHeightCm(player.heightCm?.toString() || "");
                setWeightKg(player.weightKg?.toString() || "");
                setDominantHand(player.dominantHand || DominantSide.RIGHT);
                setDominantLeg(player.dominantLeg || DominantSide.RIGHT);

                if (player.organisationId) setSelectedOrganisationId(player.organisationId);

            } catch (error) {
                console.error("Failed to load player data", error);
                showToast.error("Failed to load player details");
                navigate('/dashboard/players');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id, navigate]);

    // Filter teams based on selected organisation
    const filteredTeams = selectedOrganisationId
        ? teams.filter(t => t.organisationId === selectedOrganisationId)
        : teams;

    // OBS-05B: Determine if identification reentry is required due to DOB/gender change
    const storedType = (existingIdentificationType || '').trim().toUpperCase();
    const exempt = storedType === 'PASSPORT' || storedType === 'OTHER';
    const genderChanged = Boolean(gender) && String(gender).trim().toUpperCase() !== loadedGender.current;
    const dobChanged = Boolean(dob) && dob !== loadedDob.current;
    const isReentryRequired = !exempt && (dobChanged || genderChanged);

    const isVerified = identityVerification?.status === 'VERIFIED';
    const willResetVerification = isVerified && (dobChanged || genderChanged || Boolean(identificationValue.trim()));

    const reentryNotice = storedType === 'MALAYSIAN_IC'
        ? 'Changing date of birth or gender requires re-entering the IC number.'
        : "This record's identification type is missing or outdated. Changing date of birth or gender requires re-entering the identification number and selecting its type.";

    // Effective type: auto-preselect MALAYSIAN_IC only when storedType was MALAYSIAN_IC
    const effectiveIdType = replacementIdentificationType || (isReentryRequired && storedType === 'MALAYSIAN_IC' ? 'MALAYSIAN_IC' : '');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;

        const hasReplacementId = Boolean(identificationValue.trim());

        // OBS-05B: Block submit if reentry is required but ID is not provided
        if (isReentryRequired && !hasReplacementId) {
            setDuplicateIcError(reentryNotice);
            showToast.error(reentryNotice);
            return;
        }

        if (!gender) {
            showToast.error("Please select a gender");
            return;
        }

        if (hasReplacementId && !effectiveIdType) {
            showToast.error("Please select an identification type for the replacement ID");
            return;
        }

        setSaving(true);

        const payload: any = {
            firstName,
            lastName,
            email: email.trim() || null,
            gender: String(gender),
            dob,
            identificationType: hasReplacementId ? effectiveIdType : undefined,
            icOrPassport: hasReplacementId ? identificationValue.trim() : undefined,
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
            organisationId: selectedOrganisationId || undefined
        };

        try {
            await updatePlayer(id, payload);
            showToast.success("Player updated successfully");
            navigate('/dashboard/players');
        } catch (error: any) {
            console.error('Update failed', error.response?.status, error.response?.data?.errorCode);
            if (error.response?.data?.errorCode === 'IDENTIFICATION_REENTRY_REQUIRED') {
                setDuplicateIcError(error.response?.data?.message || reentryNotice);
                showToast.error('Identification re-entry required');
            } else if (error.response?.data?.errorCode === 'DUPLICATE_IC') {
                setDuplicateIcError("This IC/Passport number is already registered.");
                showToast.error("Duplicate IC found");
            } else if (error.response?.data?.errorCode === 'DUPLICATE_EMAIL') {
                setEmailError(error.response?.data?.message || 'A person with this email already exists.');
                showToast.error(error.response?.data?.message || 'A person with this email already exists.');
            } else {
                showToast.error(error.response?.data?.message || 'Failed to update player');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleAssignTeamDirectly = async () => {
        if (!id || !selectedTeamId) {
            showToast.error("Please select a team");
            return;
        }

        try {
            await assignPlayerToTeam({
                playerId: id,
                teamId: selectedTeamId,
                jerseyNumber: jerseyNumber ? parseInt(jerseyNumber) : undefined,
                position: position || undefined
            });
            showToast.success("Player assigned to team successfully!");
            setSelectedTeamId("");
            setJerseyNumber("");
            setPosition("");
            setShowTeamAssignment(false);
        } catch (err: any) {
            const errorMsg = err?.response?.data?.message || err?.message || "Failed to assign player to team";
            showToast.error(errorMsg);
            console.error("Assignment error:", err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/dashboard/players')}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <PageHeader
                    title="Edit Player"
                    description={`Editing ${firstName} ${lastName}`}
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
                                <label className="text-sm font-medium text-muted-foreground">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (emailError) setEmailError("");
                                    }}
                                    className="input-base w-full"
                                    aria-label="Email"
                                />
                                {emailError && (
                                    <p className="text-xs text-red-500 mt-1">{emailError}</p>
                                )}
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
                                <SearchableSelect
                                    value={gender}
                                    onChange={(value) => setGender(value as Gender)}
                                    options={[
                                        { value: Gender.MALE, label: formatGender(Gender.MALE) },
                                        { value: Gender.FEMALE, label: formatGender(Gender.FEMALE) }
                                    ]}
                                    placeholder="Select gender"
                                />
                                {loadedGender.current && loadedGender.current !== Gender.MALE && loadedGender.current !== Gender.FEMALE && !gender && (
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                        Gender on file is not MALE or FEMALE — please select one.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-muted-foreground">
                                        Identification Type {(identificationValue.trim() || isReentryRequired) ? "*" : ""}
                                    </label>
                                    {existingIdentificationType && (
                                        <span className="text-[11px] font-medium text-muted-foreground">
                                            Current: <span className="font-semibold text-foreground">{existingIdentificationType}</span>
                                        </span>
                                    )}
                                </div>
                                <SearchableSelect
                                    value={effectiveIdType}
                                    onChange={(value) => setReplacementIdentificationType(value as string)}
                                    options={[
                                        { value: 'MALAYSIAN_IC', label: 'Malaysian IC' },
                                        { value: 'PASSPORT', label: 'Passport' },
                                        { value: 'OTHER', label: 'Other' }
                                    ]}
                                    placeholder={identificationValue.trim() || isReentryRequired ? "Select replacement ID type" : "Only required if replacing ID"}
                                    disabled={!identificationValue.trim() && !isReentryRequired}
                                />
                                <p className="text-xs text-muted">
                                    {identificationValue.trim()
                                        ? "Select the canonical type for the new identification."
                                        : "Type is locked unless a replacement ID is entered."}
                                </p>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-muted-foreground">
                                        Identification / Passport Number {isReentryRequired ? "*" : ""}
                                    </label>
                                    {identificationPresent && (
                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                            ID on file: PRESENT
                                        </span>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    value={identificationValue}
                                    onChange={(e) => {
                                        setIdentificationValue(e.target.value);
                                        if (duplicateIcError) setDuplicateIcError("");
                                    }}
                                    required={isReentryRequired}
                                    className={`input-base w-full ${duplicateIcError ? 'ring-2 ring-amber-500' : ''}`}
                                    placeholder={isReentryRequired ? "IC re-entry required" : (identificationPresent ? "Leave blank to keep existing ID on file" : "Enter ID / Passport Number")}
                                    aria-label="Identification Value"
                                />
                                {isReentryRequired && (
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                        {reentryNotice}
                                    </p>
                                )}
                                <p className="text-xs text-muted">
                                    {identificationPresent ? "Leave blank to keep the existing identification on file unchanged." : "Enter a new identification number."}
                                </p>
                                {duplicateIcError && (
                                    <p className="text-xs text-red-500 mt-1">{duplicateIcError}</p>
                                )}
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

                        {willResetVerification && (
                            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
                                Saving these changes will remove the identity verification.
                            </div>
                        )}
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
                                <SearchableSelect
                                    value={status}
                                    onChange={(value) => setStatus(value as string)}
                                    options={[
                                        { value: 'ACTIVE', label: 'Active' },
                                        { value: 'INACTIVE', label: 'Inactive' },
                                        { value: 'BANNED', label: 'Banned' }
                                    ]}
                                    placeholder="Select status"
                                />
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
                                <SearchableSelect
                                    value={dominantHand}
                                    onChange={(value) => setDominantHand(value as DominantSide)}
                                    options={[
                                        { value: DominantSide.RIGHT, label: 'Right' },
                                        { value: DominantSide.LEFT, label: 'Left' },
                                        { value: DominantSide.BOTH, label: 'Both' }
                                    ]}
                                    placeholder="Select hand"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Dominant Leg</label>
                                <SearchableSelect
                                    value={dominantLeg}
                                    onChange={(value) => setDominantLeg(value as DominantSide)}
                                    options={[
                                        { value: DominantSide.RIGHT, label: 'Right' },
                                        { value: DominantSide.LEFT, label: 'Left' },
                                        { value: DominantSide.BOTH, label: 'Both' }
                                    ]}
                                    placeholder="Select leg"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Team Assignment Section (Direct Assign) */}
                    <div className="pt-4 border-t border-white/10">
                        <button
                            type="button"
                            onClick={() => setShowTeamAssignment(!showTeamAssignment)}
                            className="text-sm text-primary-500 hover:text-primary-400 font-medium transition-colors"
                        >
                            {showTeamAssignment ? "Hide Team Assignment" : "Assign to Team"}
                        </button>

                        {showTeamAssignment && (
                            <div className="mt-4 space-y-4 p-6 bg-white/5 rounded-2xl border border-white/10">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Filter by Organisation</label>
                                    <SearchableSelect
                                        value={selectedOrganisationId}
                                        onChange={(value) => {
                                            setSelectedOrganisationId(value as string);
                                            setSelectedTeamId(""); // Reset team when org changes
                                        }}
                                        options={[
                                            { value: '', label: 'All Organisations' },
                                            ...organisations.map(org => ({ value: org.id, label: org.name }))
                                        ]}
                                        placeholder="Select organisation"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Select Team</label>
                                    <SearchableSelect
                                        value={selectedTeamId}
                                        onChange={(value) => setSelectedTeamId(value as string)}
                                        options={[
                                            { value: '', label: 'Choose a team...' },
                                            ...filteredTeams.map(team => ({
                                                value: team.id,
                                                label: `${team.name}${team.organisationName ? ` (${team.organisationName})` : ''}`
                                            }))
                                        ]}
                                        placeholder="Select team"
                                        disabled={teams.length === 0}
                                    />
                                    {teams.length === 0 && <p className="text-xs text-muted-foreground">No teams found.</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-muted-foreground">Jersey Number</label>
                                        <input
                                            type="number"
                                            placeholder="7"
                                            value={jerseyNumber}
                                            onChange={(e) => setJerseyNumber(e.target.value)}
                                            className="input-base w-full"
                                            min="1"
                                            max="99"
                                            aria-label="Jersey Number"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-muted-foreground">Position</label>
                                        <input
                                            type="text"
                                            placeholder="Fly-half"
                                            value={position}
                                            onChange={(e) => setPosition(e.target.value)}
                                            className="input-base w-full"
                                            aria-label="Position"
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
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                        <Button type="button" variant="cancel" onClick={() => navigate('/dashboard/players')}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>

                {personId && (
                    <div className="mt-8 pt-6 border-t border-white/10">
                        <IdentityVerificationPanel
                            personId={personId}
                            identityVerification={identityVerification}
                            onVerificationChanged={(updated) => {
                                setIdentityVerification(updated.identityVerification || null);
                            }}
                            disabled={saving}
                        />
                    </div>
                )}
            </GlassCard>
        </div>
    );
};
