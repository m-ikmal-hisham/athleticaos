import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { AddressInputs, AddressData } from '@/components/AddressInputs';
import { Organisation, OrganisationLevel, fetchOrganisations } from '@/api/organisations.api';
import { fetchTeams } from '@/api/teams.api';
import { Team } from '@/types';
import { Upload } from 'lucide-react';
import { uploadFile } from '@/api/upload.api';
import { getImageUrl } from '@/utils/image';



interface OrganisationModalProps {
    isOpen: boolean;
    mode: 'create' | 'edit';
    initialData?: Organisation | null;
    initialParentId?: string;
    initialLevel?: OrganisationLevel;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
}

export const OrganisationModal = ({ isOpen, mode, initialData, initialParentId, initialLevel, onClose, onSubmit }: OrganisationModalProps) => {
    const [formData, setFormData] = useState({
        name: '',
        orgType: 'CLUB',
        orgLevel: initialLevel || 'CLUB',
        parentOrgId: initialParentId || '',
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
    const [teamIds, setTeamIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [availableOrganisations, setAvailableOrganisations] = useState<Organisation[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string>('');



    useEffect(() => {
        if (isOpen) {
            fetchOrganisations().then(setAvailableOrganisations).catch(console.error);
            fetchTeams().then(res => setTeams(res.data)).catch(console.error);
        }
    }, [isOpen]);

    useEffect(() => {
        if (initialData && mode === 'edit') {
            setFormData({
                name: initialData.name || '',
                orgType: initialData.type || 'CLUB',
                orgLevel: initialData.orgLevel || 'CLUB',
                parentOrgId: initialData.parentOrgId || '',
                primaryColor: initialData.primaryColor || '#000000',
                secondaryColor: initialData.secondaryColor || '#ffffff',
                tertiaryColor: initialData.tertiaryColor || '',
                quaternaryColor: initialData.quaternaryColor || '',
                logoUrl: initialData.logoUrl || '',
                state: initialData.state || '',
                addressLine1: initialData.addressLine1 || '',
                addressLine2: initialData.addressLine2 || '',
                postcode: initialData.postcode || '',
                city: initialData.city || '',
                stateCode: initialData.stateCode || '',
                countryCode: initialData.countryCode || 'MY'
            });


            // If we had a way to get existing mapped teams, we would set them here.
            // For now, defaulting empty or we need to fetch org teams.
            setTeamIds([]);
            setLogoPreview(initialData.logoUrl || '');
        } else {
            setFormData({
                name: '',
                orgType: 'CLUB',
                orgLevel: initialLevel || 'CLUB',
                parentOrgId: initialParentId || '',
                primaryColor: '#000000',
                secondaryColor: '#ffffff',
                tertiaryColor: '',
                quaternaryColor: '',
                logoUrl: '',
                state: '',
                addressLine1: '',
                addressLine2: '',
                postcode: '',
                city: '',
                stateCode: '',
                countryCode: 'MY'
            });
            setTeamIds([]);
            setLogoPreview('');

        }
        setErrors({});
        setLogoFile(null);
    }, [initialData, mode, isOpen, initialParentId, initialLevel]);

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

        // Validate file size (min 100x100px, max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            setErrors({ ...errors, logo: 'Logo must be less than 2MB' });
            return;
        }

        // Validate dimensions
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

            // If a file was selected, upload it first
            if (logoFile) {
                try {
                    finalLogoUrl = await uploadFile(logoFile);
                } catch (uploadErr) {
                    console.error('Failed to upload logo', uploadErr);
                    setErrors({ ...errors, logo: 'Failed to upload logo image' });
                    setLoading(false);
                    return;
                }
            }

            const submitData = {
                ...formData,
                parentOrgId: formData.parentOrgId === '' ? null : formData.parentOrgId,
                logoUrl: finalLogoUrl,
                teamIds: teamIds.length > 0 ? teamIds : null
            };

            await onSubmit(submitData);
            onClose();
        } catch (error: unknown) {
            console.error(error);
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
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={mode === 'create' ? 'Add New Organisation' : 'Edit Organisation'}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Name</label>
                    <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Mukah Rugby Club"
                        className={errors.name ? 'border-red-500' : ''}
                    />
                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Type</label>
                        <select
                            value={formData.orgType}
                            onChange={(e) => setFormData({ ...formData, orgType: e.target.value })}
                            className="w-full px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                            <option value="CLUB">Club</option>
                            <option value="SCHOOL">School</option>
                            <option value="UNION">Union</option>
                            <option value="STATE_UNION">State Union</option>
                            <option value="DIVISION">Division</option>
                            <option value="DISTRICT">District</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Level</label>
                        <select
                            value={formData.orgLevel}
                            onChange={(e) => setFormData({ ...formData, orgLevel: e.target.value as any })}
                            className="w-full px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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

                <div className="space-y-4 border-t border-white/10 pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Address Details</h3>

                    <AddressInputs
                        data={{
                            addressLine1: formData.addressLine1,
                            addressLine2: formData.addressLine2,
                            city: formData.city,
                            postcode: formData.postcode,
                            state: formData.state,
                            stateCode: formData.stateCode,
                            country: 'Malaysia', // Fixed for logic 
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


                <div className="border-t border-white/10 pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Hierarchy</h3>
                    {formData.stateCode === 'MY-13' && (
                        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400">
                            Sarawak organisations often map to <strong>Divisions</strong> (e.g. Kuching, Sibu) rather than Districts.
                        </div>
                    )}

                    <select
                        value={formData.parentOrgId}
                        onChange={(e) => setFormData({ ...formData, parentOrgId: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                        <option value="">None (Top Level)</option>
                        {/* Improved Filtering: Map State or National orgs for Clubs */}
                        {availableOrganisations
                            // Optional: Filter logic could go here if we wanted to be strict, but requirements say "Soft filter only"
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

                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Map Teams (Optional)</label>
                    <div className="border border-white/10 rounded-xl p-3 max-h-40 overflow-y-auto bg-black/5 dark:bg-white/5">
                        {teams.map(team => (
                            <label key={team.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-white/5 rounded px-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={teamIds.includes(team.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) setTeamIds([...teamIds, team.id]);
                                        else setTeamIds(teamIds.filter(id => id !== team.id));
                                    }}
                                    className="rounded border-white/20 bg-black/20"
                                />
                                {team.name} ({team.division})
                            </label>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Primary Color</label>
                        <Input
                            type="color"
                            value={formData.primaryColor}
                            onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                            className="h-10 p-1"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Secondary Color</label>
                        <Input
                            type="color"
                            value={formData.secondaryColor}
                            onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                            className="h-10 p-1"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Tertiary Color (Optional)</label>
                        <Input
                            type="color"
                            value={formData.tertiaryColor || '#000000'}
                            onChange={(e) => setFormData({ ...formData, tertiaryColor: e.target.value })}
                            className="h-10 p-1"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Quaternary Color (Optional)</label>
                        <Input
                            type="color"
                            value={formData.quaternaryColor || '#000000'}
                            onChange={(e) => setFormData({ ...formData, quaternaryColor: e.target.value })}
                            className="h-10 p-1"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Logo (Min 100x100px, Max 2MB)
                    </label>
                    <div className="flex items-center gap-4">
                        <label className="flex-1 cursor-pointer">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                                <Upload className="w-4 h-4" />
                                <span className="text-sm">{logoFile ? logoFile.name : 'Choose file or enter URL'}</span>
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoChange}
                                className="hidden"
                            />
                        </label>
                        {logoPreview && (
                            <img
                                src={logoPreview.startsWith('blob:') ? logoPreview : getImageUrl(logoPreview)}
                                alt="Logo preview"
                                className="w-12 h-12 rounded-lg object-cover border border-white/10"
                            />
                        )}
                    </div>
                    <Input
                        value={formData.logoUrl}
                        onChange={(e) => {
                            setFormData({ ...formData, logoUrl: e.target.value });
                            setLogoPreview(e.target.value);
                        }}
                        placeholder="Or paste logo URL here"
                        className="mt-2"
                    />
                    {errors.logo && <p className="text-xs text-red-500 mt-1">{errors.logo}</p>}
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                    <Button type="button" variant="cancel" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" isLoading={loading}>
                        {mode === 'create' ? 'Save' : 'Update'}
                    </Button>
                </div>
            </form>
        </Modal >
    );
};
