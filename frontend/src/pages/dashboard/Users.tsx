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
import { UsersSummaryCards } from './components/UsersSummaryCards';
import { formatRoleName } from '@/utils/stringUtils';
import { SEO } from '@/components/common/SEO';

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

    const adminRolesCount = users.filter(u =>
        u.roles?.some(r => ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN'].includes(r))
    ).length;

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
                {formatRoleName(primaryRole)}
            </Badge>
        );
    };

    const canManageUsers = currentUser?.roles?.some(r =>
        ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN'].includes(r)
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <SEO
                title="Users Management"
                description="Manage users, roles, and permissions in your organisation."
                url="/dashboard/users"
            />
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
                adminRolesCount={adminRolesCount}
            />

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="relative w-full md:w-96">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted border-glass-border" />
                    <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-glass-bg border-glass-border focus:border-primary-500/50 transition-colors"
                    />
                </div>
                <div className="text-sm text-muted-foreground hidden sm:block">
                    Showing {filteredUsers.length} of {users.length} users
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <GlassCard key={i} className="h-48 animate-pulse flex flex-col p-6">
                            <div className="w-12 h-12 rounded-full bg-white/5 mb-4" />
                            <div className="w-3/4 h-5 bg-white/5 rounded mb-2" />
                            <div className="w-1/2 h-4 bg-white/5 rounded" />
                        </GlassCard>
                    ))}
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] border border-dashed border-white/10 rounded-xl bg-white/5 text-center p-8">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        <MagnifyingGlass className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No users found</h3>
                    <p className="text-muted-foreground max-w-sm">
                        No users match your search criteria. Try adjusting your search or add a new user.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredUsers.map((user) => (
                        <GlassCard
                            key={user.id}
                            className="group relative flex flex-col p-5 hover:bg-white/5 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-glass-lg border-white/10"
                            onClick={() => navigate(`/dashboard/users/${user.id}/edit`)}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary-500/20 to-blue-600/20 text-primary-200 font-bold border border-white/10">
                                    {user.firstName[0]}{user.lastName[0]}
                                </div>
                                <div className="flex gap-1">
                                    <Badge
                                        variant={user.isActive ? 'success' : 'secondary'}
                                        className="h-5 text-[10px] px-1.5"
                                    >
                                        {user.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                    {canManageUsers && (
                                        <>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/users/${user.id}/edit`); }}
                                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                                                aria-label="Edit user"
                                            >
                                                <PencilSimple className="w-4 h-4" />
                                            </button>
                                            {currentUser?.id !== user.id && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setConfirmDelete({ isOpen: true, userId: user.id }); }}
                                                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-colors"
                                                    aria-label="Delete user"
                                                >
                                                    <Trash className="w-4 h-4" />
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1 mb-4 flex-1">
                                <h3 className="font-semibold text-lg leading-tight truncate text-foreground group-hover:text-primary-400 transition-colors">
                                    {user.firstName} {user.lastName}
                                </h3>
                                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                            </div>

                            <div className="pt-4 border-t border-white/5 space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="uppercase tracking-wider opacity-60">Role</span>
                                    {getRoleBadge(Array.from(user.roles || []))}
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="uppercase tracking-wider opacity-60">Org</span>
                                    <span className="font-medium text-foreground truncate max-w-[120px]" title={user.organisationName}>
                                        {user.organisationName || '-'}
                                    </span>
                                </div>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}

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
