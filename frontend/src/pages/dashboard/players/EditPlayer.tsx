import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { PageHeader } from '@/components/PageHeader';
import { ArrowLeft, WarningCircle } from '@phosphor-icons/react';
import { Select, SearchableSelect } from '@/components/Select';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { fetchPlayerById, updatePlayer } from '@/api/players.api';
import { assignPlayerToTeam } from '@/api/playerTeams.api';
import { fetchTeamOptions, TeamOption } from '@/api/teams.api';
import { fetchOrganisationOptions, OrganisationOption } from '@/api/organisations.api';
import { retryOnce } from '@/utils/retry';
import { Gender, DominantSide } from '@/types';
import { AddressInputs, AddressData } from '@/components/AddressInputs';
import { ImageUpload } from '@/components/common/ImageUpload';
import { showToast } from '@/lib/customToast';
import { calculateAge } from '@/utils/date';
import { formatGender } from '@/utils/formatters';
import { RecordVerificationPanel } from '@/components/admin/persons/RecordVerificationPanel';
import { RecordVerificationSummary, isPlaceholderEmail } from '@/api/persons.api';
import { PossibleDuplicateDialog, PossibleDuplicateMatchItem } from '@/components/admin/persons/PossibleDuplicateDialog';

export const EditPlayer = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loadingPlayer, setLoadingPlayer] = useState(true);
    const [playerError, setPlayerError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [registrationNo, setRegistrationNo] = useState<string | null>(null);
    const [duplicateData, setDuplicateData] = useState<{
        visibleMatches: PossibleDuplicateMatchItem[];
        otherOrganisationsCount: number;
    } | null>(null);
    const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

    // Form Stats
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [photoUrl, setPhotoUrl] = useState("");
    const [gender, setGender] = useState<Gender | "">("");
    const [dob, setDob] = useState("");
    const [nationality, setNationality] = useState("");
    const [phone, setPhone] = useState("");
    const [emailError, setEmailError] = useState("");
    const [personId, setPersonId] = useState("");
    const [recordVerification, setRecordVerification] = useState<RecordVerificationSummary | null>(null);

    // Track loaded identity fields for verification reset detection
    const loadedFirstName = useRef("");
    const loadedLastName = useRef("");
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

    // Team Assignment & Options
    const [organisations, setOrganisations] = useState<OrganisationOption[]>([]);
    const [loadingOrgs, setLoadingOrgs] = useState(false);
    const [orgsError, setOrgsError] = useState<string | null>(null);

    const [teams, setTeams] = useState<TeamOption[]>([]);
    const [loadingTeams, setLoadingTeams] = useState(false);
    const [teamsError, setTeamsError] = useState<string | null>(null);

    const [selectedOrganisationId, setSelectedOrganisationId] = useState("");
    const [selectedTeamId, setSelectedTeamId] = useState("");
    const [showTeamAssignment, setShowTeamAssignment] = useState(false);
    const [jerseyNumber, setJerseyNumber] = useState("");
    const [position, setPosition] = useState("");

    const loadTeams = useCallback(async (orgId?: string) => {
        try {
            setLoadingTeams(true);
            setTeamsError(null);
            const data = await retryOnce(() => fetchTeamOptions(orgId || undefined));
            setTeams(data);
        } catch (error) {
            console.error("Failed to load teams", error);
            setTeamsError("Failed to load teams.");
        } finally {
            setLoadingTeams(false);
        }
    }, []);

    const loadOrganisations = useCallback(async () => {
        try {
            setLoadingOrgs(true);
            setOrgsError(null);
            const data = await retryOnce(() => fetchOrganisationOptions());
            setOrganisations(data);
        } catch (error) {
            console.error("Failed to load organisations", error);
            setOrgsError("Failed to load organisations.");
        } finally {
            setLoadingOrgs(false);
        }
    }, []);

    const loadPlayer = useCallback(async () => {
        if (!id) return;
        try {
            setLoadingPlayer(true);
            setPlayerError(null);
            const playerRes = await retryOnce(() => fetchPlayerById(id));
            const player = playerRes.data;

            // Populate Form
            setRegistrationNo(player.registrationNo || null);
            setFirstName(player.firstName || "");
            setLastName(player.lastName || "");
            setEmail(player.email || "");
            setEmailError("");
            setPhotoUrl(player.photoUrl || "");
            const rawGender = (player.gender || "").trim().toUpperCase();
            const initialGender = (rawGender === Gender.MALE || rawGender === Gender.FEMALE) ? (rawGender as Gender) : "";
            setGender(initialGender);
            setDob(player.dob || "");
            loadedFirstName.current = player.firstName || "";
            loadedLastName.current = player.lastName || "";
            loadedDob.current = player.dob || "";
            loadedGender.current = rawGender;
            setNationality(player.nationality || "");
            setPhone(player.phone || "");
            setPersonId(player.personId || "");
            setRecordVerification(player.recordVerification || null);

            setAddressLine1(player.addressLine1 || player.address || "");
            setAddressLine2(player.addressLine2 || "");
            setCity(player.city || "");
            setPostcode(player.postcode || "");
            setState(player.state || "");
            setCountry(player.country || "");

            setStatus(player.status || "ACTIVE");
            setHeightCm(player.heightCm?.toString() || "");
            setWeightKg(player.weightKg?.toString() || "");
            setDominantHand(player.dominantHand || DominantSide.RIGHT);
            setDominantLeg(player.dominantLeg || DominantSide.RIGHT);

            if (player.organisationId) {
                setSelectedOrganisationId(player.organisationId);
                loadTeams(player.organisationId);
            }
        } catch (error) {
            console.error("Failed to load player data", error);
            setPlayerError("Couldn't load this player.");
        } finally {
            setLoadingPlayer(false);
        }
    }, [id, loadTeams]);

    useEffect(() => {
        loadPlayer();
        loadOrganisations();
    }, [loadPlayer, loadOrganisations]);

    const isVerified = recordVerification?.status === 'VERIFIED';
    const nameChanged = (firstName.trim() !== loadedFirstName.current) || (lastName.trim() !== loadedLastName.current);
    const dobChanged = Boolean(dob) && dob !== loadedDob.current;
    const genderChanged = Boolean(gender) && String(gender).trim().toUpperCase() !== loadedGender.current;
    const willResetVerification = isVerified && (nameChanged || dobChanged || genderChanged);

    const submitPlayer = async (confirmPossibleDuplicate = false) => {
        if (!id) return;

        if (!gender) {
            showToast.error("Please select a gender");
            return;
        }

        if (!email.trim()) {
            setEmailError("Email is required.");
            showToast.error("Email is required.");
            return;
        }

        setSaving(true);

        const payload: any = {
            firstName,
            lastName,
            email: email.trim(),
            gender: String(gender),
            dob,
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
            organisationId: selectedOrganisationId || undefined,
            confirmPossibleDuplicate
        };

        try {
            await updatePlayer(id, payload);
            showToast.success("Player updated successfully");
            setShowDuplicateDialog(false);
            navigate('/dashboard/players');
        } catch (error: any) {
            console.error('Update failed', error.response?.status, error.response?.data?.errorCode);
            const errData = error.response?.data;
            if (errData?.errorCode === 'POSSIBLE_DUPLICATE_PERSON') {
                setDuplicateData({
                    visibleMatches: errData.matches || [],
                    otherOrganisationsCount: errData.otherOrganisationMatches || 0
                });
                setShowDuplicateDialog(true);
            } else if (errData?.errorCode === 'EMAIL_REQUIRED') {
                setEmailError(errData.message || 'This person has no email address. Add one to save changes.');
                showToast.error(errData.message || 'This person has no email address. Add one to save changes.');
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await submitPlayer(false);
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
        } catch (err: any) {
            const errorMsg = err?.response?.data?.message || err?.message || "Failed to assign player to team";
            showToast.error(errorMsg);
            console.error("Assignment error:", err);
        }
    };

    if (loadingPlayer) {
        return (
            <div className="space-y-6 max-w-4xl mx-auto p-8 animate-pulse">
                <div className="flex items-center gap-4 mb-6">
                    <LoadingSkeleton className="w-10 h-10 rounded-lg" />
                    <div className="space-y-2 flex-1">
                        <LoadingSkeleton className="w-48 h-6" />
                        <LoadingSkeleton className="w-64 h-4" />
                    </div>
                </div>
                <GlassCard className="p-8 space-y-6">
                    <div className="flex justify-center mb-6">
                        <LoadingSkeleton className="w-32 h-32 rounded-full" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <LoadingSkeleton className="h-10" />
                        <LoadingSkeleton className="h-10" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <LoadingSkeleton className="h-10" />
                        <LoadingSkeleton className="h-10" />
                    </div>
                    <LoadingSkeleton className="h-24" />
                </GlassCard>
            </div>
        );
    }

    if (playerError) {
        return (
            <div className="max-w-md mx-auto my-16 p-8 text-center bg-white dark:bg-deep-navy rounded-2xl border border-black/10 dark:border-white/10 space-y-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-accent/10 flex items-center justify-center text-accent-text">
                    <WarningCircle className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Couldn't load this player.</h2>
                <p className="text-sm text-muted-foreground">An error occurred while fetching player details.</p>
                <div className="flex items-center justify-center gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/players')}>
                        Back to players
                    </Button>
                    <Button type="button" variant="primary" onClick={loadPlayer}>
                        Try again
                    </Button>
                </div>
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
                    title={registrationNo ? `Edit Player (${registrationNo})` : "Edit Player"}
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
                                <label className="text-sm font-medium text-muted-foreground">Email *</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (emailError) setEmailError("");
                                    }}
                                    className="input-base w-full"
                                    aria-label="Email"
                                />
                                {isPlaceholderEmail(email) && (
                                    <p className="text-xs text-amber-500 mt-1">Placeholder address on file — replace it with a real one when you have it.</p>
                                )}
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
                                Saving changes to name, date of birth, or gender will reset the record verification.
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
                                    <Select
                                        value={selectedOrganisationId}
                                        onChange={(value) => {
                                            const orgId = value as string;
                                            setSelectedOrganisationId(orgId);
                                            setSelectedTeamId(""); // Reset team when org changes
                                            loadTeams(orgId);
                                        }}
                                        options={[
                                            { value: '', label: 'All Organisations' },
                                            ...organisations.map(org => ({ value: org.id, label: org.name }))
                                        ]}
                                        placeholder={loadingOrgs ? "Loading organisations..." : "Select organisation"}
                                        searchable={true}
                                    />
                                    {orgsError && (
                                        <div className="flex items-center gap-2 text-xs text-accent-text mt-1">
                                            <span>{orgsError}</span>
                                            <button
                                                type="button"
                                                onClick={loadOrganisations}
                                                className="underline font-medium hover:opacity-80"
                                            >
                                                Retry
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Select Team</label>
                                    <Select
                                        value={selectedTeamId}
                                        onChange={(value) => setSelectedTeamId(value as string)}
                                        options={[
                                            { value: '', label: 'Choose a team...' },
                                            ...teams.map(team => ({
                                                value: team.id,
                                                label: team.name
                                            }))
                                        ]}
                                        placeholder={loadingTeams ? "Loading teams..." : "Select team"}
                                        disabled={teams.length === 0 && !loadingTeams}
                                        searchable={true}
                                    />
                                    {teamsError && (
                                        <div className="flex items-center gap-2 text-xs text-accent-text mt-1">
                                            <span>{teamsError}</span>
                                            <button
                                                type="button"
                                                onClick={() => loadTeams(selectedOrganisationId)}
                                                className="underline font-medium hover:opacity-80"
                                            >
                                                Retry
                                            </button>
                                        </div>
                                    )}
                                    {!teamsError && teams.length === 0 && !loadingTeams && (
                                        <p className="text-xs text-muted-foreground">No teams found.</p>
                                    )}
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
                        <RecordVerificationPanel
                            personId={personId}
                            recordVerification={recordVerification}
                            onVerificationChanged={(updated) => {
                                setRecordVerification(updated.recordVerification || null);
                            }}
                            disabled={saving}
                        />
                    </div>
                )}
            </GlassCard>

            {showDuplicateDialog && duplicateData && (
                <PossibleDuplicateDialog
                    isOpen={showDuplicateDialog}
                    onClose={() => setShowDuplicateDialog(false)}
                    onConfirmAnyway={() => submitPlayer(true)}
                    visibleMatches={duplicateData.visibleMatches}
                    otherOrganisationsCount={duplicateData.otherOrganisationsCount}
                    isSubmitting={saving}
                    title="Possible duplicate player detected"
                    confirmButtonText="Save anyway"
                />
            )}
        </div>
    );
};
