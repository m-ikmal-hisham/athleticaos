import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { Card, CardContent } from '@/components/Card';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { EditProfileModal } from '@/components/modals/EditProfileModal';
import { MapPin } from '@phosphor-icons/react';

export default function Profile() {
    const { user } = useAuthStore();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    if (!user) {
        return <div>Loading...</div>;
    }

    const fullAddress = [
        user.addressLine1,
        user.addressLine2,
        user.postcode,
        user.city,
        user.state,
        user.country
    ].filter(Boolean).join(', ');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <PageHeader
                    title="My Profile"
                    description="View and manage your profile information"
                />
                <Button onClick={() => setIsEditModalOpen(true)}>
                    Edit Profile
                </Button>
            </div>

            <Card>
                <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground block mb-1">Name</label>
                            <p className="text-lg font-medium">{user.firstName} {user.lastName}</p>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-muted-foreground block mb-1">Email</label>
                            <p className="text-lg">{user.email}</p>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-muted-foreground block mb-1">Role</label>
                            <p className="text-lg">{user.roles?.map(r => r.replace('ROLE_', '')).join(', ')}</p>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-muted-foreground block mb-1">Organisation</label>
                            <p className="text-lg">{user.organisationName || user.organisationId || 'N/A'}</p>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-muted-foreground block mb-1">Status</label>
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${user.isActive || user.active ? 'bg-green-500' : 'bg-red-500'}`} />
                                <p className="text-lg">{user.isActive || user.active ? 'Active' : 'Inactive'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-white/10">
                        <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                            <div>
                                <label className="text-sm font-medium text-muted-foreground block mb-1">Address</label>
                                {fullAddress ? (
                                    <div className="space-y-1">
                                        <p className="text-lg">{user.addressLine1}</p>
                                        {user.addressLine2 && <p className="text-lg">{user.addressLine2}</p>}
                                        <p className="text-lg">
                                            {[user.postcode, user.city].filter(Boolean).join(' ')}
                                        </p>
                                        <p className="text-lg">
                                            {[user.state, user.country].filter(Boolean).join(', ')}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground italic">No address provided</p>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <EditProfileModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                initialData={user}
            />
        </div>
    );
}
