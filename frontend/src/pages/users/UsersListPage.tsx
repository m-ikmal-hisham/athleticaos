import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';

export const UsersListPage = () => {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                        Users
                    </h1>
                    <p className="text-muted-foreground">
                        Manage system users and permissions
                    </p>
                </div>
            </div>

            <Card className="border-border/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        User Management
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">User management interface coming soon...</p>
                </CardContent>
            </Card>
        </div>
    );
};
