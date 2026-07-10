import { useEffect, useState, useMemo } from "react";
import { SearchableSelect } from "../../components/SearchableSelect";
import { MagnifyingGlass, Funnel, Plus, MapPin, Buildings, PencilSimple } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { GlassCard } from "../../components/GlassCard";
import { Badge } from "../../components/Badge";
import { useOrganisationsStore } from "../../store/organisations.store";
import { getCountries, getStates, getDivisions, getDistricts, Organisation, deleteOrganisation, createBulkOrganisations } from "../../api/organisations.api";
import { BulkUploadModal } from "../../components/modals/BulkUploadModal";
import { useAuthStore } from "../../store/auth.store";
import { getImageUrl } from "../../utils/image";
import { formatOrgType } from "../../utils/formatters";
import { MALAYSIA_STATES } from "../../constants/malaysia-geo";
import { getCountryName } from "../../constants/country-codes";
import { SmartFilterPills, FilterOption } from "../../components/SmartFilterPills";
import { EmptyState } from "../../components/EmptyState";
import toast from "react-hot-toast";
import { Trash } from "@phosphor-icons/react";
import ConfirmDeleteModal from "../../components/modals/ConfirmDeleteModal";

export default function Organisations() {
    const navigate = useNavigate();
    const { organisations, loading, getOrganisations } = useOrganisationsStore();
    const { user } = useAuthStore();

    const [countries, setCountries] = useState<Organisation[]>([]);
    const [states, setStates] = useState<Organisation[]>([]);
    const [divisions, setDivisions] = useState<Organisation[]>([]);
    const [districts, setDistricts] = useState<Organisation[]>([]);

    // Filter state: org IDs for hierarchy-based filtering
    const [selectedCountry, setSelectedCountry] = useState<string>("");
    const [selectedState, setSelectedState] = useState<string>("");
    const [selectedDivision, setSelectedDivision] = useState<string>("");
    const [selectedDistrict, setSelectedDistrict] = useState<string>("");

    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [typeFilter, setTypeFilter] = useState<string>('ALL');

    const isAdmin = user?.roles?.some(r => ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN'].includes(r));
    const isSuperAdmin = user?.roles?.includes('ROLE_SUPER_ADMIN');

    // Delete modal state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [orgToDelete, setOrgToDelete] = useState<Organisation | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Bulk upload state
    const [uploadModalOpen, setUploadModalOpen] = useState(false);

    // RBAC: Only Super Admin can delete organisations
    const canDeleteOrg = () => isSuperAdmin;

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

    // Build hierarchy map for deep recursive filtering
    const hierarchyMap = useMemo(() => {
        const map = new Map<string, string[]>(); // parentId -> childIds
        if (organisations) {
            organisations.forEach(org => {
                if (org.parentOrgId) {
                    if (!map.has(org.parentOrgId)) map.set(org.parentOrgId, []);
                    map.get(org.parentOrgId)?.push(org.id);
                }
            });
        }
        return map;
    }, [organisations]);

    // Helper to get all descendant IDs recursively
    const getDescendants = (rootId: string) => {
        const results = new Set<string>();
        const queue = [rootId];
        results.add(rootId); // Include the root itself

        while (queue.length > 0) {
            const current = queue.pop();
            if (current) {
                const children = hierarchyMap.get(current);
                if (children) {
                    children.forEach(c => {
                        results.add(c);
                        queue.push(c);
                    });
                }
            }
        }
        return results;
    };

    // Helper: Get real geographic label for a country org
    const getCountryLabel = (org: Organisation): string => {
        // Try countryCode mapping first, then state field, then strip common suffixes from name
        if (org.countryCode) return getCountryName(org.countryCode);
        if (org.state) return org.state;
        // Strip common suffixes like "Rugby", "Rugby Union", "Rugby Football Union"
        return org.name
            .replace(/\s*(Rugby Football Union|Rugby Union|Rugby)\s*$/i, '')
            .trim() || org.name;
    };

    // Helper: Get real geographic label for a state org
    const getStateLabel = (org: Organisation): string => {
        // Use the state field (real geo name) if available, otherwise strip suffixes from name
        if (org.state) return org.state;
        return org.name
            .replace(/^(Kesatuan Ragbi Negeri|Persatuan Ragbi Negeri|Persatuan Ragbi|Kesatuan Ragbi)\s+/i, '')
            .replace(/\s*(Rugby Football Union|Rugby Union|Rugby|State Union|State Association|Association|Union)\s*$/i, '')
            .trim() || org.name;
    };

    // Helper: Get real geographic label for a division/district org
    const getDivisionLabel = (org: Organisation): string => {
        const name = org.name;
        let cleaned = name
            .replace(/^(Persatuan Ragbi Bahagian|Persatuan Ragbi Daerah|Persatuan Ragbi|Kesatuan Ragbi Bahagian|Kesatuan Ragbi Daerah|Kesatuan Ragbi)\s+/i, '')
            .replace(/\s*(Rugby Association|Rugby Union|Rugby Football Union|Rugby|Association|Union)\s*$/i, '')
            .trim();
        
        if (org.orgLevel === 'DIVISION') {
            if (/^Bahagian\s+/i.test(cleaned)) {
                cleaned = cleaned.replace(/^Bahagian\s+/i, '') + ' Division';
            } else if (!/Division/i.test(cleaned)) {
                cleaned = cleaned + ' Division';
            }
        } else if (org.orgLevel === 'DISTRICT') {
            if (/^Daerah\s+/i.test(cleaned)) {
                cleaned = cleaned.replace(/^Daerah\s+/i, '') + ' District';
            } else if (!/District/i.test(cleaned)) {
                cleaned = cleaned + ' District';
            }
        }
        return cleaned || name;
    };

    const filteredOrganisations = useMemo(() => {
        if (!organisations) return [];
        let filtered = organisations;

        // Apply hierarchy filter (Deep Filter)
        if (selectedDistrict) {
            const descendantIds = getDescendants(selectedDistrict);
            filtered = filtered.filter(org => descendantIds.has(org.id));
        } else if (selectedDivision) {
            const descendantIds = getDescendants(selectedDivision);
            filtered = filtered.filter(org => descendantIds.has(org.id));
        } else if (selectedState) {
            // State filter: show all descendants of the selected state org
            const descendantIds = getDescendants(selectedState);
            filtered = filtered.filter(org => descendantIds.has(org.id));
        } else if (selectedCountry) {
            // Country filter: show all descendants of the selected country org
            const descendantIds = getDescendants(selectedCountry);
            filtered = filtered.filter(org => descendantIds.has(org.id));
        }

        // Apply Type Filter
        if (typeFilter && typeFilter !== 'ALL') {
            filtered = filtered.filter(org => org.type === typeFilter);
        }

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(org =>
                org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                org.type.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return filtered;
    }, [organisations, selectedCountry, selectedDistrict, selectedDivision, selectedState, searchTerm, hierarchyMap, typeFilter]);

    // Extract unique types for SmartPills
    const typeOptions: FilterOption[] = useMemo(() => {
        const types = Array.from(new Set(organisations?.map(o => o.type).filter(Boolean)));
        return types.map(t => ({
            id: t,
            label: t,
            count: organisations?.filter(o => o.type === t).length
        })).sort((a, b) => b.count! - a.count!);
    }, [organisations]);

    const handleAdd = () => {
        navigate('/dashboard/organisations/new');
    };

    const handleUpload = async (data: any[]) => {
        // Map raw CSV data to expected interface if necessary
        await createBulkOrganisations(data);
        await getOrganisations(); // Refresh list
    };

    const handleEdit = (e: React.MouseEvent, orgId: string) => {
        e.stopPropagation();
        navigate(`/dashboard/organisations/${orgId}/edit`);
    };

    const getStatusVariant = (status: string) => {
        return status === 'Active' ? 'green' : 'secondary';
    };


    const handleDeleteClick = (e: React.MouseEvent, org: Organisation) => {
        e.stopPropagation();
        setOrgToDelete(org);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!orgToDelete) return;
        try {
            setIsDeleting(true);
            await deleteOrganisation(orgToDelete.id);
            toast.success("Organisation deleted successfully");
            await getOrganisations();
            setDeleteModalOpen(false);
            setOrgToDelete(null);
        } catch (error) {
            console.error("Failed to delete organisation", error);
            toast.error("Failed to delete organisation");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <PageHeader
                title="Organisations"
                description="Unions, state associations, clubs and schools"
                action={
                    isAdmin && (
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setUploadModalOpen(true)} className="gap-2">
                                <Plus className="w-4 h-4" />
                                Bulk Upload
                            </Button>
                            <Button onClick={handleAdd} className="gap-2">
                                <Plus className="w-4 h-4" />
                                Add Organisation
                            </Button>
                        </div>
                    )
                }
            />

            {/* Controls Layout */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <div className="flex gap-2 w-full md:w-auto flex-1 max-w-lg">
                        <div className="relative flex-1">
                            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted border-glass-border" />
                            <Input
                                placeholder="Search organisations..."
                                className="pl-9 bg-glass-bg border-glass-border focus:border-primary-500/50 transition-colors"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button
                            variant="outline"
                            className={`px-3 md:hidden ${showFilters ? 'bg-primary-500/10 border-primary-500/50 text-primary-500' : ''}`}
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <Funnel className="w-4 h-4" />
                        </Button>
                    </div>

                    <SmartFilterPills
                        options={typeOptions}
                        selectedId={typeFilter === 'ALL' ? null : typeFilter}
                        onSelect={(id) => setTypeFilter(id || 'ALL')}
                        className="w-full md:w-auto overflow-hidden"
                    />
                </div>

                {/* Secondary Filters - Location Hierarchy */}
                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-300 ${showFilters ? 'block' : 'hidden md:grid'}`}>
                    <SearchableSelect
                        placeholder="All Countries"
                        value={selectedCountry}
                        onChange={(value) => setSelectedCountry(value as string)}
                        options={[{ value: "", label: "All Countries" }, ...countries.map(c => ({ value: c.id, label: getCountryLabel(c) }))]}
                        className="z-40"
                    />

                    <SearchableSelect
                        placeholder="All States"
                        value={selectedState}
                        onChange={(value) => setSelectedState(value as string)}
                        options={[{ value: "", label: "All States" }, ...states.map(s => ({ value: s.id, label: getStateLabel(s) }))]}
                        disabled={!selectedCountry}
                        className="z-30"
                    />

                    <SearchableSelect
                        placeholder="All Divisions"
                        value={selectedDivision}
                        onChange={(value) => setSelectedDivision(value as string)}
                        options={[{ value: "", label: "All Divisions" }, ...divisions.map(d => ({ value: d.id, label: getDivisionLabel(d) }))]}
                        disabled={!selectedState}
                        className="z-20"
                    />

                    <SearchableSelect
                        placeholder="All Districts"
                        value={selectedDistrict}
                        onChange={(value) => setSelectedDistrict(value as string)}
                        options={[{ value: "", label: "All Districts" }, ...districts.map(d => ({ value: d.id, label: getDivisionLabel(d) }))]}
                        disabled={!selectedState}
                        className="z-10"
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <GlassCard key={i} className="h-40 animate-pulse flex flex-col p-6">
                            <div className="w-12 h-12 rounded-full bg-white/5 mb-4" />
                            <div className="w-3/4 h-5 bg-white/5 rounded mb-2" />
                            <div className="w-1/2 h-4 bg-white/5 rounded" />
                        </GlassCard>
                    ))}
                </div>
            ) : filteredOrganisations.length === 0 ? (
                <EmptyState
                    icon={Buildings}
                    title="No organisations found"
                    description="Adjust filters or add a new organisation."
                    actionLabel={isAdmin ? "Add Organisation" : undefined}
                    onAction={isAdmin ? handleAdd : undefined}
                    className="min-h-[400px] border-dashed border-white/10"
                />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredOrganisations.map((org) => (
                        <GlassCard
                            key={org.id}
                            hover={true}
                            className="group relative flex flex-col p-5 transition-all duration-300 cursor-pointer"
                            onClick={() => navigate(`/dashboard/organisations/${org.id}`)}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                    {org.logoUrl ? (
                                        <img src={getImageUrl(org.logoUrl)} alt={org.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <Buildings className="w-6 h-6 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="flex gap-1 items-center">
                                    <Badge variant={getStatusVariant(org.status || 'Active') as any} className="text-[10px] px-1.5 h-5">
                                        {org.status || 'Active'}
                                    </Badge>
                                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        {isAdmin && (
                                            <>
                                                <button
                                                    onClick={(e) => handleEdit(e, org.id)}
                                                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                                                    aria-label="Edit organisation"
                                                >
                                                    <PencilSimple className="w-4 h-4" />
                                                </button>
                                                {canDeleteOrg() && (
                                                    <button
                                                        onClick={(e) => handleDeleteClick(e, org)}
                                                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-colors"
                                                        aria-label="Delete organisation"
                                                    >
                                                        <Trash className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1 mb-4 flex-1">
                                <h3 className="font-semibold text-lg leading-tight truncate text-foreground group-hover:text-primary-400 transition-colors">
                                    {org.name}
                                </h3>
                                <p className="text-sm text-muted-foreground truncate">{formatOrgType(org.type)}</p>
                            </div>

                            <div className="flex items-center gap-1.5 pt-4 border-t border-white/5 text-xs text-muted-foreground">
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">
                                    {org.state || (org.stateCode ? MALAYSIA_STATES.find(s => s.code === org.stateCode)?.name : '-')}
                                </span>
                            </div>


                        </GlassCard>
                    ))}
                </div>
            )}

            <ConfirmDeleteModal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setOrgToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                title="Delete Organisation"
                message={`Are you sure you want to delete "${orgToDelete?.name}"? This action cannot be undone and will remove all associated data.`}
                isDeleting={isDeleting}
            />

            <BulkUploadModal
                isOpen={uploadModalOpen}
                onClose={() => setUploadModalOpen(false)}
                title="Bulk Upload Organisations"
                expectedColumns={["name", "orgType", "orgLevel"]}
                onUpload={handleUpload}
                sampleCsvHeader="name,orgType,orgLevel,parentOrgId\nExample Rugby Union,Union,COUNTRY,UUID-HERE"
            />
        </div>
    );
}
