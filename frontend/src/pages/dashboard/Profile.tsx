import { useAuthStore } from '@/store/auth.store';
import { Card, CardContent } from '@/components/Card';
import { PageHeader } from '@/components/PageHeader';

export default function Profile() {
    const { user } = useAuthStore();

    if (!user) {
        return <div>Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="My Profile"
                description="View your profile information"
            />

            <Card>
                <CardContent className="p-6 space-y-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Name</label>
                        <p className="text-lg font-medium">{user.firstName} {user.lastName}</p>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <p className="text-lg">{user.email}</p>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Role</label>
                        <p className="text-lg">{user.roles?.map(r => r.replace('ROLE_', '')).join(', ')}</p>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Organisation</label>
                        <p className="text-lg">{user.organisationName || user.organisationId || 'N/A'}</p>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                        <p className="text-lg">{user.isActive || user.active ? 'Active' : 'Inactive'}</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
