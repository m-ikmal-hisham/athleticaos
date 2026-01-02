import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { PageHeader } from '@/components/PageHeader';
import { SearchableSelect } from '@/components/SearchableSelect';
import { ArrowLeft } from '@phosphor-icons/react';
import { fetchTeamById, updateTeam } from '@/api/teams.api';
import { fetchOrganisations, Organisation } from '@/api/organisations.api';
import { MALAYSIA_STATES } from '@/constants/malaysia-geo';
import toast from 'react-hot-toast';
import { TeamCategory, AgeGroup } from '@/types';
import { ImageUpload } from '@/components/common/ImageUpload';

export const EditTeam = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [organisations, setOrganisations] = useState<Organisation[]>([]);

    // Form Stats
    const [name, setName] = useState("");
    const [shortName, setShortName] = useState("");
    const [logoUrl, setLogoUrl] = useState("");
    const [organisationId, setOrganisationId] = useState("");
    const [division, setDivision] = useState("");
    const [category, setCategory] = useState<TeamCategory | "">("");
    const [ageGroup, setAgeGroup] = useState<AgeGroup | "">("");
    const [state, setState] = useState("");
    const [status, setStatus] = useState("ACTIVE");

    useEffect(() => {
        const loadData = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const [teamRes, orgsRes] = await Promise.all([
                    fetchTeamById(id),
                    fetchOrganisations()
                ]);

                // Handle loose typing for responses
                const teamData = (teamRes as any).data || teamRes;
                // orgsRes is statically typed as Organisation[] based on API definition, 
                // but safety check in case runtime differs
                const orgsData = Array.isArray(orgsRes) ? orgsRes : ((orgsRes as any).data || []);

                setOrganisations(orgsData);

                // Populate Form
                if (teamData) {
                    setName(teamData.name || "");
                    setShortName(teamData.shortName || "");
                    setLogoUrl(teamData.logoUrl || "");
                    setOrganisationId(teamData.organisationId || "");
                    setDivision(teamData.division || "");
                    setCategory(teamData.category as TeamCategory || "");
                    setAgeGroup(teamData.ageGroup as AgeGroup || "");
                    setState(teamData.state || "");
                    setStatus(teamData.status || "ACTIVE");
                }
            } catch (error) {
                console.error("Failed to load team data", error);
                toast.error("Failed to load team details");
                navigate('/dashboard/teams');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id, navigate]);

    const validate = () => {
        if (!name.trim()) return "Team name is required";
        if (shortName && shortName.length > 5) return "Short name must be at most 5 characters";
        if (!organisationId) return "Organisation is required";
        if (!category) return "Category is required";
        if (!ageGroup) return "Age group is required";
        if (!division) return "Division is required";
        if (!state) return "State is required";
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;
        const error = validate();
        if (error) {
            toast.error(error);
            return;
        }

        setSaving(true);

        const payload = {
            name,
            shortName: shortName || undefined,
            logoUrl: logoUrl || undefined,
            organisationId, // Often immutable for teams but including just in case backend allows transfer
            division,
            category: category as string,
            ageGroup: ageGroup as string,
            state,
            status
        };

        try {
            await updateTeam(id, payload);
            toast.success("Team updated successfully");
            navigate('/dashboard/teams');
        } catch (error: any) {
            console.error(error);
            toast.error(error?.response?.data?.message || 'Failed to update team');
        } finally {
            setSaving(false);
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
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/teams')}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <PageHeader
                    title="Edit Team"
                    description={`Editing ${name}`}
                />
            </div>

            <GlassCard className="max-w-3xl mx-auto p-8">
                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* Basic Information */}
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Team Name *</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="input-base w-full"
                                    required
                                    aria-label="Team Name"
                                />
                            </div>

                            <div className="flex justify-center mb-6">
                                <ImageUpload
                                    value={logoUrl}
                                    onChange={setLogoUrl}
                                    label="Team Logo"
                                    className="w-32"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Short Name (Max 5)</label>
                                <input
                                    type="text"
                                    value={shortName}
                                    onChange={(e) => setShortName(e.target.value.toUpperCase().slice(0, 5))}
                                    className="input-base w-full uppercase"
                                    placeholder="e.g. KLT"
                                    maxLength={5}
                                    aria-label="Short Name"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <SearchableSelect
                                    label="Organisation"
                                    value={organisationId}
                                    onChange={(value) => setOrganisationId(value as string)}
                                    options={organisations
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map(org => ({
                                            value: org.id,
                                            label: `${org.name} (${org.type})`
                                        }))}
                                    disabled
                                />
                            </div>
                        </div>

                        <div className="border-t border-white/10 pt-6">
                            <h3 className="text-sm font-semibold text-primary-500 uppercase tracking-wider mb-4">
                                Classification
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <SearchableSelect
                                        label="Category"
                                        required
                                        value={category}
                                        onChange={(value) => setCategory(value as TeamCategory)}
                                        options={[
                                            { value: 'MEN', label: "Men's" },
                                            { value: 'WOMEN', label: "Women's" },
                                            { value: 'MIXED', label: "Mixed" }
                                        ]}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <SearchableSelect
                                        label="Age Group"
                                        required
                                        value={ageGroup}
                                        onChange={(value) => setAgeGroup(value as AgeGroup)}
                                        options={[
                                            { value: 'SENIOR', label: 'Open (Senior)' },
                                            { value: 'U23', label: 'Under 23' },
                                            { value: 'U20', label: 'Under 20' },
                                            { value: 'U18', label: 'Under 18' },
                                            { value: 'U15', label: 'Under 15' },
                                            { value: 'U12', label: 'Under 12' }
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-white/10 pt-6">
                            <h3 className="text-sm font-semibold text-primary-500 uppercase tracking-wider mb-4">
                                Competition Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <SearchableSelect
                                        label="Division"
                                        required
                                        value={division}
                                        onChange={(value) => setDivision(value as string)}
                                        options={[
                                            { value: 'Premier', label: 'Premier' },
                                            { value: 'Division 1', label: 'Division 1' },
                                            { value: 'Division 2', label: 'Division 2' },
                                            { value: 'State League', label: 'State League' },
                                            { value: 'University', label: 'University / IPT' },
                                            { value: 'School', label: 'School / MSSM' },
                                            { value: 'Development', label: 'Development' },
                                            { value: 'Social', label: 'Social' }
                                        ]}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <SearchableSelect
                                        label="State"
                                        required
                                        value={state}
                                        onChange={(value) => setState(value as string)}
                                        options={MALAYSIA_STATES.map(s => ({ value: s.name, label: s.name }))}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-white/10 pt-6">
                            <h3 className="text-sm font-semibold text-primary-500 uppercase tracking-wider mb-4">
                                Status
                            </h3>
                            <div className="space-y-1.5">
                                <SearchableSelect
                                    label="Status"
                                    value={status}
                                    onChange={(value) => setStatus(value as string)}
                                    options={[
                                        { value: 'ACTIVE', label: 'Active' },
                                        { value: 'INACTIVE', label: 'Inactive' },
                                        { value: 'BANNED', label: 'Banned' }
                                    ]}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                        <Button type="button" variant="cancel" onClick={() => navigate('/dashboard/teams')}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>

                </form>
            </GlassCard>
        </div>
    );
};
