import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { PageHeader } from '@/components/PageHeader';
import { ArrowLeft } from '@phosphor-icons/react';
import { fetchTeamById, updateTeam } from '@/api/teams.api';
import { fetchOrganisations, Organisation } from '@/api/organisations.api';
import { MALAYSIA_STATES } from '@/constants/malaysia-geo';
import toast from 'react-hot-toast';
import { TeamCategory, AgeGroup } from '@/types';

export const EditTeam = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [organisations, setOrganisations] = useState<Organisation[]>([]);

    // Form Stats
    const [name, setName] = useState("");
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

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Organisation</label>
                                <select
                                    value={organisationId}
                                    onChange={(e) => setOrganisationId(e.target.value)}
                                    className="input-base w-full"
                                    disabled // Disable updating Org if not needed, or enable if backend supports
                                    aria-label="Select Organisation"
                                >
                                    <option value="">Select Organisation</option>
                                    {organisations
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map(org => (
                                            <option key={org.id} value={org.id}>
                                                {org.name} ({org.type})
                                            </option>
                                        ))}
                                </select>
                            </div>
                        </div>

                        <div className="border-t border-white/10 pt-6">
                            <h3 className="text-sm font-semibold text-primary-500 uppercase tracking-wider mb-4">
                                Classification
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Category *</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value as TeamCategory)}
                                        className="input-base w-full"
                                        required
                                        aria-label="Select Category"
                                    >
                                        <option value="">Select...</option>
                                        <option value="MEN">Men's</option>
                                        <option value="WOMEN">Women's</option>
                                        <option value="MIXED">Mixed</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Age Group *</label>
                                    <select
                                        value={ageGroup}
                                        onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
                                        className="input-base w-full"
                                        required
                                        aria-label="Select Age Group"
                                    >
                                        <option value="">Select...</option>
                                        <option value="SENIOR">Open (Senior)</option>
                                        <option value="U23">Under 23</option>
                                        <option value="U20">Under 20</option>
                                        <option value="U18">Under 18</option>
                                        <option value="U15">Under 15</option>
                                        <option value="U12">Under 12</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-white/10 pt-6">
                            <h3 className="text-sm font-semibold text-primary-500 uppercase tracking-wider mb-4">
                                Competition Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Division *</label>
                                    <select
                                        value={division}
                                        onChange={(e) => setDivision(e.target.value)}
                                        className="input-base w-full"
                                        required
                                        aria-label="Select Division"
                                    >
                                        <option value="">Select Division</option>
                                        <optgroup label="Malaysia Rugby Leagues">
                                            <option value="Premier">Premier</option>
                                            <option value="Division 1">Division 1</option>
                                            <option value="Division 2">Division 2</option>
                                        </optgroup>
                                        <optgroup label="Other">
                                            <option value="State League">State League</option>
                                            <option value="University">University / IPT</option>
                                            <option value="School">School / MSSM</option>
                                            <option value="Development">Development</option>
                                            <option value="Social">Social</option>
                                        </optgroup>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">State *</label>
                                    <select
                                        value={state}
                                        onChange={(e) => setState(e.target.value)}
                                        className="input-base w-full"
                                        required
                                        aria-label="Select State"
                                    >
                                        <option value="">Select State</option>
                                        {MALAYSIA_STATES.map((s) => (
                                            <option key={s.code} value={s.name}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-white/10 pt-6">
                            <h3 className="text-sm font-semibold text-primary-500 uppercase tracking-wider mb-4">
                                Status
                            </h3>
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
