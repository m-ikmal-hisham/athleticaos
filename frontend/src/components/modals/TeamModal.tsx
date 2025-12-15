import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
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
                        <select
                            value={formData.organisationId}
                            onChange={(e) => setFormData({ ...formData, organisationId: e.target.value })}
                            className="w-full px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                            <option value="">Select Organisation</option>
                            {organisations
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map(org => (
                                    <option key={org.id} value={org.id}>
                                        {org.name} ({org.orgLevel}) {org.state ? `- ${org.state}` : ''}
                                    </option>
                                ))}
                        </select>
                        {errors.organisationId && <p className="text-xs text-red-500 mt-1">{errors.organisationId}</p>}
                    </div>
                </div>

                <div className="border-t border-white/10 pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Classification</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="">Select...</option>
                                <option value="MENS">Men's</option>
                                <option value="WOMENS">Women's</option>
                                <option value="MIXED">Mixed</option>
                            </select>
                            {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Age Group</label>
                            <select
                                value={formData.ageGroup}
                                onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="">Select...</option>
                                <option value="Open">Open (Senior)</option>
                                <option value="U23">Under 23</option>
                                <option value="U21">Under 21</option>
                                <option value="U19">Under 19</option>
                                <option value="U18">Under 18</option>
                                <option value="U16">Under 16</option>
                                <option value="U14">Under 14</option>
                                <option value="U12">Under 12</option>
                                <option value="Veterans">Veterans (+35)</option>
                            </select>
                            {errors.ageGroup && <p className="text-xs text-red-500 mt-1">{errors.ageGroup}</p>}
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Competition Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Division</label>
                            <select
                                value={formData.division}
                                onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                            {errors.division && <p className="text-xs text-red-500 mt-1">{errors.division}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">State</label>
                            <select
                                value={formData.state}
                                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="">Select State</option>
                                {MALAYSIA_STATES.map((s) => (
                                    <option key={s.code} value={s.name}>{s.name}</option>
                                ))}
                            </select>
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
