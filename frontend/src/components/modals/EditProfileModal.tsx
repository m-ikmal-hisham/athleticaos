import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal'; // Adjust import path if needed
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { usersApi, UserUpdateRequest } from '@/api/users.api';
import { useAuthStore } from '@/store/auth.store';
import { AddressInputs, AddressData } from '@/components/AddressInputs';
import toast from 'react-hot-toast';
import { User } from '@/types';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    initialData: User | null;
}

export const EditProfileModal = ({ isOpen, onClose, onSuccess, initialData }: EditProfileModalProps) => {
    const { setUser } = useAuthStore(); // Use to update local user state on success

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
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                firstName: initialData.firstName,
                lastName: initialData.lastName,
                email: initialData.email,
                addressLine1: initialData.addressLine1 || '',
                addressLine2: initialData.addressLine2 || '',
                city: initialData.city || '',
                postcode: initialData.postcode || '',
                state: initialData.state || '',
                country: initialData.country || '',
                stateCode: initialData.stateCode || '',
                countryCode: initialData.countryCode || 'MY'
            });
        }
    }, [isOpen, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!initialData) return;

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
                country: formData.country
            };
            // Note: We don't send emails or roles updates here.

            await usersApi.updateUser(initialData.id, updateRequest);
            toast.success('Profile updated successfully');

            // Update local auth store if we are editing the current user (which we are)
            setUser({
                ...initialData,
                ...updateRequest,
                // Ensure we preserve fields not in request
                stateCode: formData.stateCode,
                countryCode: formData.countryCode,
                // Other fields...
                id: initialData.id,
                email: initialData.email,
                roles: initialData.roles,
                active: initialData.active
            });

            onSuccess?.();
            onClose();

        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile">
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
                    disabled
                    className="opacity-50 cursor-not-allowed"
                />

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

                <div className="flex justify-end gap-3 pt-4">
                    <Button
                        type="button"
                        variant="cancel"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" isLoading={loading}>
                        Save Changes
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
