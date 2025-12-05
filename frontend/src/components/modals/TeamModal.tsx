import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Team } from '@/types';

interface TeamModalProps {
    isOpen: boolean;
    mode: 'create' | 'edit';
    initialData?: Team | null;
    onClose: () => void;
    onSubmit: (data: Partial<Team>) => Promise<void>;
}

export const TeamModal = ({ isOpen, mode, initialData, onClose, onSubmit }: TeamModalProps) => {
    const [formData, setFormData] = useState<Partial<Team>>({
        name: '',
        division: '',
        state: ''
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (initialData && mode === 'edit') {
            setFormData({
                name: initialData.name || '',
                division: initialData.division || '',
                state: initialData.state || ''
            });
        } else {
            setFormData({
                name: '',
                division: '',
                state: ''
            });
        }
        setErrors({});
    }, [initialData, mode, isOpen]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name?.trim()) newErrors.name = 'Team name is required';
        if (!formData.division?.trim()) newErrors.division = 'Division is required';
        if (!formData.state?.trim()) newErrors.state = 'State is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            await onSubmit(formData);
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
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Team Name</label>
                    <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. KL Tigers"
                        className={errors.name ? 'border-red-500' : ''}
                    />
                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Division</label>
                        <select
                            value={formData.division}
                            onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                            className="w-full px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                            <option value="">Select Division</option>
                            <option value="Premier">Premier</option>
                            <option value="Division 1">Division 1</option>
                            <option value="Division 2">Division 2</option>
                            <option value="School">School</option>
                        </select>
                        {errors.division && <p className="text-xs text-red-500 mt-1">{errors.division}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">State</label>
                        <Input
                            value={formData.state}
                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                            placeholder="e.g. Kuala Lumpur"
                            className={errors.state ? 'border-red-500' : ''}
                        />
                        {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state}</p>}
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
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
