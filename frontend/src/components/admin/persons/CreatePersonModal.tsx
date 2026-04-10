import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { showToast } from '@/lib/customToast';
import { createPerson } from '@/api/persons.api';
import { fetchOrganisations, Organisation } from '@/api/organisations.api';
import { useAuthStore } from '@/store/auth.store';
import { Buildings, MagnifyingGlass } from '@phosphor-icons/react';

interface CreatePersonModalProps {
    isOpen: boolean;
    onClose: () => void;
    organisationId: string;
    onSuccess: () => void;
}

export const CreatePersonModal: React.FC<CreatePersonModalProps> = ({ isOpen, onClose, organisationId, onSuccess }) => {
    const { user } = useAuthStore();
    const isSuperAdmin = user?.roles?.includes('ROLE_SUPER_ADMIN');

    const [loading, setLoading] = useState(false);
    const [organisations, setOrganisations] = useState<Organisation[]>([]);
    const [orgsLoading, setOrgsLoading] = useState(false);
    const [selectedOrgId, setSelectedOrgId] = useState<string>(organisationId || '');
    const [orgSearchQuery, setOrgSearchQuery] = useState('');
    const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        icOrPassport: '',
        dob: '',
        gender: '',
        nationality: 'Malaysian',
        email: '',
        phone: '',
        nationalPlayerStatus: 'NONE',
        isPlayer: false,
        isOfficial: false,
        isStaff: false
    });

    const hasAnyRole = formData.isPlayer || formData.isOfficial || formData.isStaff;

    // Load organisations when Super Admin opens with a role selected
    useEffect(() => {
        if (isOpen && isSuperAdmin && hasAnyRole && organisations.length === 0) {
            loadOrganisations();
        }
    }, [isOpen, isSuperAdmin, hasAnyRole]);

    // For non-Super Admin, always pre-select their org
    useEffect(() => {
        if (!isSuperAdmin && organisationId) {
            setSelectedOrgId(organisationId);
        }
    }, [isSuperAdmin, organisationId]);

    const loadOrganisations = async () => {
        setOrgsLoading(true);
        try {
            const orgs = await fetchOrganisations();
            setOrganisations(orgs);
        } catch (err) {
            console.error('Failed to load organisations', err);
            showToast.error('Failed to load organisations');
        } finally {
            setOrgsLoading(false);
        }
    };

    const filteredOrgs = useMemo(() => {
        if (!orgSearchQuery) return organisations;
        const q = orgSearchQuery.toLowerCase();
        return organisations.filter(o => o.name.toLowerCase().includes(q));
    }, [organisations, orgSearchQuery]);

    const selectedOrgName = useMemo(() => {
        if (!selectedOrgId) return '';
        const org = organisations.find(o => o.id === selectedOrgId);
        if (org) return org.name;
        // For non-super admin, show org name from user context
        if (user?.organisationName) return user.organisationName;
        return 'Selected Organisation';
    }, [selectedOrgId, organisations, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate organisation if any role is selected
        if (hasAnyRole && !selectedOrgId) {
            showToast.error('Please select an organisation when assigning a role.');
            return;
        }

        const orgIdToUse = hasAnyRole ? selectedOrgId : (organisationId || selectedOrgId);

        if (!orgIdToUse) {
            showToast.error('Organisation is required to register a person.');
            return;
        }

        setLoading(true);
        try {
            await createPerson(orgIdToUse, formData);
            showToast.success('Person created successfully');
            onSuccess();
            onClose();
            // Reset form
            setFormData({
                firstName: '',
                lastName: '',
                icOrPassport: '',
                dob: '',
                gender: '',
                nationality: 'Malaysian',
                email: '',
                phone: '',
                nationalPlayerStatus: 'NONE',
                isPlayer: false,
                isOfficial: false,
                isStaff: false
            });
            setSelectedOrgId(organisationId || '');
            setOrgSearchQuery('');
        } catch (error: any) {
            console.error('Create failed', error);
            showToast.error(error.response?.data?.message || 'Failed to create person');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Register New Person" size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">First Name</label>
                        <Input
                            required
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Last Name</label>
                        <Input
                            required
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium mb-1 block">IC or Passport <span className="text-xs text-muted font-normal">(Required for tracking roles)</span></label>
                    <Input
                        required
                        value={formData.icOrPassport}
                        onChange={(e) => setFormData({ ...formData, icOrPassport: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Date of Birth</label>
                        <Input
                            type="date"
                            required
                            value={formData.dob}
                            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Gender</label>
                        <select
                            required
                            aria-label="Gender"
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium mb-1 block">Nationality</label>
                    <Input
                        required
                        value={formData.nationality}
                        onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    />
                </div>

                {/* Roles & Organisation Section */}
                <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-border space-y-4">
                    <div>
                        <label className="text-sm font-bold mb-3 block text-foreground">
                            Initial Roles
                            {!hasAnyRole && <span className="text-xs text-muted font-normal ml-1">(Optional)</span>}
                            {hasAnyRole && <span className="text-xs text-amber-500 font-normal ml-1">— Organisation required</span>}
                        </label>
                        <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={formData.isPlayer}
                                    onChange={(e) => setFormData({ ...formData, isPlayer: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="text-sm font-medium group-hover:text-foreground text-muted">Register as Player</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={formData.isOfficial}
                                    onChange={(e) => setFormData({ ...formData, isOfficial: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                                />
                                <span className="text-sm font-medium group-hover:text-foreground text-muted">Register as Official</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={formData.isStaff}
                                    onChange={(e) => setFormData({ ...formData, isStaff: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                />
                                <span className="text-sm font-medium group-hover:text-foreground text-muted">Register as Staff</span>
                            </label>
                        </div>
                    </div>

                    {/* Organisation Selector — shown when any role is checked */}
                    {hasAnyRole && (
                        <div className="pt-2 border-t border-border/50">
                            <label className="text-sm font-medium mb-1.5 block text-foreground flex items-center gap-1.5">
                                <Buildings size={14} weight="bold" className="text-primary-500" />
                                Assign to Organisation <span className="text-red-500">*</span>
                            </label>

                            {isSuperAdmin ? (
                                /* Super Admin: searchable dropdown of all orgs */
                                <div className="relative">
                                    <div
                                        className={`flex items-center h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm cursor-pointer transition-all ${
                                            selectedOrgId 
                                                ? 'border-primary-500/50 ring-1 ring-primary-500/20' 
                                                : 'border-input hover:border-primary-500/40'
                                        }`}
                                        onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                                    >
                                        {selectedOrgId ? (
                                            <span className="font-medium text-foreground truncate">{selectedOrgName}</span>
                                        ) : (
                                            <span className="text-muted">Select an organisation...</span>
                                        )}
                                        <svg className={`ml-auto h-4 w-4 text-muted transition-transform ${isOrgDropdownOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                        </svg>
                                    </div>

                                    {isOrgDropdownOpen && (
                                        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-hidden rounded-xl border border-border bg-background shadow-xl">
                                            <div className="p-2 border-b border-border sticky top-0 bg-background">
                                                <div className="relative">
                                                    <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search organisations..."
                                                        value={orgSearchQuery}
                                                        onChange={(e) => setOrgSearchQuery(e.target.value)}
                                                        className="w-full h-8 pl-8 pr-3 text-xs bg-black/5 dark:bg-white/5 rounded-lg border-0 focus:ring-1 focus:ring-primary-500/30 outline-none"
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>
                                            <div className="overflow-y-auto max-h-36">
                                                {orgsLoading ? (
                                                    <div className="p-4 text-center text-xs text-muted">Loading organisations...</div>
                                                ) : filteredOrgs.length === 0 ? (
                                                    <div className="p-4 text-center text-xs text-muted">No organisations found</div>
                                                ) : (
                                                    filteredOrgs.map((org) => (
                                                        <button
                                                            key={org.id}
                                                            type="button"
                                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-500/10 transition-colors flex items-center gap-2 ${
                                                                selectedOrgId === org.id ? 'bg-primary-500/10 text-primary-600 font-semibold' : 'text-foreground'
                                                            }`}
                                                            onClick={() => {
                                                                setSelectedOrgId(org.id);
                                                                setIsOrgDropdownOpen(false);
                                                                setOrgSearchQuery('');
                                                            }}
                                                        >
                                                            {org.logoUrl ? (
                                                                <img src={org.logoUrl} alt="" className="w-5 h-5 rounded-full object-contain bg-white border border-border p-0.5 flex-shrink-0" />
                                                            ) : (
                                                                <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                                                                    <Buildings size={10} className="text-slate-500" />
                                                                </div>
                                                            )}
                                                            <span className="truncate">{org.name}</span>
                                                            {org.orgLevel && (
                                                                <span className="ml-auto text-[10px] uppercase tracking-wider text-muted font-bold flex-shrink-0">{org.orgLevel}</span>
                                                            )}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Non-Super Admin: read-only display of their own org */
                                <div className="flex items-center h-10 w-full rounded-lg border border-border bg-black/5 dark:bg-white/5 px-3 py-2 text-sm">
                                    <Buildings size={14} className="text-muted mr-2 flex-shrink-0" />
                                    <span className="font-medium text-foreground truncate">{user?.organisationName || 'Your Organisation'}</span>
                                    <span className="ml-auto text-[10px] uppercase tracking-wider text-muted font-bold">Auto-assigned</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Email</label>
                        <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Phone</label>
                        <Input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading || (hasAnyRole && !selectedOrgId)}>
                        {loading ? 'Creating...' : 'Register Person'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
