import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/store/auth.store';
import { userService } from '@/services/userService';
import { User } from '@/types';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { PageHeader } from '@/components/PageHeader';
import { MagnifyingGlass, UserPlus, PencilSimple, Trash, Shield, Crown, User as UserIcon, Buildings } from '@phosphor-icons/react';
import { Badge } from '@/components/Badge';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/ConfirmModal';
import { GlassCard } from '@/components/GlassCard';
import { BentoGrid, BentoItem } from '../../components/BentoGrid';
import { UsersSummaryCards } from './components/UsersSummaryCards';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/Table';

export default function Users() {
    const navigate = useNavigate();
    const { user: currentUser } = useAuthStore();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, userId: string | null }>({
        isOpen: false,
        userId: null
    });

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await userService.getAll();
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const filteredUsers = users.filter(user =>
        user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeUsersCount = users.filter(u => u.isActive).length;

    const handleDeleteUser = async () => {
        if (!confirmDelete.userId) return;
        try {
            await userService.delete(confirmDelete.userId);
            toast.success('User deactivated successfully');
            fetchUsers();
            setConfirmDelete({ isOpen: false, userId: null });
        } catch (error) {
            console.error('Failed to deactivate user:', error);
            toast.error('Failed to deactivate user');
        }
    };

    const getRoleBadge = (roles: string[]) => {
        const primaryRole = roles[0]?.replace('ROLE_', '');
        let color: 'primary' | 'secondary' | 'outline' | 'destructive' = 'secondary';
        let Icon = UserIcon;

        if (roles.includes('ROLE_SUPER_ADMIN')) {
            color = 'destructive';
            Icon = Crown;
        } else if (roles.includes('ROLE_ORG_ADMIN')) {
            color = 'primary';
            Icon = Buildings; // Using Buildings as a proxy for Org
        } else if (roles.includes('ROLE_CLUB_ADMIN')) {
            color = 'primary';
            Icon = Shield;
        } else if (roles.includes('ROLE_TEAM_MANAGER')) {
            color = 'outline';
            Icon = UserIcon;
        }

        return (
            <Badge variant={color as any} className="gap-1 pl-1 pr-2">
                <Icon className="w-3.5 h-3.5" weight="fill" />
                {primaryRole}
            </Badge>
        );
    };

    const canManageUsers = currentUser?.roles?.some(r =>
        ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN'].includes(r)
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <PageHeader
                title="Users"
                description="Manage users, roles, and permissions."
                action={
                    canManageUsers && (
                        <Button onClick={() => navigate('/dashboard/users/new')} className="gap-2 shadow-lg shadow-primary-500/20">
                            <UserPlus className="w-4 h-4" />
                            Invite User
                        </Button>
                    )
                }
            />

            <UsersSummaryCards
                totalUsers={users.length}
                activeUsers={activeUsersCount}
                pendingInvites={0} // Placeholder until invite tracking is implemented
            />

            <BentoGrid>
                <BentoItem colSpan={3}>
                    <GlassCard className="overflow-hidden flex flex-col h-full">
                        <div className="p-4 border-b border-glass-border flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/5">
                            <div className="relative w-full sm:max-w-md">
                                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted border-glass-border" />
                                <Input
                                    placeholder="Search users by name or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 bg-glass-bg border-glass-border focus:border-primary-500/50 transition-colors"
                                />
                            </div>
                            <div className="text-sm text-muted-foreground hidden sm:block">
                                Showing {filteredUsers.length} of {users.length} users
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-white/5">
                                    <TableRow className="hover:bg-transparent border-glass-border">
                                        <TableHead className="text-muted-foreground font-medium">User</TableHead>
                                        <TableHead className="text-muted-foreground font-medium">Role</TableHead>
                                        <TableHead className="text-muted-foreground font-medium">Organisation</TableHead>
                                        <TableHead className="text-muted-foreground font-medium">Status</TableHead>
                                        {canManageUsers && <TableHead className="text-right text-muted-foreground font-medium">Actions</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i} className="animate-pulse border-glass-border">
                                                <TableCell><div className="h-10 w-32 bg-white/5 rounded" /></TableCell>
                                                <TableCell><div className="h-6 w-20 bg-white/5 rounded" /></TableCell>
                                                <TableCell><div className="h-6 w-24 bg-white/5 rounded" /></TableCell>
                                                <TableCell><div className="h-6 w-16 bg-white/5 rounded" /></TableCell>
                                                <TableCell><div className="h-8 w-8 bg-white/5 rounded ml-auto" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : filteredUsers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                                No users found matching your search.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredUsers.map((user) => (
                                            <TableRow key={user.id} className="hover:bg-white/5 border-glass-border transition-colors">
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500/20 to-blue-600/20 flex items-center justify-center text-primary-200 font-bold border border-white/10">
                                                            {user.firstName[0]}{user.lastName[0]}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-foreground">{user.firstName} {user.lastName}</div>
                                                            <div className="text-xs text-muted-foreground">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{getRoleBadge(Array.from(user.roles || []))}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Buildings className="w-4 h-4 opacity-50" />
                                                        {user.organisationName || 'N/A'}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={user.isActive ? 'success' : 'secondary'}
                                                        className="h-6"
                                                    >
                                                        {user.isActive ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>
                                                {canManageUsers && (
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                                                onClick={() => navigate(`/dashboard/users/${user.id}/edit`)}
                                                            >
                                                                <PencilSimple className="w-4 h-4" />
                                                            </Button>
                                                            {/* Only show delete if not self */}
                                                            {currentUser?.id !== user.id && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                                                                    onClick={() => setConfirmDelete({ isOpen: true, userId: user.id })}
                                                                >
                                                                    <Trash className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </GlassCard>
                </BentoItem>
            </BentoGrid>

            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, userId: null })}
                onConfirm={handleDeleteUser}
                title="Deactivate User"
                message="Are you sure you want to deactivate this user? They will no longer be able to log in."
            />
        </div>
    );
}
