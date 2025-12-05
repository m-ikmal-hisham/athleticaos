import { useEffect, useState, useMemo } from "react";
import { Search } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Card, CardContent } from "../../components/Card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../components/Table";
import { Badge } from "../../components/Badge";
import { useOrganisationsStore } from "../../store/organisations.store";
import { getCountries, getStates, getDivisions, getDistricts, Organisation, createOrganisation, updateOrganisation, OrganisationLevel } from "../../api/organisations.api";
import { OrganisationModal } from "../../components/modals/OrganisationModal";
import { useAuthStore } from "../../store/auth.store";

export default function Organisations() {
    const { organisations, loading, error, getOrganisations } = useOrganisationsStore();
    const { user } = useAuthStore();

    const [countries, setCountries] = useState<Organisation[]>([]);
    const [states, setStates] = useState<Organisation[]>([]);
    const [divisions, setDivisions] = useState<Organisation[]>([]);
    const [districts, setDistricts] = useState<Organisation[]>([]);

    const [selectedCountry, setSelectedCountry] = useState<string>("");
    const [selectedState, setSelectedState] = useState<string>("");
    const [selectedDivision, setSelectedDivision] = useState<string>("");
    const [selectedDistrict, setSelectedDistrict] = useState<string>("");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [selectedOrg, setSelectedOrg] = useState<Organisation | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const isAdmin = user?.roles?.some(r => ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN'].includes(r));

    useEffect(() => {
        getOrganisations();
        getCountries().then(setCountries);
    }, [getOrganisations]);

    useEffect(() => {
        if (selectedCountry) {
            getStates(selectedCountry).then(setStates);
        } else {
            setStates([]);
        }
        setSelectedState("");
        setSelectedDivision("");
        setSelectedDistrict("");
    }, [selectedCountry]);

    useEffect(() => {
        if (selectedState) {
            getDivisions(selectedState).then(setDivisions);
            getDistricts(selectedState).then(setDistricts);
        } else {
            setDivisions([]);
            setDistricts([]);
        }
        setSelectedDivision("");
        setSelectedDistrict("");
    }, [selectedState]);

    const filteredOrganisations = useMemo(() => {
        if (!organisations) return [];
        let filtered = organisations;

        // Apply hierarchy filter
        if (selectedDistrict) {
            filtered = filtered.filter(org => org.parentOrgId === selectedDistrict || org.id === selectedDistrict);
        } else if (selectedDivision) {
            filtered = filtered.filter(org => org.parentOrgId === selectedDivision || org.id === selectedDivision);
        } else if (selectedState) {
            const stateObj = states.find(s => s.id === selectedState);
            if (stateObj) {
                filtered = filtered.filter(org => org.state === stateObj.name || org.id === selectedState);
            }
        }

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(org =>
                org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                org.type.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return filtered;
    }, [organisations, selectedDistrict, selectedDivision, selectedState, states, searchTerm]);

    const handleAdd = () => {
        setModalMode('create');
        setSelectedOrg(null);
        setIsModalOpen(true);
    };

    const handleEdit = (org: Organisation, e: React.MouseEvent) => {
        e.stopPropagation();
        setModalMode('edit');
        setSelectedOrg(org);
        setIsModalOpen(true);
    };

    const handleSubmit = async (data: any) => {
        try {
            if (modalMode === 'create') {
                await createOrganisation(data);
            } else if (selectedOrg) {
                await updateOrganisation(selectedOrg.id, data);
            }
            await getOrganisations(); // Refresh list
        } catch (error) {
            console.error('Failed to save organisation:', error);
            alert('Failed to save organisation. Please check the console for details.');
        }
    };

    const getInitialParentId = () => {
        if (selectedDistrict) return selectedDistrict;
        if (selectedDivision) return selectedDivision;
        if (selectedState) return selectedState;
        if (selectedCountry) return selectedCountry;
        return undefined;
    };

    const getInitialLevel = (): OrganisationLevel | undefined => {
        if (selectedDistrict) return 'CLUB';
        if (selectedDivision) return 'CLUB';
        if (selectedState) return 'DIVISION';
        if (selectedCountry) return 'STATE';
        return undefined;
    };

    const getStatusVariant = (status: string) => {
        return status === 'Active' ? 'green' : 'secondary';
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Organisations"
                description="Unions, state associations, clubs and schools"
                action={
                    isAdmin && (
                        <Button onClick={handleAdd}>
                            Add Organisation
                        </Button>
                    )
                }
            />

            <Card>
                <CardContent className="p-0">
                    <div className="p-4 flex flex-col md:flex-row gap-4 border-b border-glass-border items-center">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                            <Input
                                placeholder="Search organisations..."
                                className="pl-9 bg-glass-bg/50"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto flex-wrap">
                            <select
                                value={selectedCountry}
                                onChange={e => setSelectedCountry(e.target.value)}
                                className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                            >
                                <option value="">All Countries</option>
                                {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>

                            <select
                                value={selectedState}
                                onChange={e => setSelectedState(e.target.value)}
                                className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                                disabled={!selectedCountry}
                            >
                                <option value="">All States</option>
                                {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>

                            <select
                                value={selectedDivision}
                                onChange={e => setSelectedDivision(e.target.value)}
                                className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                                disabled={!selectedState}
                            >
                                <option value="">All Divisions</option>
                                {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>

                            <select
                                value={selectedDistrict}
                                onChange={e => setSelectedDistrict(e.target.value)}
                                className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                                disabled={!selectedState}
                            >
                                <option value="">All Districts</option>
                                {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <Table>
                        <TableHeader className="border-b border-border/60">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="text-xs font-medium text-muted-foreground">Name</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground">Type</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground">State</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
                                {isAdmin && <TableHead className="text-xs font-medium text-muted-foreground text-right">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-8">Loading organisations…</TableCell>
                                </TableRow>
                            ) : error ? (
                                <TableRow>
                                    <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-destructive">{error}</TableCell>
                                </TableRow>
                            ) : filteredOrganisations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-muted-foreground">No organisations found</TableCell>
                                </TableRow>
                            ) : (
                                filteredOrganisations.map((org) => (
                                    <TableRow
                                        key={org.id}
                                        className="group hover:bg-muted/30 transition-colors border-b border-border/40"
                                    >
                                        <TableCell className="py-4">
                                            <div className="flex items-center gap-3">
                                                {org.logoUrl && (
                                                    <img
                                                        src={org.logoUrl}
                                                        alt={org.name}
                                                        className="w-6 h-6 rounded-full object-cover"
                                                    />
                                                )}
                                                <span className="text-sm font-medium">{org.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <span className="text-sm">{org.type}</span>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <span className="text-sm text-muted-foreground">{org.state || '-'}</span>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <Badge variant={getStatusVariant(org.status) as any} className="text-xs">
                                                {org.status}
                                            </Badge>
                                        </TableCell>
                                        {isAdmin && (
                                            <TableCell className="py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => handleEdit(org, e)}
                                                        className="h-8 px-3"
                                                    >
                                                        Edit
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <OrganisationModal
                isOpen={isModalOpen}
                mode={modalMode}
                initialData={selectedOrg}
                initialParentId={getInitialParentId()}
                initialLevel={getInitialLevel()}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
            />
        </div>
    );
}
