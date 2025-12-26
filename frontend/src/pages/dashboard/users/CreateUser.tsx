import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { usersApi, InviteUserRequest } from '@/api/users.api';
import { useOrganisationsStore } from '@/store/organisations.store';
import { useAuthStore } from '@/store/auth.store';
import { PageHeader } from '@/components/PageHeader';
import { GlassCard } from '@/components/GlassCard';
import toast from 'react-hot-toast';
import { ArrowLeft } from '@phosphor-icons/react';

export const CreateUser = () => {
    const navigate = useNavigate();
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
        if (isSuperAdmin) {
            getOrganisations();
        }
    }, [isSuperAdmin, getOrganisations]);

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
        setLoading(true);

        try {
            const response = await usersApi.inviteUser(formData);

            if (response.data.inviteStatus === 'EXISTS') {
                toast.error(response.data.message || 'User already exists');
            } else {
                toast.success(response.data.message || 'User invited successfully!');
                navigate('/dashboard/users');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to invite user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/users')}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <PageHeader
                    title="Invite User"
                    description="Send an invitation to a new user"
                />
            </div>

            <GlassCard className="max-w-3xl mx-auto p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    />

                    <div>
                        <label className="block text-sm font-medium mb-2 text-muted-foreground">Role</label>
                        <select
                            className="w-full h-10 px-3 rounded-xl border border-white/10 bg-black/5 dark:bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            required
                            aria-label="Select Role"
                        >
                            {getAvailableRoles().map(role => (
                                <option key={role} value={role} className="bg-background text-foreground">{role}</option>
                            ))}
                        </select>
                    </div>

                    {isSuperAdmin && (
                        <div>
                            <label className="block text-sm font-medium mb-2 text-muted-foreground">Organisation</label>
                            <select
                                className="w-full h-10 px-3 rounded-xl border border-white/10 bg-black/5 dark:bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                value={formData.organisationId}
                                onChange={(e) => setFormData({ ...formData, organisationId: e.target.value })}
                                required
                                aria-label="Select Organisation"
                            >
                                <option value="" className="bg-background">Select Organisation</option>
                                {organisations.map(org => (
                                    <option key={org.id} value={org.id} className="bg-background">{org.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {!isSuperAdmin && (
                        <div>
                            <label className="block text-sm font-medium mb-2 text-muted-foreground">Organisation</label>
                            <Input
                                value={user?.organisationId || 'N/A'}
                                disabled
                                className="opacity-60"
                            />
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                        <Button type="button" variant="cancel" onClick={() => navigate('/dashboard/users')}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Inviting...' : 'Send Invite'}
                        </Button>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
};
