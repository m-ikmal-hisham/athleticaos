import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { showToast } from '@/lib/customToast';
import { updatePerson, PersonResponseDTO } from '@/api/persons.api';

interface EditPersonModalProps {
    isOpen: boolean;
    onClose: () => void;
    person: PersonResponseDTO | null;
    onSuccess: () => void;
}

export const EditPersonModal: React.FC<EditPersonModalProps> = ({ isOpen, onClose, person, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        identificationType: 'MALAYSIAN_IC',
        icOrPassport: '',
        dob: '',
        gender: '',
        nationality: '',
        email: '',
        phone: '',
        nationalPlayerStatus: 'NONE',
        isPlayer: false,
        isOfficial: false,
        isStaff: false
    });

    useEffect(() => {
        if (person && isOpen) {
            setFormData({
                firstName: person.firstName || '',
                lastName: person.lastName || '',
                identificationType: person.identificationType || 'MALAYSIAN_IC',
                icOrPassport: '', // Phase 1: do not preload raw identification
                dob: person.dob || '',
                gender: person.gender || '',
                nationality: person.nationality || '',
                email: person.email || '',
                phone: person.phone || '',
                nationalPlayerStatus: person.nationalPlayerStatus || 'NONE',
                isPlayer: person.isPlayer || false,
                isOfficial: person.isOfficial || false,
                isStaff: person.isStaff || false
            });
        }
    }, [person, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!person) return;

        setLoading(true);
        try {
            const payload = {
                ...formData,
                icOrPassport: formData.icOrPassport.trim() ? formData.icOrPassport.trim() : undefined
            };
            await updatePerson(person.id, payload as any);
            showToast.success('Person updated successfully');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Update failed', error);
            showToast.error(error.response?.data?.message || 'Failed to update person');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Person Details" size="md">
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

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Identification Type</label>
                        <select
                            aria-label="Identification Type"
                            value={formData.identificationType}
                            onChange={(e) => setFormData({ ...formData, identificationType: e.target.value })}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-0"
                        >
                            {formData.identificationType === 'IC' && <option value="IC">IC (Legacy)</option>}
                            <option value="MALAYSIAN_IC">Malaysian IC</option>
                            <option value="PASSPORT">Passport</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-sm font-medium block">IC or Passport</label>
                            {person?.identificationPresent && (
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    ID on file: PRESENT
                                </span>
                            )}
                        </div>
                        <Input
                            value={formData.icOrPassport}
                            onChange={(e) => setFormData({ ...formData, icOrPassport: e.target.value })}
                            placeholder={person?.identificationPresent ? "Leave blank to keep existing ID" : "ID / Passport Number"}
                        />
                    </div>
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
                        value={formData.nationality}
                        onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    />
                </div>

                <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-border">
                    <label className="text-sm font-bold mb-3 block text-foreground">Updated Roles</label>
                    <div className="flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={formData.isPlayer}
                                onChange={(e) => setFormData({ ...formData, isPlayer: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="text-sm font-medium group-hover:text-foreground text-muted">Player</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={formData.isOfficial}
                                onChange={(e) => setFormData({ ...formData, isOfficial: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                            />
                            <span className="text-sm font-medium group-hover:text-foreground text-muted">Official</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={formData.isStaff}
                                onChange={(e) => setFormData({ ...formData, isStaff: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span className="text-sm font-medium group-hover:text-foreground text-muted">Staff</span>
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

                <div>
                    <label className="text-sm font-medium mb-1 block">National Player Status</label>
                    <select
                        title="National Player Status"
                        value={formData.nationalPlayerStatus}
                        onChange={(e) => setFormData({ ...formData, nationalPlayerStatus: e.target.value })}
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="NONE">None</option>
                        <option value="ACTIVE">Active National Player</option>
                        <option value="FORMER">Former National Player</option>
                    </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
