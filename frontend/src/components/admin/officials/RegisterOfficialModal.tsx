import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { SearchableSelect } from '@/components/SearchableSelect';
import { showToast } from '@/lib/customToast';
import { registerOfficial } from '@/api/officials.api';
import { getOfficialRoles } from '@/api/officials.api';
import { fetchOrganisations } from '@/api/organisations.api';
import api from '@/api/axios';

interface RegisterOfficialModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const RegisterOfficialModal: React.FC<RegisterOfficialModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [organisations, setOrganisations] = useState<any[]>([]);
    const [persons, setPersons] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);

    const [selectedOrgId, setSelectedOrgId] = useState<string>('');
    const [formData, setFormData] = useState({
        personId: '',
        accreditationLevel: '',
        primaryRole: '',
        badgeNumber: '',
        expiryDate: '',
        isWorldRugbyCertified: false,
    });

    useEffect(() => {
        if (isOpen) {
            loadInitialData();
            // Reset state
            setSelectedOrgId('');
            setFormData({
                personId: '',
                accreditationLevel: '',
                primaryRole: '',
                badgeNumber: '',
                expiryDate: '',
                isWorldRugbyCertified: false,
            });
            setPersons([]);
        }
    }, [isOpen]);

    const loadInitialData = async () => {
        try {
            const [orgs, fetchedRoles] = await Promise.all([
                fetchOrganisations(),
                getOfficialRoles()
            ]);
            setOrganisations(orgs);
            setRoles(fetchedRoles);
        } catch (err) {
            console.error('Failed to load initial data', err);
            showToast.error('Failed to load required data');
        }
    };

    useEffect(() => {
        if (selectedOrgId) {
            loadPersonsForOrg(selectedOrgId);
            setFormData(prev => ({ ...prev, personId: '' })); // Reset person choice when org changes
        } else {
            setPersons([]);
        }
    }, [selectedOrgId]);

    const loadPersonsForOrg = async (orgId: string) => {
        try {
            const { data } = await api.get(`/organisations/${orgId}/persons`);
            setPersons(data);
        } catch (err) {
            console.error('Failed to load persons for org', err);
            showToast.error('Failed to load available persons');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedOrgId || !formData.personId || !formData.accreditationLevel || !formData.primaryRole || !formData.badgeNumber) {
            showToast.error('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            await registerOfficial({
                organisationId: selectedOrgId,
                personId: formData.personId,
                accreditationLevel: formData.accreditationLevel,
                primaryRole: formData.primaryRole,
                badgeNumber: formData.badgeNumber,
                expiryDate: formData.expiryDate || undefined,
                isWorldRugbyCertified: formData.isWorldRugbyCertified
            });
            showToast.success('Official registered successfully');
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Failed to register official', err);
            showToast.error(err.response?.data?.message || 'Failed to register official');
        } finally {
            setLoading(false);
        }
    };

    const formatRoleName = (name: string) => {
        return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Register Official" size="md">
            <div className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Organisation</label>
                        <SearchableSelect
                            value={selectedOrgId}
                            onChange={(val) => setSelectedOrgId(val as string)}
                            options={[
                                { value: '', label: 'Select Organisation...' },
                                ...organisations.map(o => ({ value: o.id, label: o.name }))
                            ]}
                            placeholder="Select Organisation"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Select the Official's home organisation.</p>
                    </div>

                    {selectedOrgId && (
                        <div>
                            <label className="text-sm font-medium mb-1 block">Person</label>
                            <SearchableSelect
                                value={formData.personId}
                                onChange={(val) => setFormData({ ...formData, personId: val as string })}
                                options={[
                                    { value: '', label: 'Select Person...' },
                                    ...persons.map(p => ({ value: p.id, label: `${p.firstName} ${p.lastName} (${p.icOrPassport})` }))
                                ]}
                                placeholder="Select Person"
                            />
                        </div>
                    )}

                    <div>
                        <label className="text-sm font-medium mb-1 block">Primary Role</label>
                        <SearchableSelect
                            value={formData.primaryRole}
                            onChange={(val) => setFormData({ ...formData, primaryRole: val as string })}
                            options={[
                                { value: '', label: 'Select Role...' },
                                ...roles.map(r => ({ value: r.name, label: formatRoleName(r.name) }))
                            ]}
                            placeholder="Select Primary Role"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1 block">Accreditation Level</label>
                        <SearchableSelect
                            value={formData.accreditationLevel}
                            onChange={(val) => setFormData({ ...formData, accreditationLevel: val as string })}
                            options={[
                                { value: '', label: 'Select Level...' },
                                { value: 'LEVEL_1', label: 'Level 1' },
                                { value: 'LEVEL_2', label: 'Level 2' },
                                { value: 'LEVEL_3', label: 'Level 3' },
                                { value: 'NATIONAL', label: 'National' },
                                { value: 'INTERNATIONAL', label: 'International' },
                            ]}
                            placeholder="Select Level"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1 block">Badge Number</label>
                        <Input
                            required
                            value={formData.badgeNumber}
                            onChange={(e) => setFormData({ ...formData, badgeNumber: e.target.value })}
                            placeholder="e.g., REF-2024-123"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1 block">Expiry Date (Optional)</label>
                        <Input
                            type="datetime-local"
                            value={formData.expiryDate}
                            onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                        />
                    </div>

                    <div className="flex items-center gap-2 px-1">
                        <input 
                            type="checkbox" 
                            id="official-wr-certified"
                            checked={formData.isWorldRugbyCertified}
                            onChange={e => setFormData({...formData, isWorldRugbyCertified: e.target.checked})}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="official-wr-certified" className="text-sm font-medium cursor-pointer">
                            World Rugby Certified
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Registering...' : 'Register Official'}
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};
