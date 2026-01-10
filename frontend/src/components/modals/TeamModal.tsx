import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { SearchableSelect } from '@/components/SearchableSelect';
import { Team } from '@/types';
import { fetchOrganisations, Organisation } from '@/api/organisations.api';
import { MALAYSIA_STATES } from '@/constants/malaysia-geo';

interface TeamModalProps {
    isOpen: boolean;
    mode: 'create' | 'edit';
    initialData?: Team | null;
    onClose: () => void;
    onSuccess?: () => void;
    onSubmit: (data: Partial<Team>) => Promise<void>;
}

export const TeamModal = ({ isOpen, mode, initialData, onClose, onSubmit, onSuccess }: TeamModalProps) => {
    const [formData, setFormData] = useState<Partial<Team>>({
        name: '',
        division: '',
        state: '',
        organisationId: '',
        category: '',
        ageGroup: ''
    });
    const [loading, setLoading] = useState(false);
    const [organisations, setOrganisations] = useState<Organisation[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            fetchOrganisations().then(res => setOrganisations(res)).catch(console.error);
        }
    }, [isOpen]);

    useEffect(() => {
        if (initialData && mode === 'edit') {
            setFormData({
                name: initialData.name || '',
                division: initialData.division || '',
                state: initialData.state || '',
                organisationId: initialData.organisationId || '',
                category: initialData.category || '',
                ageGroup: initialData.ageGroup || ''
            });
        } else {
            setFormData({
                name: '',
                division: '',
                state: '',
                organisationId: '',
                category: '',
                ageGroup: ''
            });
        }
        setErrors({});
    }, [initialData, mode, isOpen]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name?.trim()) newErrors.name = 'Team name is required';
        if (!formData.division?.trim()) newErrors.division = 'Division is required';
        if (!formData.state?.trim()) newErrors.state = 'State is required';
        if (!formData.organisationId?.trim()) newErrors.organisationId = 'Organisation is required';
        if (!formData.category?.trim()) newErrors.category = 'Category is required';
        if (!formData.ageGroup?.trim()) newErrors.ageGroup = 'Age group is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            await onSubmit(formData);
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: unknown) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={mode === 'create' ? 'Add New Team' : 'Edit Team'}
            size="lg" // Increased size for better UI
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Team Name</label>
                        <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. KL Tigers"
                            className={errors.name ? 'border-red-500' : ''}
                        />
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Organisation</label>
                        <SearchableSelect
                            value={formData.organisationId}
                            onChange={(value) => setFormData({ ...formData, organisationId: value as string })}
                            options={[
                                { value: '', label: 'Select Organisation' },
                                ...organisations
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .map(org => ({
                                        value: org.id,
                                        label: `${org.name} (${org.orgLevel})${org.state ? ` - ${org.state}` : ''}`
                                    }))
                            ]}
                            placeholder="Select organisation"
                        />
                        {errors.organisationId && <p className="text-xs text-red-500 mt-1">{errors.organisationId}</p>}
                    </div>
                </div>

                <div className="border-t border-white/10 pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Classification</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Category</label>
                            <SearchableSelect
                                value={formData.category}
                                onChange={(value) => setFormData({ ...formData, category: value as string })}
                                options={[
                                    { value: '', label: 'Select...' },
                                    { value: 'MENS', label: "Men's" },
                                    { value: 'WOMENS', label: "Women's" },
                                    { value: 'MIXED', label: 'Mixed' }
                                ]}
                                placeholder="Select category"
                            />
                            {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Age Group</label>
                            <SearchableSelect
                                value={formData.ageGroup}
                                onChange={(value) => setFormData({ ...formData, ageGroup: value as string })}
                                options={[
                                    { value: '', label: 'Select...' },
                                    { value: 'Open', label: 'Open (Senior)' },
                                    { value: 'U23', label: 'Under 23' },
                                    { value: 'U21', label: 'Under 21' },
                                    { value: 'U19', label: 'Under 19' },
                                    { value: 'U18', label: 'Under 18' },
                                    { value: 'U16', label: 'Under 16' },
                                    { value: 'U14', label: 'Under 14' },
                                    { value: 'U12', label: 'Under 12' },
                                    { value: 'Veterans', label: 'Veterans (+35)' }
                                ]}
                                placeholder="Select age group"
                            />
                            {errors.ageGroup && <p className="text-xs text-red-500 mt-1">{errors.ageGroup}</p>}
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Competition Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Division</label>
                            <SearchableSelect
                                value={formData.division}
                                onChange={(value) => setFormData({ ...formData, division: value as string })}
                                options={[
                                    { value: '', label: 'Select Division' },
                                    { value: 'Premier', label: 'Premier' },
                                    { value: 'Division 1', label: 'Division 1' },
                                    { value: 'Division 2', label: 'Division 2' },
                                    { value: 'State League', label: 'State League' },
                                    { value: 'University', label: 'University / IPT' },
                                    { value: 'School', label: 'School / MSSM' },
                                    { value: 'Development', label: 'Development' },
                                    { value: 'Social', label: 'Social' }
                                ]}
                                placeholder="Select division"
                            />
                            {errors.division && <p className="text-xs text-red-500 mt-1">{errors.division}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">State</label>
                            <SearchableSelect
                                value={formData.state}
                                onChange={(value) => setFormData({ ...formData, state: value as string })}
                                options={[
                                    { value: '', label: 'Select State' },
                                    ...MALAYSIA_STATES.map(s => ({ value: s.name, label: s.name }))
                                ]}
                                placeholder="Select state"
                            />
                            {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state}</p>}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                    <Button type="button" variant="cancel" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" isLoading={loading}>
                        {mode === 'create' ? 'Save Team' : 'Update Team'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
