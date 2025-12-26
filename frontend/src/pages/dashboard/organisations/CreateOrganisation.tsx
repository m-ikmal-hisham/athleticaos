import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { PageHeader } from '@/components/PageHeader';
import { Input } from '@/components/Input';
import { AddressInputs, AddressData } from '@/components/AddressInputs';
import { UploadSimple, ArrowLeft } from '@phosphor-icons/react';
import { fetchOrganisations, createOrganisation, Organisation, OrganisationLevel } from '@/api/organisations.api';

import { uploadFile } from '@/api/upload.api';
import { getImageUrl } from '@/utils/image';
import toast from 'react-hot-toast';

export const CreateOrganisation = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Data Loading State
    const [availableOrganisations, setAvailableOrganisations] = useState<Organisation[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        orgType: 'CLUB',
        orgLevel: 'CLUB' as OrganisationLevel,
        parentOrgId: '',
        primaryColor: '#000000',
        secondaryColor: '#ffffff',
        tertiaryColor: '',
        quaternaryColor: '',
        logoUrl: '',
        state: '',
        // Address
        addressLine1: '',
        addressLine2: '',
        postcode: '',
        city: '',
        stateCode: '',
        countryCode: 'MY'
    });

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string>('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        const loadData = async () => {
            try {
                const orgsRes = await fetchOrganisations();
                setAvailableOrganisations(orgsRes);
            } catch (error) {
                console.error("Failed to load reference data", error);
                toast.error("Failed to load reference data");
            }
        };
        loadData();
    }, []);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name?.trim()) newErrors.name = 'Name is required';
        if (!formData.orgType?.trim()) newErrors.orgType = 'Type is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            setErrors({ ...errors, logo: 'Logo must be less than 2MB' });
            return;
        }

        const img = new Image();
        img.onload = () => {
            if (img.width < 100 || img.height < 100) {
                setErrors({ ...errors, logo: 'Logo must be at least 100x100 pixels' });
                return;
            }
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
            setErrors({ ...errors, logo: '' });
        };
        img.src = URL.createObjectURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            let finalLogoUrl = formData.logoUrl;

            // Upload logo if selected
            if (logoFile) {
                try {
                    finalLogoUrl = await uploadFile(logoFile);
                } catch (uploadErr) {
                    console.error('Failed to upload logo', uploadErr);
                    toast.error('Failed to upload logo image');
                    setLoading(false);
                    return;
                }
            }

            const submitData = {
                ...formData,
                parentOrgId: formData.parentOrgId === '' ? undefined : formData.parentOrgId,
                logoUrl: finalLogoUrl,
                // teamIds mapping isn't standard in createOrganisation usually, but if API supports it:
                // Note: The modal had logic for it, assuming the generic create endpoint handles it.
                // If not, we might need separate calls, but let's stick to modal logic.
                // Looking at API types, CreateRequest matches.
            };

            await createOrganisation(submitData as any); // Casting as API types might be slightly loose
            toast.success("Organisation created successfully");
            navigate('/dashboard/organisations');
        } catch (error: any) {
            console.error(error);
            toast.error(error?.response?.data?.message || 'Failed to create organisation');
        } finally {
            setLoading(false);
        }
    };

    const getParentOrgName = () => {
        if (!formData.parentOrgId) return '';
        const parent = availableOrganisations.find(org => org.id === formData.parentOrgId);
        return parent ? parent.name : formData.parentOrgId;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/organisations')}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <PageHeader
                    title="Add New Organisation"
                    description="Create a new rugby organisation, club, or school"
                />
            </div>

            <GlassCard className="max-w-4xl mx-auto p-8">
                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Name *</label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Mukah Rugby Club"
                                className={errors.name ? 'border-red-500' : ''}
                            />
                            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Type *</label>
                                <select
                                    value={formData.orgType}
                                    onChange={(e) => setFormData({ ...formData, orgType: e.target.value })}
                                    className="input-base w-full"
                                    aria-label="Organisation Type"
                                >
                                    <option value="CLUB">Club</option>
                                    <option value="SCHOOL">School</option>
                                    <option value="UNION">Union</option>
                                    <option value="STATE_UNION">State Union</option>
                                    <option value="DIVISION">Division</option>
                                    <option value="DISTRICT">District</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Level</label>
                                <select
                                    value={formData.orgLevel}
                                    onChange={(e) => setFormData({ ...formData, orgLevel: e.target.value as any })}
                                    className="input-base w-full"
                                    aria-label="Organisation Level"
                                >
                                    <option value="COUNTRY">Country</option>
                                    <option value="STATE">State</option>
                                    <option value="DIVISION">Division</option>
                                    <option value="DISTRICT">District</option>
                                    <option value="CLUB">Club</option>
                                    <option value="SCHOOL">School</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-4 border-t border-white/10 pt-6">
                        <h3 className="text-sm font-semibold text-primary-500 uppercase tracking-wider">Address Details</h3>
                        <AddressInputs
                            data={{
                                addressLine1: formData.addressLine1,
                                addressLine2: formData.addressLine2,
                                city: formData.city,
                                postcode: formData.postcode,
                                state: formData.state,
                                stateCode: formData.stateCode,
                                country: 'Malaysia',
                                countryCode: formData.countryCode
                            }}
                            onChange={(newData: AddressData) => {
                                setFormData({
                                    ...formData,
                                    addressLine1: newData.addressLine1 || '',
                                    addressLine2: newData.addressLine2 || '',
                                    city: newData.city || '',
                                    postcode: newData.postcode || '',
                                    state: newData.state || '',
                                    stateCode: newData.stateCode || '',
                                    countryCode: newData.countryCode || 'MY'
                                });
                            }}
                        />
                    </div>

                    {/* Hierarchy */}
                    <div className="space-y-4 border-t border-white/10 pt-6">
                        <h3 className="text-sm font-semibold text-primary-500 uppercase tracking-wider">Hierarchy</h3>
                        {formData.stateCode === 'MY-13' && (
                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400">
                                Sarawak organisations often map to <strong>Divisions</strong> (e.g. Kuching, Sibu) rather than Districts.
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Parent Organisation</label>
                            <select
                                value={formData.parentOrgId}
                                onChange={(e) => setFormData({ ...formData, parentOrgId: e.target.value })}
                                className="input-base w-full"
                                aria-label="Parent Organisation"
                            >
                                <option value="">None (Top Level)</option>
                                {availableOrganisations
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .map(org => (
                                        <option key={org.id} value={org.id}>
                                            {org.name} ({org.orgLevel}) {org.state ? `- ${org.state}` : ''}
                                        </option>
                                    ))}
                            </select>
                            {formData.parentOrgId && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Selected: {getParentOrgName()}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Branding */}
                    <div className="space-y-6 border-t border-white/10 pt-6">
                        <h3 className="text-sm font-semibold text-primary-500 uppercase tracking-wider">Branding</h3>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Primary Color</label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="color"
                                        value={formData.primaryColor || '#000000'}
                                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                        className="h-10 w-20 p-1 bg-transparent border border-white/10 rounded overflow-hidden cursor-pointer"
                                        aria-label="Primary Color"
                                    />
                                    <span className="text-xs text-muted-foreground">{formData.primaryColor}</span>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Secondary Color</label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="color"
                                        value={formData.secondaryColor || '#ffffff'}
                                        onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                                        className="h-10 w-20 p-1 bg-transparent border border-white/10 rounded overflow-hidden cursor-pointer"
                                        aria-label="Secondary Color"
                                    />
                                    <span className="text-xs text-muted-foreground">{formData.secondaryColor}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-2">
                                Logo (Min 100x100px, Max 2MB)
                            </label>
                            <div className="flex items-center gap-4">
                                <label className="flex-1 cursor-pointer">
                                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                                        <UploadSimple className="w-5 h-5 text-muted-foreground" />
                                        <span className="text-sm text-foreground">{logoFile ? logoFile.name : 'Choose file or enter URL'}</span>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoChange}
                                        className="hidden"
                                    />
                                </label>
                                {logoPreview && (
                                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10 bg-white/5">
                                        <img
                                            src={logoPreview.startsWith('blob:') ? logoPreview : getImageUrl(logoPreview)}
                                            alt="Logo preview"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                            </div>
                            <Input
                                value={formData.logoUrl}
                                onChange={(e) => {
                                    setFormData({ ...formData, logoUrl: e.target.value });
                                    setLogoPreview(e.target.value);
                                }}
                                placeholder="Or paste logo URL directly"
                                className="mt-2"
                            />
                            {errors.logo && <p className="text-xs text-red-500 mt-1">{errors.logo}</p>}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                        <Button type="button" variant="cancel" onClick={() => navigate('/dashboard/organisations')}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Organisation'}
                        </Button>
                    </div>

                </form>
            </GlassCard>
        </div>
    );
};
