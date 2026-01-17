import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { usersApi, InviteUserRequest } from '@/api/users.api';
import { useOrganisationsStore } from '@/store/organisations.store';
import { useAuthStore } from '@/store/auth.store';
import { showToast } from '@/lib/customToast';
import { formatRoleName } from '@/utils/stringUtils';
import { SearchableSelect } from '@/components/SearchableSelect';

interface InviteUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export const InviteUserModal = ({ isOpen, onClose, onSuccess }: InviteUserModalProps) => {
    const { user } = useAuthStore();
    const { organisations, getOrganisations } = useOrganisationsStore();

    const [formData, setFormData] = useState<InviteUserRequest>({
        firstName: '',
        lastName: '',
        email: '',
        role: 'PLAYER',
        organisationId: '',
    });
    const [loading, setLoading] = useState(false);

    const isSuperAdmin = user?.roles?.includes('ROLE_SUPER_ADMIN');
    const isOrgAdmin = user?.roles?.includes('ROLE_ORG_ADMIN');
    const isClubAdmin = user?.roles?.includes('ROLE_CLUB_ADMIN');

    // Auto-set organisation for non-SUPER_ADMIN users
    useEffect(() => {
        if (!isSuperAdmin && user?.organisationId) {
            setFormData(prev => ({ ...prev, organisationId: user.organisationId || '' }));
        }
    }, [isSuperAdmin, user]);

    useEffect(() => {
        if (isOpen && isSuperAdmin) {
            getOrganisations();
        }
    }, [isOpen, isSuperAdmin, getOrganisations]);

    // Determine available roles based on current user's role
    const getAvailableRoles = () => {
        if (isSuperAdmin) {
            return ['SUPER_ADMIN', 'ORG_ADMIN', 'CLUB_ADMIN', 'TEAM_MANAGER', 'COACH', 'PLAYER'];
        } else if (isOrgAdmin) {
            return ['CLUB_ADMIN', 'TEAM_MANAGER', 'COACH', 'PLAYER'];
        } else if (isClubAdmin) {
            return ['TEAM_MANAGER', 'COACH', 'PLAYER'];
        }
        // Team Manager can invite Players (and maybe Coaches? sticking to prompt "view and manage players")
        // If we want Team Manager to invite players:
        // else if (isTeamManager) { return ['PLAYER']; }
        return ['PLAYER'];
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await usersApi.inviteUser(formData);

            if (response.data.inviteStatus === 'EXISTS') {
                showToast.error(response.data.message || 'User already exists');
            } else {
                showToast.success(response.data.message || 'User invited successfully!');
                onSuccess?.();
                onClose();
                // Reset form
                setFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    role: 'PLAYER',
                    organisationId: isSuperAdmin ? '' : user?.organisationId || '',
                });
            }
        } catch (error: any) {
            showToast.error(error.response?.data?.message || 'Failed to invite user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Invite User">
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
                    label={formData.role === 'PLAYER' ? "Email (Optional)" : "Email"}
                    type="email"
                    value={formData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
                    required={formData.role !== 'PLAYER'}
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
                        <SearchableSelect
                            label="Organisation"
                            value={formData.organisationId}
                            onChange={(value) => setFormData({ ...formData, organisationId: value as string })}
                            options={[
                                { value: '', label: 'Select Organisation' },
                                ...organisations.map(org => ({ value: org.id, label: org.name }))
                            ]}
                            placeholder="Select Organisation"
                            required
                        />
                    </div>
                )}

                {!isSuperAdmin && (
                    <div>
                        <label className="block text-sm font-medium mb-2">Organisation</label>
                        <Input
                            value={user?.organisationId || 'N/A'}
                            disabled
                        />
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="cancel" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Inviting...' : 'Send Invite'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
