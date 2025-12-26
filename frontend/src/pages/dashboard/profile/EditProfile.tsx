import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { PageHeader } from '@/components/PageHeader';
import { Input } from '@/components/Input';
import { ArrowLeft } from '@phosphor-icons/react';
import { usersApi, UserUpdateRequest } from '@/api/users.api';
import { useAuthStore } from '@/store/auth.store';
import { AddressInputs, AddressData } from '@/components/AddressInputs';
import toast from 'react-hot-toast';

export const EditProfile = () => {
    const navigate = useNavigate();
    const { user, setUser } = useAuthStore();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState<{
        firstName: string;
        lastName: string;
        email: string;
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
        addressLine1: '',
        addressLine2: '',
        city: '',
        postcode: '',
        state: '',
        country: '',
        stateCode: '',
        countryCode: 'MY'
    });

    useEffect(() => {
        if (user) {
            setFormData({
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                addressLine1: user.addressLine1 || '',
                addressLine2: user.addressLine2 || '',
                city: user.city || '',
                postcode: user.postcode || '',
                state: user.state || '',
                country: user.country || '',
                stateCode: user.stateCode || '',
                countryCode: user.countryCode || 'MY'
            });
        } else {
            // Redirect if no user (should be handled by AuthGuard but safe fallback)
            navigate('/login');
        }
    }, [user, navigate]);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);

        try {
            const updateRequest: UserUpdateRequest = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                addressLine1: formData.addressLine1,
                addressLine2: formData.addressLine2,
                city: formData.city,
                postcode: formData.postcode,
                state: formData.state,
                country: formData.country,
                stateCode: formData.stateCode,
                countryCode: formData.countryCode
            };

            await usersApi.updateUser(user.id, updateRequest);
            toast.success('Profile updated successfully');

            // Update local auth store
            setUser({
                ...user,
                ...updateRequest,
                // Ensure we preserve fields that might not be in the request exactly as they are in the User object or vice versa if types mismatch slightly
                // For now, assuming direct mapping is safe or relying on the spread.
                // Re-mapping explicit fields to be safe as per modal implementation:
                stateCode: formData.stateCode,
                countryCode: formData.countryCode,
            });

            navigate('/dashboard/profile');

        } catch (error: any) {
            console.error('Failed to update profile', error);
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/profile')}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <PageHeader
                    title="Edit Profile"
                    description="Update your personal information"
                />
            </div>

            <GlassCard className="max-w-2xl mx-auto p-8">
                <form onSubmit={handleSubmit} className="space-y-6">

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="First Name"
                            value={formData.firstName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('firstName', e.target.value)}
                            required
                        />
                        <Input
                            label="Last Name"
                            value={formData.lastName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('lastName', e.target.value)}
                            required
                        />
                    </div>

                    <Input
                        label="Email"
                        type="email"
                        value={formData.email}
                        disabled
                        className="opacity-50 cursor-not-allowed"
                        helperText="Email cannot be changed."
                    />

                    <div className="space-y-4 pt-4 border-t border-white/10">
                        <h3 className="text-sm font-semibold text-primary-500 uppercase tracking-wider">Address Details</h3>
                        <AddressInputs
                            data={{
                                addressLine1: formData.addressLine1,
                                addressLine2: formData.addressLine2,
                                city: formData.city,
                                postcode: formData.postcode,
                                state: formData.state,
                                stateCode: formData.stateCode,
                                country: 'Malaysia', // Fixed as per modal logic
                                countryCode: formData.countryCode
                            }}
                            onChange={(newData: AddressData) => {
                                setFormData(prev => ({
                                    ...prev,
                                    addressLine1: newData.addressLine1 || '',
                                    addressLine2: newData.addressLine2 || '',
                                    city: newData.city || '',
                                    postcode: newData.postcode || '',
                                    state: newData.state || '',
                                    stateCode: newData.stateCode || '',
                                    countryCode: newData.countryCode || 'MY',
                                    country: 'Malaysia' // Explicitly set country name if component sets it to Country Code or Name
                                }));
                            }}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                        <Button type="button" variant="cancel" onClick={() => navigate('/dashboard/profile')}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={loading}>
                            Save Changes
                        </Button>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
};
