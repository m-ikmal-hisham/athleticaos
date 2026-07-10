import React, { useEffect, useState, useMemo, useRef } from 'react';
import { getPersonsByOrganisation, getAllPersons, deletePerson, PersonResponseDTO } from '@/api/persons.api';
import { Card, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/Table';
import { Badge } from '@/components/Badge';
import { SearchableSelect } from '@/components/SearchableSelect';
import { TrendBadge } from '@/components/TrendBadge';
import { useAuthStore } from '@/store/auth.store';
import { PencilSimple, Trash, UsersThree, UserCircle, Gavel, IdentificationCard, Link as LinkIcon, CheckCircle, Funnel } from '@phosphor-icons/react';
import { EditPersonModal } from '@/components/admin/persons/EditPersonModal';
import { ConnectUserModal } from '@/components/admin/persons/ConnectUserModal';
import { CreatePersonModal } from '@/components/admin/persons/CreatePersonModal';
import { showToast } from '@/lib/customToast';

const PeopleDirectory: React.FC = () => {
    const { user } = useAuthStore();
    const [persons, setPersons] = useState<PersonResponseDTO[]>([]);
    const [pagination, setPagination] = useState({
        currentPage: 0,
        totalPages: 0,
        totalElements: 0,
        size: 50
    });
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState<PersonResponseDTO | null>(null);
    const [filter, setFilter] = useState<'ALL' | 'STAFF' | 'OFFICIALS' | 'PLAYERS'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isSuperAdmin = user?.roles?.includes('ROLE_SUPER_ADMIN');

    // Debounce search input — 400ms delay before triggering API call
    useEffect(() => {
        if (searchTimerRef.current) {
            clearTimeout(searchTimerRef.current);
        }
        searchTimerRef.current = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 400);
        return () => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        };
    }, [searchQuery]);

    useEffect(() => {
        if (user) {
            loadPersons(0);
        }
    }, [user?.organisationId, user?.id, debouncedSearch]);

    const loadPersons = async (page: number = 0) => {
        if (!user) return;
        setLoading(true);
        try {
            let res;
            const searchTerm = debouncedSearch || undefined;
            if (isSuperAdmin || !user.organisationId) {
                res = await getAllPersons(page, pagination.size, searchTerm);
            } else {
                res = await getPersonsByOrganisation(user.organisationId, page, pagination.size, searchTerm);
            }
            setPersons(res.content);
            setPagination({
                currentPage: res.number,
                totalPages: res.totalPages,
                totalElements: res.totalElements,
                size: res.size
            });
        } catch (err) {
            console.error("Failed to load persons", err);
            showToast.error("Failed to load directory");
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => {
        return {
            total: { count: pagination.totalElements, trend: 12.5 },
            players: { count: persons.filter(p => p.isPlayer).length, trend: 2.1 },
            staff: { count: persons.filter(p => p.isStaff).length, trend: 0 },
            officials: { count: persons.filter(p => p.isOfficial).length, trend: -3.4 },
        };
    }, [persons, pagination.totalElements]);

    const filteredPersons = useMemo(() => {
        let result = persons;
        
        // Role filter (stays client-side — quick filter on loaded data)
        switch (filter) {
            case 'PLAYERS': result = result.filter(p => p.isPlayer); break;
            case 'STAFF': result = result.filter(p => p.isStaff); break;
            case 'OFFICIALS': result = result.filter(p => p.isOfficial); break;
        }

        return result;
    }, [persons, filter]);

    const handleDelete = async (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to completely remove ${name} from the system? Roles must be unassigned first.`)) {
            try {
                await deletePerson(id);
                showToast.success('Person removed');
                loadPersons();
            } catch (err: any) {
                console.error('Failed to delete', err);
                showToast.error(err.response?.data?.message || 'Failed to delete person');
            }
        }
    };

    const handleEdit = (person: PersonResponseDTO) => {
        setSelectedPerson(person);
        setIsEditModalOpen(true);
    };

    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading People Directory...</div>;

    return (
        <div className="space-y-8 p-6">
            <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-display font-bold tracking-tight text-foreground">People Directory</h1>
                    <p className="text-muted text-lg">Manage all human records and system connections in one place.</p>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)} className="w-full md:w-auto h-11 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-semibold shadow-lg shadow-primary-500/20">
                    <UserCircle size={20} className="mr-2" weight="bold" />
                    Register Person
                </Button>
            </header>

            {/* Bento Grid Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card 
                    className={`cursor-pointer transition-all hover:shadow-md h-full ${filter === 'ALL' ? 'ring-2 ring-primary-500 border-primary-500 bg-primary-50/50' : 'hover:bg-accent/50'}`}
                    onClick={() => setFilter('ALL')}
                >
                    <CardContent className="p-6 flex flex-col h-full justify-between">
                        <div className="flex items-center justify-between mb-2">
                            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 dark:bg-indigo-900/30">
                                <UsersThree size={24} weight="duotone" />
                            </div>
                            <TrendBadge value={stats.total.trend} />
                        </div>
                        <div>
                            <span className="text-4xl font-display font-bold">{stats.total.count}</span>
                            <p className="text-sm font-medium text-muted mt-1">Total People</p>
                        </div>
                    </CardContent>
                </Card>

                <Card 
                    className={`cursor-pointer transition-all hover:shadow-md h-full ${filter === 'PLAYERS' ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/50' : 'hover:bg-accent/50'}`}
                    onClick={() => setFilter('PLAYERS')}
                >
                    <CardContent className="p-6 flex flex-col h-full justify-between">
                        <div className="flex items-center justify-between mb-2">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600 dark:bg-blue-900/30">
                                <UserCircle size={24} weight="duotone" />
                            </div>
                            <TrendBadge value={stats.players.trend} />
                        </div>
                        <div>
                            <span className="text-4xl font-display font-bold">{stats.players.count}</span>
                            <p className="text-sm font-medium text-muted mt-1">Players</p>
                        </div>
                    </CardContent>
                </Card>

                <Card 
                    className={`cursor-pointer transition-all hover:shadow-md h-full ${filter === 'STAFF' ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/50' : 'hover:bg-accent/50'}`}
                    onClick={() => setFilter('STAFF')}
                >
                    <CardContent className="p-6 flex flex-col h-full justify-between">
                        <div className="flex items-center justify-between mb-2">
                            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600 dark:bg-emerald-900/30">
                                <IdentificationCard size={24} weight="duotone" />
                            </div>
                            <TrendBadge value={stats.staff.trend} />
                        </div>
                        <div>
                            <span className="text-4xl font-display font-bold">{stats.staff.count}</span>
                            <p className="text-sm font-medium text-muted mt-1">Management & Staff</p>
                        </div>
                    </CardContent>
                </Card>

                <Card 
                    className={`cursor-pointer transition-all hover:shadow-md h-full ${filter === 'OFFICIALS' ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/50' : 'hover:bg-accent/50'}`}
                    onClick={() => setFilter('OFFICIALS')}
                >
                    <CardContent className="p-6 flex flex-col h-full justify-between">
                        <div className="flex items-center justify-between mb-2">
                            <div className="p-2 bg-amber-100 rounded-lg text-amber-600 dark:bg-amber-900/30">
                                <Gavel size={24} weight="duotone" />
                            </div>
                            <TrendBadge value={stats.officials.trend} />
                        </div>
                        <div>
                            <span className="text-4xl font-display font-bold">{stats.officials.count}</span>
                            <p className="text-sm font-medium text-muted mt-1">Match Officials</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Advanced Filtering */}
            <div className="flex flex-col md:flex-row gap-4 items-end bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-border">
                <div className="w-full md:w-64">
                    <SearchableSelect
                        label="Filter by Role"
                        options={[
                            { value: 'ALL', label: 'All People' },
                            { value: 'PLAYERS', label: 'Players Only' },
                            { value: 'STAFF', label: 'Staff Only' },
                            { value: 'OFFICIALS', label: 'Officials Only' }
                        ]}
                        value={filter}
                        onChange={(v) => setFilter(v as any)}
                        placeholder="Select role..."
                    />
                </div>
                <div className="flex-1 w-full relative">
                    <label className="block text-sm font-medium text-muted mb-1.5 ml-1">
                        Search Directory
                        {debouncedSearch && <span className="text-primary-500 ml-1 text-xs">— searching all records</span>}
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search all people by name, IC, or email..."
                            className="w-full h-[44px] bg-background border border-border rounded-xl px-10 py-2 text-sm focus:ring-2 focus:ring-primary-500/20 outline-none hover:border-primary-500 transition-all font-medium"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Funnel className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted/20 hover:bg-muted/40 flex items-center justify-center text-muted hover:text-foreground transition-colors"
                                aria-label="Clear search"
                            >
                                ×
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <Card className="border-none shadow-xl bg-glass-bg backdrop-blur-xl">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b-0 hover:bg-transparent">
                                <TableHead className="pl-6 h-14">Name</TableHead>
                                <TableHead>IC/Passport</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Roles</TableHead>
                                <TableHead>User Link</TableHead>
                                <TableHead className="w-24 text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPersons.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <UsersThree size={48} weight="duotone" className="opacity-20" />
                                            <p className="text-lg">No records matching this category.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredPersons.map((p) => (
                                    <TableRow key={p.id} className="group hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                        <TableCell className="pl-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center font-bold text-slate-500">
                                                        {p.firstName[0]}{p.lastName[0]}
                                                    </div>
                                                    {p.nationalOrganisationLogoUrl && (
                                                        <img 
                                                            src={p.nationalOrganisationLogoUrl} 
                                                            alt="National Logo" 
                                                            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full object-contain bg-white border border-border p-0.5"
                                                            title="National Organisation Association"
                                                        />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-foreground">{p.firstName} {p.lastName}</div>
                                                    <div className="text-xs text-muted font-medium">{p.gender} • {p.dob}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-muted">{p.icOrPassport}</TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                {p.email && <div className="text-foreground">{p.email}</div>}
                                                {p.phone && <div className="text-xs text-muted">{p.phone}</div>}
                                                {(!p.email && !p.phone) && <span className="text-muted">-</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1.5 flex-wrap">
                                                {p.isPlayer && (
                                                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400">
                                                        Player
                                                    </Badge>
                                                )}
                                                {p.isStaff && (
                                                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400">
                                                        Staff
                                                    </Badge>
                                                )}
                                                {p.isOfficial && (
                                                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400">
                                                        Official
                                                    </Badge>
                                                )}
                                                {p.isWorldRugbyCertified && (
                                                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 flex items-center gap-1">
                                                        <img 
                                                            src="https://upload.wikimedia.org/wikipedia/en/thumb/e/e5/World_Rugby_logo.svg/1200px-World_Rugby_logo.svg.png" 
                                                            alt="WR" 
                                                            className="h-3 w-auto"
                                                        />
                                                        Certified
                                                    </Badge>
                                                )}
                                                {p.nationalPlayerStatus && p.nationalPlayerStatus !== 'NONE' && (
                                                    <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-bold ${p.nationalPlayerStatus === 'ACTIVE' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400' : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400'}`}>
                                                        {p.nationalPlayerStatus} National
                                                    </Badge>
                                                )}
                                                {!p.isPlayer && !p.isStaff && !p.isOfficial && (
                                                    <span className="text-xs text-muted italic text-[10px]">Independent</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {p.userId ? (
                                                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-sm">
                                                    <CheckCircle size={18} weight="fill" />
                                                    <span>Linked</span>
                                                </div>
                                            ) : (
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-8 gap-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:text-blue-400 dark:hover:bg-blue-900/20 px-2"
                                                    onClick={() => {
                                                        setSelectedPerson(p);
                                                        setIsConnectModalOpen(true);
                                                    }}
                                                >
                                                    <LinkIcon size={14} />
                                                    <span className="text-xs">Connect</span>
                                                </Button>
                                            )}
                                        </TableCell>
                                        <TableCell className="pr-6 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(p)}>
                                                    <PencilSimple size={16} />
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(p.id, `${p.firstName} ${p.lastName}`)}>
                                                    <Trash size={16} />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination Controls */}
                    <div className="p-4 border-t border-border flex items-center justify-between bg-glass-bg/50">
                        <div className="text-sm text-muted font-medium">
                            Showing <span className="text-foreground">{persons.length}</span> of <span className="text-foreground">{pagination.totalElements}</span> people
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-9 px-4 rounded-lg font-semibold"
                                disabled={pagination.currentPage === 0 || loading}
                                onClick={() => loadPersons(pagination.currentPage - 1)}
                            >
                                Previous
                            </Button>
                            <div className="flex items-center px-4 text-sm font-bold text-primary-600 bg-primary-50 rounded-lg">
                                {pagination.currentPage + 1} / {pagination.totalPages || 1}
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-9 px-4 rounded-lg font-semibold"
                                disabled={pagination.currentPage >= pagination.totalPages - 1 || loading}
                                onClick={() => loadPersons(pagination.currentPage + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <EditPersonModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                person={selectedPerson}
                onSuccess={loadPersons}
            />

            <ConnectUserModal 
                isOpen={isConnectModalOpen}
                onClose={() => setIsConnectModalOpen(false)}
                person={selectedPerson}
                organisationId={user?.organisationId || ''}
                onSuccess={loadPersons}
            />

            <CreatePersonModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                organisationId={user?.organisationId || ''}
                onSuccess={loadPersons}
            />
        </div>
    );
};


export default PeopleDirectory;

