import { useState, useEffect } from 'react';
import { formatRoleName } from '@/utils/stringUtils';
import { SearchableSelect } from '@/components/SearchableSelect';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { usersApi, UserUpdateRequest } from '@/api/users.api';
import { useOrganisationsStore } from '@/store/organisations.store';
import { AddressInputs, AddressData } from '@/components/AddressInputs';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';
import { User } from '@/types';

interface EditUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    initialData: User | null;
}

export const EditUserModal = ({ isOpen, onClose, onSuccess, initialData }: EditUserModalProps) => {
    const { user: currentUser } = useAuthStore();
    const { organisations, getOrganisations } = useOrganisationsStore();

    const [formData, setFormData] = useState<{
        firstName: string;
        lastName: string;
        email: string;
        role: string;
        organisationId: string;
        addressLine1: string;
        addressLine2: string;
        city: string;
        postcode: string;
        state: string;
        country: string;
        stateCode: string;
        countryCode: string;
    }>({
        firstName: '',
        lastName: '',
        email: '',
        role: 'PLAYER',
        organisationId: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        postcode: '',
        state: '',
        country: '',
        stateCode: '',
        countryCode: 'MY'
    });
    const [loading, setLoading] = useState(false);

    const isSuperAdmin = currentUser?.roles?.includes('ROLE_SUPER_ADMIN');
    const isOrgAdmin = currentUser?.roles?.includes('ROLE_ORG_ADMIN');
    const isClubAdmin = currentUser?.roles?.includes('ROLE_CLUB_ADMIN');

    useEffect(() => {
        if (isOpen && initialData) {
            // Find the highest priority role or just the first one
            const primaryRole = initialData.roles.find(r => r === 'ROLE_SUPER_ADMIN') ||
                initialData.roles.find(r => r === 'ROLE_ORG_ADMIN') ||
                initialData.roles.find(r => r === 'ROLE_CLUB_ADMIN') ||
                initialData.roles.find(r => r === 'ROLE_COACH') ||
                'ROLE_PLAYER';

            setFormData({
                firstName: initialData.firstName,
                lastName: initialData.lastName,
                email: initialData.email,
                role: primaryRole.replace('ROLE_', ''),
                organisationId: initialData.organisationId || '',
                addressLine1: initialData.addressLine1 || '',
                addressLine2: initialData.addressLine2 || '',
                city: initialData.city || '',
                postcode: initialData.postcode || '',
                state: initialData.state || '',
                country: initialData.country || '',
                stateCode: initialData.stateCode || '',
                countryCode: initialData.countryCode || 'MY'
            });

            if (isSuperAdmin) {
                getOrganisations();
            }
        }
    }, [isOpen, initialData, isSuperAdmin, getOrganisations]);

    // Determine available roles based on current user's role
    const getAvailableRoles = () => {
        if (isSuperAdmin) {
            return ['SUPER_ADMIN', 'ORG_ADMIN', 'CLUB_ADMIN', 'TEAM_MANAGER', 'COACH', 'PLAYER'];
        } else if (isOrgAdmin) {
            return ['CLUB_ADMIN', 'TEAM_MANAGER', 'COACH', 'PLAYER'];
        } else if (isClubAdmin) {
            return ['TEAM_MANAGER', 'COACH', 'PLAYER'];
        }
        return ['PLAYER'];
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!initialData) return;

        setLoading(true);

        try {
            const updateRequest: UserUpdateRequest = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                roles: [`ROLE_${formData.role}`],
                organisationId: formData.organisationId,
                addressLine1: formData.addressLine1,
                addressLine2: formData.addressLine2,
                city: formData.city,
                postcode: formData.postcode,
                state: formData.state,
                country: formData.country
            };

            await usersApi.updateUser(initialData.id, updateRequest);
            toast.success('User updated successfully');
            onSuccess?.();
            onClose();

        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to update user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit User">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="First Name"
                        value={formData.firstName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, firstName: e.target.value })}
                        required
                    />
                    <Input
                        label="Last Name"
                        value={formData.lastName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, lastName: e.target.value })}
                        required
                    />
                </div>

                <Input
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled // Email usually shouldn't be changed easily or maybe it can? Let's allow it but be careful. Actually user said "edit Users", usually entails email too.
                />

                <SearchableSelect
                    label="Role"
                    value={formData.role}
                    onChange={(value) => setFormData({ ...formData, role: value as string })}
                    options={getAvailableRoles().map(role => ({
                        value: role,
                        label: formatRoleName(role)
                    }))}
                    required
                />

                {isSuperAdmin && (
                    <div>
                        <label className="block text-sm font-medium mb-2 text-muted-foreground">Organisation</label>
                        <select
                            aria-label="Organisation Selection"
                            className="input-base h-10"
                            value={formData.organisationId}
                            onChange={(e) => setFormData({ ...formData, organisationId: e.target.value })}
                            required
                        >
                            <option value="">Select Organisation</option>
                            {organisations.map(org => (
                                <option key={org.id} value={org.id}>{org.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="space-y-4 pt-4 border-t border-white/10">
                    <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Address Details</h3>
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

                {/* Status Toggle could be added here later if needed, but for now user focused on "Ranking admin access" (roles) */}

                <div className="flex justify-end gap-3 pt-4">
                    <Button
                        type="button"
                        variant="cancel"
                        onClick={onClose}
                    >
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
