import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { usersApi, UserUpdateRequest } from '@/api/users.api';
import { useOrganisationsStore } from '@/store/organisations.store';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';

interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    roles: string[];
    organisationName?: string;
    organisationId?: string;
    isActive: boolean;
}

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
    }>({
        firstName: '',
        lastName: '',
        email: '',
        role: 'PLAYER',
        organisationId: '',
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
            });

            if (isSuperAdmin) {
                getOrganisations();
            }
        }
    }, [isOpen, initialData, isSuperAdmin, getOrganisations]);

    // Determine available roles based on current user's role
    const getAvailableRoles = () => {
        if (isSuperAdmin) {
            return ['SUPER_ADMIN', 'ORG_ADMIN', 'CLUB_ADMIN', 'COACH', 'PLAYER'];
        } else if (isOrgAdmin) {
            return ['CLUB_ADMIN', 'COACH', 'PLAYER'];
        } else if (isClubAdmin) {
            return ['COACH', 'PLAYER'];
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

                <div>
                    <label className="block text-sm font-medium mb-2 text-muted-foreground">Role</label>
                    <select
                        className="input-base h-10"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        required
                    >
                        {getAvailableRoles().map(role => (
                            <option key={role} value={role}>{role}</option>
                        ))}
                    </select>
                </div>

                {isSuperAdmin && (
                    <div>
                        <label className="block text-sm font-medium mb-2 text-muted-foreground">Organisation</label>
                        <select
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
