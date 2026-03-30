import React, { useState } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { showToast } from '@/lib/customToast';
import { createPerson } from '@/api/persons.api';

interface CreatePersonModalProps {
    isOpen: boolean;
    onClose: () => void;
    organisationId: string;
    onSuccess: () => void;
}

export const CreatePersonModal: React.FC<CreatePersonModalProps> = ({ isOpen, onClose, organisationId, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        icOrPassport: '',
        dob: '',
        gender: '',
        nationality: 'Malaysian',
        email: '',
        phone: '',
        nationalPlayerStatus: 'NONE',
        isPlayer: false,
        isOfficial: false,
        isStaff: false
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createPerson(organisationId, formData);
            showToast.success('Person created successfully');
            onSuccess();
            onClose();
            // Reset form
            setFormData({
                firstName: '',
                lastName: '',
                icOrPassport: '',
                dob: '',
                gender: '',
                nationality: 'Malaysian',
                email: '',
                phone: '',
                nationalPlayerStatus: 'NONE',
                isPlayer: false,
                isOfficial: false,
                isStaff: false
            });
        } catch (error: any) {
            console.error('Create failed', error);
            showToast.error(error.response?.data?.message || 'Failed to create person');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Register New Person" size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">First Name</label>
                        <Input
                            required
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Last Name</label>
                        <Input
                            required
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium mb-1 block">IC or Passport <span className="text-xs text-muted font-normal">(Required for tracking roles)</span></label>
                    <Input
                        required
                        value={formData.icOrPassport}
                        onChange={(e) => setFormData({ ...formData, icOrPassport: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Date of Birth</label>
                        <Input
                            type="date"
                            required
                            value={formData.dob}
                            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Gender</label>
                        <select
                            required
                            aria-label="Gender"
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium mb-1 block">Nationality</label>
                    <Input
                        required
                        value={formData.nationality}
                        onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    />
                </div>

                <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-border">
                    <label className="text-sm font-bold mb-3 block text-foreground">Initial Roles (Optional)</label>
                    <div className="flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={formData.isPlayer}
                                onChange={(e) => setFormData({ ...formData, isPlayer: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="text-sm font-medium group-hover:text-foreground text-muted">Register as Player</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={formData.isOfficial}
                                onChange={(e) => setFormData({ ...formData, isOfficial: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                            />
                            <span className="text-sm font-medium group-hover:text-foreground text-muted">Register as Official</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={formData.isStaff}
                                onChange={(e) => setFormData({ ...formData, isStaff: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span className="text-sm font-medium group-hover:text-foreground text-muted">Register as Staff</span>
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Email</label>
                        <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Phone</label>
                        <Input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Creating...' : 'Register Person'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
