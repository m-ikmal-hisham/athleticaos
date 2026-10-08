import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { deleteTeam, createBulkTeams } from "../../api/teams.api";
import { BulkUploadModal } from "../../components/modals/BulkUploadModal";
import { GlassCard } from "../../components/GlassCard";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Select } from "../../components/Select";
import { StatusPill } from "../../components/StatusPill";
import { UsersThree, MagnifyingGlass, Plus, Funnel, PencilSimple, Trash, X } from "@phosphor-icons/react";
import toast from "react-hot-toast";
import { PageHeader } from "../../components/PageHeader";
import { SmartFilterPills, FilterOption } from "../../components/SmartFilterPills";
import { EmptyState } from "../../components/EmptyState";
import { useAuthStore } from "../../store/auth.store";
import ConfirmDeleteModal from "../../components/modals/ConfirmDeleteModal";
import { Team } from "../../types";
import { getImageUrl } from "../../utils/image";
import { formatTeamCategory, formatAgeGroup } from "../../utils/formatters";
import { useAdminTeams, useAdminTeamFilters, useAdminTeamCategoryCounts } from "../../hooks/admin";

export default function Teams() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const queryClient = useQueryClient();

    const urlSearch = searchParams.get('search') || '';
    const urlCategory = searchParams.get('category') || '';
    const urlOrganisation = searchParams.get('organisationId') || '';
    const urlAgeGroup = searchParams.get('ageGroup') || '';
    const urlState = searchParams.get('state') || '';

    const [searchInput, setSearchInput] = useState(urlSearch);
    const [showFilters, setShowFilters] = useState(false);

    // Sync input if URL search changes externally (e.g. back navigation or clear filters)
    useEffect(() => {
        setSearchInput(urlSearch);
    }, [urlSearch]);

    // Debounce search input by 300 ms with replace: true
    useEffect(() => {
        if (searchInput.trim() === urlSearch.trim()) return;

        const timer = setTimeout(() => {
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    const trimmed = searchInput.trim();
                    if (trimmed) {
                        next.set('search', trimmed);
                    } else {
                        next.delete('search');
                    }
                    return next;
                },
                { replace: true }
            );
        }, 300);

        return () => clearTimeout(timer);
    }, [searchInput, urlSearch, setSearchParams]);

    const queryParams = useMemo(
        () => ({
            search: urlSearch.trim() || undefined,
            category: urlCategory || undefined,
            organisationId: urlOrganisation || undefined,
            ageGroup: urlAgeGroup || undefined,
            state: urlState || undefined,
            size: 24,
            sort: 'name',
        }),
        [urlSearch, urlCategory, urlOrganisation, urlAgeGroup, urlState]
    );

    const {
        data,
        isLoading,
        isFetching,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
        isError,
        refetch,
    } = useAdminTeams(queryParams);

    const categoryCountsParams = useMemo(
        () => ({
            search: urlSearch.trim() || undefined,
            organisationId: urlOrganisation || undefined,
            ageGroup: urlAgeGroup || undefined,
            state: urlState || undefined,
        }),
        [urlSearch, urlOrganisation, urlAgeGroup, urlState]
    );

    const { data: categoryCounts } = useAdminTeamCategoryCounts(categoryCountsParams);
    const { data: filtersData } = useAdminTeamFilters();

    const allTeams = useMemo(() => {
        return data?.pages.flatMap((page) => page.items) ?? [];
    }, [data]);

    const totalTeams = data?.pages[0]?.totalItems ?? categoryCounts?.ALL ?? 0;

    const { user } = useAuthStore();
    const isAdmin = user?.roles?.some((r) => ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN'].includes(r));
    const isSuperAdmin = user?.roles?.includes('ROLE_SUPER_ADMIN');

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Bulk upload state
    const [uploadModalOpen, setUploadModalOpen] = useState(false);

    // RBAC: Check if user can delete a specific team
    const canDeleteTeam = (team: Team) => {
        if (isSuperAdmin) return true;
        if (!user?.organisationId) return false;
        return team.organisationId === user.organisationId;
    };

    const handleAdd = () => {
        navigate('/dashboard/teams/new');
    };

    const handleUpload = async (uploadData: any[]) => {
        await createBulkTeams(uploadData);
        await queryClient.invalidateQueries({ queryKey: ['admin', 'teams'] });
    };

    const handleEdit = (e: React.MouseEvent, teamId: string) => {
        e.stopPropagation();
        navigate(`/dashboard/teams/${teamId}/edit`);
    };

    const handleDeleteClick = (e: React.MouseEvent, team: Team) => {
        e.stopPropagation();
        setTeamToDelete(team);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!teamToDelete) return;
        try {
            setIsDeleting(true);
            await deleteTeam(teamToDelete.id);
            toast.success("Team deleted successfully");
            await queryClient.invalidateQueries({ queryKey: ['admin', 'teams'] });
            setDeleteModalOpen(false);
            setTeamToDelete(null);
        } catch (err) {
            console.error("Failed to delete team", err);
            toast.error("Failed to delete team");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCardClick = (team: any) => {
        navigate(`/dashboard/teams/${team.slug || team.id}`);
    };

    const handleClearSearch = () => {
        setSearchInput('');
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.delete('search');
                return next;
            },
            { replace: true }
        );
    };

    const handleCategorySelect = (id: string | null) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (id && id !== 'ALL') {
                next.set('category', id);
            } else {
                next.delete('category');
            }
            return next;
        });
    };

    const handleOrgChange = (val: string | number) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (val) {
                next.set('organisationId', String(val));
            } else {
                next.delete('organisationId');
            }
            return next;
        });
    };

    const handleAgeGroupChange = (val: string | number) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (val) {
                next.set('ageGroup', String(val));
            } else {
                next.delete('ageGroup');
            }
            return next;
        });
    };

    const handleStateChange = (val: string | number) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (val) {
                next.set('state', String(val));
            } else {
                next.delete('state');
            }
            return next;
        });
    };

    const clearFilters = () => {
        setSearchInput('');
        setSearchParams(new URLSearchParams());
    };

    // Category options for MEN/WOMEN pills with counts from category-counts
    const categoryOptions: FilterOption[] = useMemo(() => {
        const getCount = (key: string) => {
            if (!categoryCounts) return 0;
            return categoryCounts[key] ?? categoryCounts[key.toUpperCase()] ?? 0;
        };
        return [
            { id: 'MEN', label: 'Men', count: getCount('MEN') },
            { id: 'WOMEN', label: 'Women', count: getCount('WOMEN') },
        ];
    }, [categoryCounts]);

    // Select options from /teams/filters
    const organisationOptions = useMemo(() => [
        { value: '', label: 'All Organisations' },
        ...(filtersData?.organisations.map((org) => ({
            value: org.id,
            label: org.name,
        })) ?? []),
    ], [filtersData?.organisations]);

    const ageGroupOptions = useMemo(() => [
        { value: '', label: 'All Age Groups' },
        ...(filtersData?.ageGroups.map((ag) => ({
            value: ag,
            label: ag,
        })) ?? []),
    ], [filtersData?.ageGroups]);

    const stateOptions = useMemo(() => [
        { value: '', label: 'All States' },
        ...(filtersData?.states.map((st) => ({
            value: st,
            label: st,
        })) ?? []),
    ], [filtersData?.states]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <PageHeader
                title="Teams"
                description={`${totalTeams.toLocaleString()} teams`}
                action={
                    isAdmin && (
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setUploadModalOpen(true)} className="gap-2">
                                <Plus className="w-4 h-4" />
                                Bulk Upload
                            </Button>
                            <Button onClick={handleAdd} className="gap-2">
                                <Plus className="w-4 h-4" />
                                Add Team
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
                                placeholder="Search by name, organisation..."
                                className="pl-9 pr-9 bg-glass-bg border-glass-border focus:border-primary-500/50 transition-colors"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                            />
                            {searchInput && (
                                <button
                                    type="button"
                                    aria-label="Clear search"
                                    onClick={handleClearSearch}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            className={`px-3 md:hidden ${showFilters ? 'bg-primary-500/10 border-primary-500/50 text-primary-500' : ''}`}
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <Funnel className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto max-w-full overflow-hidden">
                        <SmartFilterPills
                            options={categoryOptions}
                            selectedId={urlCategory ? urlCategory.toUpperCase() : null}
                            onSelect={(id) => handleCategorySelect(id || "")}
                            className="w-full md:w-auto max-w-full overflow-hidden"
                        />
                        {isFetching && !isLoading && (
                            <span className="text-xs text-muted-foreground animate-pulse whitespace-nowrap">
                                Updating…
                            </span>
                        )}
                    </div>
                </div>

                {/* Secondary Filters with shared Select component */}
                <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 transition-all duration-300 ${showFilters ? 'block' : 'hidden md:grid'}`}>
                    <Select
                        placeholder="All Organisations"
                        value={urlOrganisation}
                        onChange={handleOrgChange}
                        options={organisationOptions}
                    />

                    <Select
                        placeholder="All Age Groups"
                        value={urlAgeGroup}
                        onChange={handleAgeGroupChange}
                        options={ageGroupOptions}
                    />

                    <Select
                        placeholder="All States"
                        value={urlState}
                        onChange={handleStateChange}
                        options={stateOptions}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <GlassCard key={i} className="h-40 animate-pulse flex flex-col p-6">
                            <div className="w-12 h-12 rounded-full bg-white/5 mb-4" />
                            <div className="w-3/4 h-5 bg-white/5 rounded mb-2" />
                            <div className="w-1/2 h-4 bg-white/5 rounded" />
                        </GlassCard>
                    ))}
                </div>
            ) : isError ? (
                <EmptyState
                    icon={UsersThree}
                    title="Couldn't load teams."
                    description="Check your connection and try again."
                    actionLabel="Try again"
                    onAction={() => refetch()}
                    className="min-h-[400px] border-dashed border-white/10"
                />
            ) : allTeams.length === 0 ? (
                <EmptyState
                    icon={UsersThree}
                    title="No teams match your search."
                    description="Adjust filters or add a new team."
                    actionLabel="Clear filters"
                    onAction={clearFilters}
                    className="min-h-[400px] border-dashed border-white/10"
                />
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {allTeams.map((t) => (
                            <GlassCard
                                key={t.id}
                                hover={true}
                                className="group relative flex flex-col p-5 transition-all duration-300 cursor-pointer"
                                onClick={() => handleCardClick(t)}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 overflow-hidden">
                                        {t.logoUrl ? (
                                            <img
                                                src={getImageUrl(t.logoUrl)}
                                                alt={t.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-orange-500 text-lg font-bold">
                                                {t.name.substring(0, 2).toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <StatusPill status={t.status} />
                                        {isAdmin && (
                                            <>
                                                <button
                                                    onClick={(e) => handleEdit(e, t.id)}
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-black/60 dark:text-white/60 hover:bg-navy/10 hover:text-navy dark:hover:bg-navy-tint/15 dark:hover:text-navy-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-navy-tint transition-colors"
                                                    aria-label="Edit team"
                                                >
                                                    <PencilSimple className="w-4 h-4" />
                                                </button>
                                                {canDeleteTeam(t) && (
                                                    <button
                                                        onClick={(e) => handleDeleteClick(e, t)}
                                                        className="w-8 h-8 rounded-full flex items-center justify-center text-black/60 dark:text-white/60 hover:bg-crimson/10 hover:text-crimson dark:hover:bg-crimson-tint/15 dark:hover:text-crimson-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson dark:focus-visible:ring-crimson-tint transition-colors"
                                                        aria-label="Delete team"
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
                                        {t.name}
                                    </h3>
                                    <p className="text-sm text-muted-foreground truncate">{t.organisationName || "No Organisation"}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/5 text-xs text-muted-foreground">
                                    <div>
                                        <span className="block text-[10px] uppercase tracking-wider opacity-60">Category</span>
                                        <span className="font-medium text-foreground">{formatTeamCategory(t.category)} ({formatAgeGroup(t.ageGroup)})</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-[10px] uppercase tracking-wider opacity-60">State</span>
                                        <span className="font-medium text-foreground">{t.state || "-"}</span>
                                    </div>
                                </div>
                            </GlassCard>
                        ))}
                    </div>

                    {/* Show more button */}
                    {hasNextPage && (
                        <div className="flex justify-center pt-4">
                            <Button
                                variant="secondary"
                                onClick={() => fetchNextPage()}
                                isLoading={isFetchingNextPage}
                            >
                                Show more
                            </Button>
                        </div>
                    )}
                </div>
            )}

            <ConfirmDeleteModal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setTeamToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                title="Delete Team"
                message={`Are you sure you want to delete "${teamToDelete?.name}"? This action cannot be undone.`}
                isDeleting={isDeleting}
            />

            <BulkUploadModal
                isOpen={uploadModalOpen}
                onClose={() => setUploadModalOpen(false)}
                title="Bulk Upload Teams"
                expectedColumns={["name", "category", "ageGroup", "organisationId"]}
                onUpload={handleUpload}
                sampleCsvHeader="name,category,ageGroup,division,state,organisationId\nExample Rugby Club,Men,Senior,Div 1,Selangor,UUID-HERE"
            />
        </div>
    );
}
