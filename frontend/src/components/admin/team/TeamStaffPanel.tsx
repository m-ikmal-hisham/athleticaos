import React, { useEffect, useState } from 'react';
import { getTeamStaff, addTeamStaff, removeTeamStaff, getStaffRoles, getAvailablePersonsForStaff, TeamStaffDTO, StaffRole, PersonSummaryDTO } from '@/api/staff.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';

import { Trash, Plus, UserCircleGear, X } from '@phosphor-icons/react';
import { useAuthStore } from '@/store/auth.store';
import { showToast } from '@/lib/customToast';
import { ConfirmModal } from '@/components/ConfirmModal';
import { SearchableSelect } from '@/components/SearchableSelect';
import { Badge } from '@/components/Badge';
import { Input } from '@/components/Input';
import { registerPerson } from '@/api/organisations.api';

interface TeamStaffPanelProps {
    teamId: string;
    organisationId?: string;
    onStaffChange?: (staffPersonIds: string[]) => void;
}

export const TeamStaffPanel: React.FC<TeamStaffPanelProps> = ({ teamId, organisationId, onStaffChange }) => {
    const { user } = useAuthStore();
    const [staff, setStaff] = useState<TeamStaffDTO[]>([]);
    const [staffRoles, setStaffRoles] = useState<StaffRole[]>([]);
    const [persons, setPersons] = useState<PersonSummaryDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [newStaff, setNewStaff] = useState({ personId: '', staffRoleId: 0, isWorldRugbyCertified: false });
    const [newPerson, setNewPerson] = useState({ firstName: '', lastName: '', identificationType: 'MALAYSIAN_IC', icOrPassport: '', dob: '', gender: '', nationality: '', nationalPlayerStatus: 'NONE' });
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
    }, [teamId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [staffData, rolesData, personsData] = await Promise.all([
                getTeamStaff(teamId),
                getStaffRoles(),
                getAvailablePersonsForStaff(teamId)
            ]);
            setStaff(staffData);
            setStaffRoles(rolesData);
            setPersons(personsData);

            if (rolesData.length > 0 && newStaff.staffRoleId === 0) {
                setNewStaff(prev => ({ ...prev, staffRoleId: rolesData[0].id }));
            }

            // Notify parent of staff person IDs for roster filtering
            onStaffChange?.(staffData.map(s => s.personId));
        } catch (err) {
            console.error("Failed to load staff data", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newStaff.personId || !newStaff.staffRoleId) return;
        try {
            await addTeamStaff(teamId, {
                personId: newStaff.personId,
                staffRoleId: newStaff.staffRoleId,
                isWorldRugbyCertified: newStaff.isWorldRugbyCertified
            });
            showToast.success('Staff member added');
            setNewStaff({ personId: '', staffRoleId: staffRoles.length > 0 ? staffRoles[0].id : 0, isWorldRugbyCertified: false });
            setIsAdding(false);
            loadData();
        } catch (err: any) {
            console.error("Failed to add staff", err);
            showToast.error(err.response?.data?.message || 'Failed to add staff');
        }
    };

    const handleRegisterPerson = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organisationId) {
            showToast.error('Missing organisation ID');
            return;
        }
        try {
            const newlyCreatedPerson = await registerPerson(organisationId, newPerson);
            showToast.success('Person registered successfully');
            
            // Auto-select the newly created person in the Staff dropdown
            setNewStaff(prev => ({ ...prev, personId: newlyCreatedPerson.id }));
            
            // Reset form and switch back to Add Staff view
            setNewPerson({ firstName: '', lastName: '', identificationType: 'MALAYSIAN_IC', icOrPassport: '', dob: '', gender: '', nationality: '', nationalPlayerStatus: 'NONE' });
            setIsRegistering(false);
            
            // Reload persons to reflect the new addition
            loadData();
        } catch (err: any) {
            console.error("Failed to register person", err);
            showToast.error(err.response?.data?.message || 'Failed to register person');
        }
    };

    const handleRemove = (staffId: string, name: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Remove Staff',
            message: `Are you sure you want to remove ${name} from the team staff?`,
            confirmText: 'Remove',
            variant: 'destructive',
            onConfirm: async () => {
                try {
                    await removeTeamStaff(teamId, staffId);
                    showToast.success('Staff member removed');
                    loadData();
                } catch (err) {
                    console.error("Failed to remove staff", err);
                    showToast.error('Failed to remove staff');
                }
            }
        });
    };

    const formatRoleName = (name: string) => {
        return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    if (loading) return <div className="py-4 text-muted-foreground">Loading staff...</div>;

    return (
        <div>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <UserCircleGear className="w-5 h-5" />
                        Team Staff
                    </CardTitle>
                    {isAdmin && !isAdding && (
                        <Button size="sm" onClick={() => setIsAdding(true)}>
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {/* Add Form — stacked vertically for narrow left column */}
                    {isAdding && (
                        <div className="mb-4 p-4 bg-muted/30 rounded-lg border border-border">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-sm">Add Staff Member</h4>
                                <button
                                    onClick={() => setIsAdding(false)}
                                    title="Close"
                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1 flex justify-between">
                                        <span>Person</span>
                                        <button 
                                            type="button" 
                                            onClick={() => setIsRegistering(true)}
                                            className="text-primary hover:underline text-[10px]"
                                        >
                                            + Register New Person
                                        </button>
                                    </label>
                                    <SearchableSelect
                                        value={newStaff.personId}
                                        onChange={(value) => setNewStaff({ ...newStaff, personId: value as string })}
                                        options={[
                                            { value: '', label: 'Select Person...' },
                                            ...persons
                                                .filter(p => !staff.some(s => s.personId === p.id))
                                                .map(p => ({
                                                    value: p.id,
                                                    label: `${p.firstName} ${p.lastName}`
                                                }))
                                        ]}
                                        placeholder="Select Person"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">Role</label>
                                    <SearchableSelect
                                        value={String(newStaff.staffRoleId)}
                                        onChange={(value) => setNewStaff({ ...newStaff, staffRoleId: Number(value) })}
                                        options={staffRoles.map(r => ({
                                            value: String(r.id),
                                            label: formatRoleName(r.name)
                                        }))}
                                        placeholder="Select Role"
                                    />
                                </div>
                                <div className="flex items-center gap-2 px-1">
                                    <input 
                                        type="checkbox" 
                                        id="staff-wr-certified"
                                        checked={newStaff.isWorldRugbyCertified}
                                        onChange={e => setNewStaff({...newStaff, isWorldRugbyCertified: e.target.checked})}
                                        className="rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <label htmlFor="staff-wr-certified" className="text-xs font-medium cursor-pointer">
                                        World Rugby Certified
                                    </label>
                                </div>
                                <Button
                                    onClick={handleAdd}
                                    disabled={!newStaff.personId}
                                    className="w-full mt-2"
                                    size="sm"
                                >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add Staff Member
                                </Button>
                            </div>
                        </div>
                    )}

                    {isRegistering && (
                        <div className="mb-4 p-4 bg-muted/30 rounded-lg border border-border">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-sm">Register New Person</h4>
                                <button
                                    onClick={() => setIsRegistering(false)}
                                    title="Cancel"
                                    className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                            <form onSubmit={handleRegisterPerson} className="space-y-3">
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">First Name</label>
                                    <Input 
                                        required 
                                        value={newPerson.firstName} 
                                        onChange={e => setNewPerson({...newPerson, firstName: e.target.value})}
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">Last Name</label>
                                    <Input 
                                        required 
                                        value={newPerson.lastName} 
                                        onChange={e => setNewPerson({...newPerson, lastName: e.target.value})}
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">ID Type</label>
                                        <select 
                                            aria-label="ID Type"
                                            value={newPerson.identificationType} 
                                            onChange={e => setNewPerson({...newPerson, identificationType: e.target.value})}
                                            className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-0"
                                        >
                                            <option value="MALAYSIAN_IC">Malaysian IC</option>
                                            <option value="PASSPORT">Passport</option>
                                            <option value="OTHER">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">IC or Passport</label>
                                        <Input 
                                            required 
                                            value={newPerson.icOrPassport} 
                                            onChange={e => setNewPerson({...newPerson, icOrPassport: e.target.value})}
                                            className="h-8 text-sm"
                                            placeholder="ID Number"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">Gender</label>
                                        <select 
                                            required 
                                            title="Gender"
                                            aria-label="Gender"
                                            value={newPerson.gender} 
                                            onChange={e => setNewPerson({...newPerson, gender: e.target.value})}
                                            className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <option value="">Select</option>
                                            <option value="MALE">Male</option>
                                            <option value="FEMALE">Female</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">DOB</label>
                                        <Input 
                                            type="date"
                                            required 
                                            value={newPerson.dob} 
                                            onChange={e => setNewPerson({...newPerson, dob: e.target.value})}
                                            className="h-8 text-sm"
                                            max={new Date().toISOString().split("T")[0]}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">Nationality</label>
                                    <Input 
                                        required 
                                        value={newPerson.nationality} 
                                        onChange={e => setNewPerson({...newPerson, nationality: e.target.value})}
                                        className="h-8 text-sm"
                                        placeholder="E.g., Malaysian"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">National Player Status</label>
                                    <select 
                                        title="National Player Status"
                                        value={newPerson.nationalPlayerStatus} 
                                        onChange={e => setNewPerson({...newPerson, nationalPlayerStatus: e.target.value})}
                                        className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="NONE">None</option>
                                        <option value="ACTIVE">Active National Player</option>
                                        <option value="FORMER">Former National Player</option>
                                    </select>
                                </div>
                                <Button type="submit" className="w-full mt-2" size="sm">
                                    Register & Select
                                </Button>
                            </form>
                        </div>
                    )}

                    {/* Staff List */}
                    {staff.length === 0 ? (
                        <p className="text-center py-4 text-muted-foreground text-sm">
                            No staff assigned yet.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {staff.map((s) => (
                                <div
                                    key={s.id}
                                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm text-foreground truncate">
                                            {s.firstName} {s.lastName}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Badge variant="outline" className="text-xs">
                                                {formatRoleName(s.staffRoleName)}
                                            </Badge>
                                            {s.isWorldRugbyCertified && (
                                                <div className="flex items-center gap-1 bg-blue-50/50 px-1.5 py-0.5 rounded border border-blue-100" title="World Rugby Certified">
                                                    <img 
                                                        src="https://upload.wikimedia.org/wikipedia/en/thumb/e/e5/World_Rugby_logo.svg/1200px-World_Rugby_logo.svg.png" 
                                                        alt="WR" 
                                                        className="h-3 w-3 object-contain"
                                                    />
                                                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-tight">Certified</span>
                                                </div>
                                            )}
                                            <span className="text-xs text-muted-foreground">
                                                {s.joinedAt ? new Date(s.joinedAt).toLocaleDateString() : ''}
                                            </span>
                                        </div>
                                    </div>
                                    {isAdmin && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-9 w-9 text-destructive hover:text-destructive p-0 shrink-0 ml-2"
                                            onClick={() => handleRemove(s.id, `${s.firstName} ${s.lastName}`)}
                                        >
                                            <Trash className="w-5 h-5" />
                                        </Button>
                                    )}
                                </div>
                            ))}
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
        </div>
    );
};
