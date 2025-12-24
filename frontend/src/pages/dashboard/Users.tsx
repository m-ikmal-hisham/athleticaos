import { useEffect, useState } from 'react';
import { MagnifyingGlass, UserPlus, PencilSimple } from '@phosphor-icons/react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { GlassCard } from '@/components/GlassCard';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/Table';
import { Badge } from '@/components/Badge';
import { InviteUserModal } from '@/components/InviteUserModal';
import { EditUserModal } from '@/components/EditUserModal';
import { usersApi } from '@/api/users.api';
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

export default function Users() {
    const { user: currentUser } = useAuthStore();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const canManageUsers = currentUser?.roles?.some(r =>
        ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN'].includes(r)
    );

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await usersApi.getAllUsers();
            setUsers(response.data);
        } catch (error) {
            toast.error('Failed to load users');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const filteredUsers = users.filter(u => {
        const query = searchQuery.toLowerCase();
        return (
            u.firstName.toLowerCase().includes(query) ||
            u.lastName.toLowerCase().includes(query) ||
            u.email.toLowerCase().includes(query)
        );
    });

    const getRoleBadgeVariant = (role: string) => {
        if (role.includes('SUPER_ADMIN')) return 'destructive';
        if (role.includes('ORG_ADMIN')) return 'default';
        if (role.includes('CLUB_ADMIN')) return 'secondary';
        if (role.includes('COACH')) return 'outline';
        return 'secondary';
    };

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setIsEditModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Users"
                description="Manage user accounts and invitations"
                action={
                    canManageUsers && (
                        <Button onClick={() => setIsInviteModalOpen(true)}>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Invite User
                        </Button>
                    )
                }
            />

            <GlassCard>
                <div className="p-0">
                    <div className="p-4 border-b border-glass-border">
                        <div className="relative">
                            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                            <Input
                                placeholder="Search by name or email..."
                                className="pl-9 bg-glass-bg/50"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <Table>
                        <TableHeader className="border-b border-border/60">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="text-xs font-medium text-muted-foreground">Name</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground">Email</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground">Role</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground">Organisation</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">Loading users...</TableCell>
                                </TableRow>
                            ) : filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No users found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredUsers.map((u) => (
                                    <TableRow
                                        key={u.id}
                                        className="hover:bg-muted/30 transition-colors border-b border-border/40 group"
                                    >
                                        <TableCell className="py-4">
                                            <span className="text-sm font-medium">{u.firstName} {u.lastName}</span>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <span className="text-sm text-muted-foreground">{u.email}</span>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="flex gap-1">
                                                {u.roles.map((role, idx) => (
                                                    <Badge
                                                        key={idx}
                                                        variant={getRoleBadgeVariant(role) as any}
                                                        className="text-xs"
                                                    >
                                                        {role.replace('ROLE_', '')}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <span className="text-sm">{u.organisationName || '—'}</span>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <Badge
                                                variant={u.isActive ? 'success' : 'secondary'}
                                                className="text-xs"
                                            >
                                                {u.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-4 text-right">
                                            {canManageUsers && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => handleEdit(u)}
                                                >
                                                    <PencilSimple className="w-3 h-3 mr-1" />
                                                    Edit
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </GlassCard>

            <InviteUserModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                onSuccess={fetchUsers}
            />

            <EditUserModal
                isOpen={isEditModalOpen}
                initialData={selectedUser}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={fetchUsers}
            />
        </div>
    );
}
