import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { usersApi, UserUpdateRequest } from '@/api/users.api';
import { useOrganisationsStore } from '@/store/organisations.store';
import { AddressInputs, AddressData } from '@/components/AddressInputs';
import { useAuthStore } from '@/store/auth.store';
import { PageHeader } from '@/components/PageHeader';
import { GlassCard } from '@/components/GlassCard';
import toast from 'react-hot-toast';
import { ArrowLeft } from '@phosphor-icons/react';

export const EditUser = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user: currentUser } = useAuthStore();
    const { organisations, getOrganisations } = useOrganisationsStore();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

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

    const isSuperAdmin = currentUser?.roles?.includes('ROLE_SUPER_ADMIN');
    const isOrgAdmin = currentUser?.roles?.includes('ROLE_ORG_ADMIN');
    const isClubAdmin = currentUser?.roles?.includes('ROLE_CLUB_ADMIN');

    useEffect(() => {
        const loadUser = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const response = await usersApi.getUserById(id);
                const initialData = response.data;

                // Find the highest priority role or just the first one
                const primaryRole = initialData.roles.find((r: string) => r === 'ROLE_SUPER_ADMIN') ||
                    initialData.roles.find((r: string) => r === 'ROLE_ORG_ADMIN') ||
                    initialData.roles.find((r: string) => r === 'ROLE_CLUB_ADMIN') ||
                    initialData.roles.find((r: string) => r === 'ROLE_COACH') ||
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
            } catch (error) {
                console.error("Failed to load user", error);
                toast.error("Failed to load user details");
                navigate('/dashboard/users');
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, [id, isSuperAdmin, getOrganisations, navigate]);

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
        if (!id) return;

        setSaving(true);

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

            await usersApi.updateUser(id, updateRequest);
            toast.success('User updated successfully');
            navigate('/dashboard/users');

        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to update user');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/users')}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <PageHeader
                    title="Edit User"
                    description={`Editing ${formData.firstName} ${formData.lastName}`}
                />
            </div>

            <GlassCard className="max-w-3xl mx-auto p-8">
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
                        disabled
                        className="opacity-70"
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
                                <option key={role} value={role} className="bg-background">{role}</option>
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

                    <div className="space-y-4 pt-4 border-t border-white/10">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Address Details</h3>
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

                    <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                        <Button
                            type="button"
                            variant="cancel"
                            onClick={() => navigate('/dashboard/users')}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
};
