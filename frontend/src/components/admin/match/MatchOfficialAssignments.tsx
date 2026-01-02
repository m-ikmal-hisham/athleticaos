import React, { useEffect, useState } from 'react';
import { getMatchOfficials, assignOfficial, removeOfficial, getAllOfficials, MatchOfficial, OfficialRegistry } from '@/api/officials.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/Table';
import { Trash, Plus, UserCircle } from '@phosphor-icons/react';
import { useAuthStore } from '@/store/auth.store';
import { showToast } from '@/lib/customToast';

interface MatchOfficialAssignmentsProps {
    matchId: string;
    isLocked: boolean;
}

export const MatchOfficialAssignments: React.FC<MatchOfficialAssignmentsProps> = ({ matchId, isLocked }) => {
    const { user } = useAuthStore();
    const [assignments, setAssignments] = useState<MatchOfficial[]>([]);
    const [availableOfficials, setAvailableOfficials] = useState<OfficialRegistry[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newAssignment, setNewAssignment] = useState({ officialId: '', role: 'REFEREE' });

    const isAdmin = user?.roles?.some(r => ['ROLE_SUPER_ADMIN', 'ROLE_CLUB_ADMIN'].includes(r));

    useEffect(() => {
        loadData();
    }, [matchId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [assignmentsData, officialsData] = await Promise.all([
                getMatchOfficials(matchId),
                getAllOfficials()
            ]);
            setAssignments(assignmentsData);
            setAvailableOfficials(officialsData);
        } catch (error) {
            console.error("Failed to load official data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async () => {
        if (!newAssignment.officialId || !newAssignment.role) return;

        try {
            await assignOfficial(matchId, newAssignment.officialId, newAssignment.role);
            showToast.success('Official assigned successfully');
            setNewAssignment({ officialId: '', role: 'REFEREE' });
            setIsAdding(false);
            loadData();
        } catch (error) {
            console.error("Failed to assign official", error);
            showToast.error('Failed to assign official');
        }
    };

    const handleRemove = async (assignmentId: string) => {
        if (!confirm('Are you sure you want to remove this official?')) return;
        try {
            await removeOfficial(assignmentId);
            showToast.success('Official removed');
            loadData();
        } catch (error) {
            console.error("Failed to remove official", error);
            showToast.error('Failed to remove official');
        }
    };

    // Filter out already assigned officials from dropdown
    const unassignedOfficials = availableOfficials.filter(
        o => !assignments.some(a => a.official.id === o.id) && o.isActive
    );

    const ROLE_OPTIONS = [
        { value: 'REFEREE', label: 'Referee' },
        { value: 'AR1', label: 'Assistant Referee 1' },
        { value: 'AR2', label: 'Assistant Referee 2' },
        { value: 'TMO', label: 'TMO' },
        { value: '4TH_OFFICIAL', label: '4th Official' },
        { value: 'MATCH_COMMISSIONER', label: 'Match Commissioner' },
        { value: 'DEVELOPER', label: 'Referee Developer' },
    ];

    if (loading) return <div>Loading assignments...</div>;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <UserCircle className="w-5 h-5" />
                        Match Officials
                    </CardTitle>
                    {isAdmin && !isLocked && !isAdding && (
                        <Button size="sm" onClick={() => setIsAdding(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Assign Official
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {/* Add Form */}
                    {isAdding && (
                        <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border">
                            <h4 className="font-semibold mb-3 text-sm">Assign New Official</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <select
                                    className="p-2 rounded border border-input bg-background"
                                    value={newAssignment.officialId}
                                    onChange={(e) => setNewAssignment({ ...newAssignment, officialId: e.target.value })}
                                    aria-label="Select Official"
                                >
                                    <option value="">Select Official...</option>
                                    {unassignedOfficials.map(o => (
                                        <option key={o.id} value={o.id}>
                                            {o.user.firstName} {o.user.lastName} ({o.primaryRole})
                                        </option>
                                    ))}
                                </select>
                                <select
                                    className="p-2 rounded border border-input bg-background"
                                    value={newAssignment.role}
                                    onChange={(e) => setNewAssignment({ ...newAssignment, role: e.target.value })}
                                    aria-label="Select Role"
                                >
                                    {ROLE_OPTIONS.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                                <div className="flex gap-2">
                                    <Button onClick={handleAssign} disabled={!newAssignment.officialId}>Assign</Button>
                                    <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* List */}
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Role</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Badge Level</TableHead>
                                {isAdmin && !isLocked && <TableHead className="w-12"></TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assignments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                                        No officials assigned yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                assignments.map((assignment) => (
                                    <TableRow key={assignment.id}>
                                        <TableCell className="font-semibold">
                                            {ROLE_OPTIONS.find(r => r.value === assignment.assignedRole)?.label || assignment.assignedRole}
                                        </TableCell>
                                        <TableCell>
                                            {assignment.official.user.firstName} {assignment.official.user.lastName}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs bg-secondary/20 text-secondary-foreground px-2 py-0.5 rounded-full">
                                                {assignment.official.accreditationLevel}
                                            </span>
                                        </TableCell>
                                        {isAdmin && !isLocked && (
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 text-destructive hover:text-destructive p-0"
                                                    onClick={() => handleRemove(assignment.id)}
                                                >
                                                    <Trash className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};
