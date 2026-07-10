import React, { useEffect, useState } from 'react';
import { getMatchOfficials, assignOfficial, removeOfficial, getAllOfficials, getOfficialRoles, MatchOfficialDTO, OfficialRegistryDTO, OfficialRoleDTO } from '@/api/officials.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Trash, Plus, UserCircle, X } from '@phosphor-icons/react';
import { useAuthStore } from '@/store/auth.store';
import { showToast } from '@/lib/customToast';
import { ConfirmModal } from '@/components/ConfirmModal';
import { SearchableSelect } from '@/components/SearchableSelect';
import { Badge } from '@/components/Badge';

interface MatchOfficialAssignmentsProps {
    matchId: string;
    isLocked: boolean;
}

export const MatchOfficialAssignments: React.FC<MatchOfficialAssignmentsProps> = ({ matchId, isLocked }) => {
    const { user } = useAuthStore();
    const [assignments, setAssignments] = useState<MatchOfficialDTO[]>([]);
    const [availableOfficials, setAvailableOfficials] = useState<OfficialRegistryDTO[]>([]);
    const [officialRoles, setOfficialRoles] = useState<OfficialRoleDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newAssignment, setNewAssignment] = useState({ officialId: '', officialRoleId: 0 });
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        variant: 'primary' as 'primary' | 'destructive',
        confirmText: 'Confirm'
    });

    const isAdmin = user?.roles?.some(r => ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN'].includes(r));

    useEffect(() => {
        loadData();
    }, [matchId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [assignmentsData, officialsData, rolesData] = await Promise.all([
                getMatchOfficials(matchId),
                getAllOfficials(),
                getOfficialRoles()
            ]);
            setAssignments(assignmentsData);
            setAvailableOfficials(officialsData);
            setOfficialRoles(rolesData);

            if (rolesData.length > 0 && newAssignment.officialRoleId === 0) {
                setNewAssignment(prev => ({ ...prev, officialRoleId: rolesData[0].id }));
            }
        } catch (error) {
            console.error("Failed to load official data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async () => {
        if (!newAssignment.officialId || !newAssignment.officialRoleId) return;

        try {
            await assignOfficial(matchId, {
                officialId: newAssignment.officialId,
                officialRoleId: newAssignment.officialRoleId
            });
            showToast.success('Official assigned successfully');
            setNewAssignment({ officialId: '', officialRoleId: officialRoles.length > 0 ? officialRoles[0].id : 0 });
            setIsAdding(false);
            loadData();
        } catch (error) {
            console.error("Failed to assign official", error);
            showToast.error('Failed to assign official');
        }
    };

    const handleRemove = (assignmentId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Remove Official',
            message: 'Are you sure you want to remove this official from this match?',
            confirmText: 'Remove',
            variant: 'destructive',
            onConfirm: async () => {
                try {
                    await removeOfficial(assignmentId);
                    showToast.success('Official removed');
                    loadData();
                } catch (error) {
                    console.error("Failed to remove official", error);
                    showToast.error('Failed to remove official');
                }
            }
        });
    };

    // Filter out already assigned officials from dropdown
    const unassignedOfficials = availableOfficials.filter(
        o => !assignments.some(a => a.officialId === o.id) && (o.isActive || o.active)
    );

    const formatRoleName = (name: string) => {
        return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    // Define role display priority/colors
    const getRoleBadgeColor = (roleName: string) => {
        const lower = roleName.toLowerCase().replace(/_/g, ' ');
        if (lower.includes('referee') && !lower.includes('assistant')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
        if (lower.includes('assistant') || lower.includes('ar')) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
        if (lower.includes('tmo') || lower.includes('video')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
        if (lower.includes('4th') || lower.includes('fourth') || lower.includes('number')) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="py-8">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                        <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                        Loading officials...
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <UserCircle className="w-5 h-5 text-blue-500" />
                            Match Officials
                            {assignments.length > 0 && (
                                <Badge variant="secondary" className="ml-1 text-xs">
                                    {assignments.length}
                                </Badge>
                            )}
                        </CardTitle>
                        {isAdmin && !isLocked && !isAdding && (
                            <Button size="sm" onClick={() => setIsAdding(true)} className="gap-1.5">
                                <Plus className="w-3.5 h-3.5" />
                                Assign
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    {/* Add Form */}
                    {isAdding && (
                        <div className="mb-5 p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200/50 dark:border-blue-800/30">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-200">Assign New Official</h4>
                                <button
                                    onClick={() => setIsAdding(false)}
                                    className="p-1 hover:bg-blue-200/50 dark:hover:bg-blue-800/30 rounded transition-colors"
                                    title="Close"
                                >
                                    <X className="w-4 h-4 text-blue-500" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Official</label>
                                    <SearchableSelect
                                        value={newAssignment.officialId}
                                        onChange={(value) => setNewAssignment({ ...newAssignment, officialId: value as string })}
                                        options={[
                                            { value: '', label: 'Select Official...' },
                                            ...unassignedOfficials.map(o => ({
                                                value: o.id,
                                                label: `${o.firstName} ${o.lastName} (${o.primaryRole})`
                                            }))
                                        ]}
                                        placeholder="Search officials..."
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Role</label>
                                    <SearchableSelect
                                        value={String(newAssignment.officialRoleId)}
                                        onChange={(value) => setNewAssignment({ ...newAssignment, officialRoleId: Number(value) })}
                                        options={officialRoles.map(r => ({
                                            value: String(r.id),
                                            label: formatRoleName(r.name)
                                        }))}
                                        placeholder="Select Role"
                                    />
                                </div>
                                <div className="flex gap-2 pt-1">
                                    <Button
                                        size="sm"
                                        onClick={handleAssign}
                                        disabled={!newAssignment.officialId}
                                        className="flex-1"
                                    >
                                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                                        Assign Official
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Official Roster */}
                    {assignments.length === 0 ? (
                        <div className="text-center py-8 px-4">
                            <UserCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                            <p className="text-sm text-slate-500 dark:text-slate-400">No officials assigned yet.</p>
                            {isAdmin && !isLocked && !isAdding && (
                                <button
                                    onClick={() => setIsAdding(true)}
                                    className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    + Assign an official
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {assignments.map((assignment) => {
                                const roleName = assignment.officialRoleName
                                    ? formatRoleName(assignment.officialRoleName)
                                    : formatRoleName(assignment.assignedRole);
                                const badgeColor = getRoleBadgeColor(assignment.officialRoleName || assignment.assignedRole);

                                return (
                                    <div
                                        key={assignment.id}
                                        className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 group hover:border-slate-200 dark:hover:border-slate-600 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center shrink-0">
                                                <UserCircle className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                                    {assignment.officialName}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${badgeColor}`}>
                                                        {roleName}
                                                    </span>
                                                    <Badge
                                                        variant={assignment.isConfirmed ? 'default' : 'secondary'}
                                                        className="text-[10px] h-4 px-1"
                                                    >
                                                        {assignment.isConfirmed ? '✓ Confirmed' : 'Pending'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                        {isAdmin && !isLocked && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-0 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                                onClick={() => handleRemove(assignment.id)}
                                            >
                                                <Trash className="w-3.5 h-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                variant={confirmModal.variant}
            />
        </div >
    );
};
