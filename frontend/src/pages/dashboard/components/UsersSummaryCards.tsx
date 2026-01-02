import { GlassCard } from '@/components/GlassCard';
import { Users, UserCheck, UserPlus, ShieldCheck } from '@phosphor-icons/react';

interface UsersSummaryCardsProps {
    totalUsers: number;
    activeUsers: number;
    pendingInvites?: number;
    adminRolesCount?: number;
}

export const UsersSummaryCards = ({ totalUsers, activeUsers, pendingInvites = 0, adminRolesCount = 0 }: UsersSummaryCardsProps) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <GlassCard className="p-4 flex items-center justify-between relative overflow-hidden group hover:bg-white/5 transition-colors">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                    <h3 className="text-2xl font-bold mt-1 text-foreground">{totalUsers}</h3>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary-500/20 text-primary-400 flex items-center justify-center">
                    <Users className="w-6 h-6" weight="duotone" />
                </div>
            </GlassCard>

            <GlassCard className="p-4 flex items-center justify-between relative overflow-hidden group hover:bg-white/5 transition-colors">
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                    <h3 className="text-2xl font-bold mt-1 text-foreground">{activeUsers}</h3>
                </div>
                <div className="w-10 h-10 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center">
                    <UserCheck className="w-6 h-6" weight="duotone" />
                </div>
            </GlassCard>

            <GlassCard className="p-4 flex items-center justify-between relative overflow-hidden group hover:bg-white/5 transition-colors">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <div>
                    <p className="text-sm font-medium text-muted-foreground">Pending Invites</p>
                    <h3 className="text-2xl font-bold mt-1 text-foreground">{pendingInvites}</h3>
                </div>
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
                    <UserPlus className="w-6 h-6" weight="duotone" />
                </div>
            </GlassCard>

            <GlassCard className="p-4 flex items-center justify-between relative overflow-hidden group hover:bg-white/5 transition-colors">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <div>
                    <p className="text-sm font-medium text-muted-foreground">Admin Roles</p>
                    <h3 className="text-2xl font-bold mt-1 text-foreground">{adminRolesCount}</h3>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6" weight="duotone" />
                </div>
            </GlassCard>
        </div>
    );
};
