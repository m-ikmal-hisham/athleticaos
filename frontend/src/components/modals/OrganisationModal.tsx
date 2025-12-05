import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Organisation, OrganisationLevel, fetchOrganisations } from '@/api/organisations.api';
import { Upload } from 'lucide-react';

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
        state: ''
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [availableOrganisations, setAvailableOrganisations] = useState<Organisation[]>([]);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            fetchOrganisations().then(setAvailableOrganisations).catch(console.error);
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
                state: initialData.state || ''
            });
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
                state: ''
            });
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
            // Note: In a real app, you would upload the logo file to a storage service
            // and get back a URL. For now, we'll just use the logoUrl field.
            // You could integrate with services like AWS S3, Cloudinary, etc.

            const submitData = {
                ...formData,
                // If a new logo file was selected, you would upload it here
                // and update the logoUrl with the returned URL
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

                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Parent Organisation (Optional)</label>
                    <select
                        value={formData.parentOrgId}
                        onChange={(e) => setFormData({ ...formData, parentOrgId: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                        <option value="">None (Top Level)</option>
                        {availableOrganisations.map(org => (
                            <option key={org.id} value={org.id}>
                                {org.name} ({org.orgLevel})
                            </option>
                        ))}
                    </select>
                    {formData.parentOrgId && (
                        <p className="text-xs text-muted-foreground mt-1">
                            Selected: {getParentOrgName()}
                        </p>
                    )}
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
                                src={logoPreview}
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
                    <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" isLoading={loading}>
                        {mode === 'create' ? 'Save' : 'Update'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
