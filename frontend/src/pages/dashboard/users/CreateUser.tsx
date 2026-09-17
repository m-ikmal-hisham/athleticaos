import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatRoleName } from '@/utils/stringUtils';
import { SearchableSelect } from '@/components/SearchableSelect';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { usersApi, InviteUserRequest } from '@/api/users.api';
import { useOrganisationsStore } from '@/store/organisations.store';
import { useAuthStore } from '@/store/auth.store';
import { PageHeader } from '@/components/PageHeader';
import { GlassCard } from '@/components/GlassCard';
import { showToast } from '@/lib/customToast';
import { generateStrongPassword, passwordProblem, PASSWORD_MIN_LENGTH } from '@/utils/password';
import { ArrowLeft } from '@phosphor-icons/react';
import { AxiosError } from 'axios';

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
        password: '',
    });
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
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

    const handleGeneratePassword = () => {
        const generated = generateStrongPassword(formData.email);
        setFormData({ ...formData, password: generated });
        setConfirmPassword(generated);
        setShowPassword(true); // so the admin can copy it and pass it on out-of-band
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const problem = passwordProblem(formData.password, formData.email)
            ?? (formData.password !== confirmPassword ? 'Passwords do not match' : null);
        if (problem) {
            showToast.error(problem);
            return;
        }
        setLoading(true);

        try {
            const response = await usersApi.inviteUser(formData);

            if (response.data.inviteStatus === 'EXISTS') {
                showToast.error(response.data.message || 'User already exists');
            } else {
                showToast.success(response.data.message || 'User invited successfully!');
                navigate('/dashboard/users');
            }
        } catch (error: unknown) {
            const axiosError = error as AxiosError<{ message?: string }>;
            showToast.error(axiosError.response?.data?.message || 'Failed to invite user');
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
                        label={formData.role === 'PLAYER' ? "Email (Optional)" : "Email"}
                        type="email"
                        value={formData.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
                        required={formData.role !== 'PLAYER'}
                    />

                    <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                label="Initial Password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                value={formData.password}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, password: e.target.value })}
                                helperText={`At least ${PASSWORD_MIN_LENGTH} characters. The user must change it at first sign-in.`}
                                required
                            />
                            <Input
                                label="Confirm Password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button type="button" variant="ghost" size="sm" onClick={handleGeneratePassword}>
                                Generate strong password
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? 'Hide' : 'Show'}
                            </Button>
                        </div>
                    </div>

                    <div>
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
                    </div>

                    {isSuperAdmin && (
                        <div>
                            <SearchableSelect
                                label="Organisation"
                                value={formData.organisationId}
                                onChange={(value) => setFormData({ ...formData, organisationId: value as string })}
                                options={organisations.map(org => ({
                                    value: org.id,
                                    label: org.name
                                }))}
                                required
                            />
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
