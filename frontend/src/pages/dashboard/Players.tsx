import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { MagnifyingGlass, PencilSimple, UserMinus, Plus, Trash, X } from "@phosphor-icons/react";
import { EmptyState } from "../../components/EmptyState";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { GlassCard } from "../../components/GlassCard";
import { Badge } from "../../components/Badge";
import { useAuthStore } from "../../store/auth.store";
import { Player } from "../../types";
import { calculateAge } from "../../utils/date";
import { SmartFilterPills, FilterOption } from "../../components/SmartFilterPills";
import { getImageUrl } from "../../utils/image";
import { deletePlayer, createBulkPlayers } from "../../api/players.api";
import { BulkUploadModal } from "../../components/modals/BulkUploadModal";
import toast from "react-hot-toast";
import ConfirmDeleteModal from "../../components/modals/ConfirmDeleteModal";
import { useAdminPlayers, useAdminPlayerStatusCounts } from "../../hooks/admin";

export default function Players() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const queryClient = useQueryClient();

    const urlSearch = searchParams.get('search') || '';
    const urlStatus = searchParams.get('status') || '';

    const [searchInput, setSearchInput] = useState(urlSearch);

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
            status: urlStatus && urlStatus !== 'ALL' ? urlStatus : undefined,
            size: 24,
            sort: 'recent',
        }),
        [urlSearch, urlStatus]
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
    } = useAdminPlayers(queryParams);

    const { data: statusCounts } = useAdminPlayerStatusCounts({
        search: urlSearch.trim() || undefined,
    });

    const allPlayers = useMemo(() => {
        return data?.pages.flatMap((page) => page.items) ?? [];
    }, [data]);

    const totalPlayers = data?.pages[0]?.totalItems ?? statusCounts?.ALL ?? 0;

    const { user } = useAuthStore();
    const isAdmin = user?.roles?.some((r) => ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN'].includes(r));
    const isSuperAdmin = user?.roles?.includes('ROLE_SUPER_ADMIN');

    // Delete modal state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Bulk upload state
    const [uploadModalOpen, setUploadModalOpen] = useState(false);

    // RBAC: Check if user can delete a specific player
    const canDeletePlayer = (player: Player) => {
        if (isSuperAdmin) return true;
        if (!user?.organisationId) return false;
        return player.organisationId === user.organisationId;
    };

    // Navigation handlers
    const handleCardClick = (player: Player) => {
        navigate(`/dashboard/players/${player.id}`);
    };

    const handleAdd = () => {
        navigate('/dashboard/players/new');
    };

    const handleUpload = async (uploadData: any[]) => {
        await createBulkPlayers(uploadData as any[]);
        await queryClient.invalidateQueries({ queryKey: ['admin', 'players'] });
    };

    const handleEdit = (player: Player, e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/dashboard/players/${player.id}/edit`);
    };

    const handleDeleteClick = (player: Player, e: React.MouseEvent) => {
        e.stopPropagation();
        setPlayerToDelete(player);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!playerToDelete) return;
        try {
            setIsDeleting(true);
            await deletePlayer(playerToDelete.id);
            toast.success("Player deleted successfully");
            await queryClient.invalidateQueries({ queryKey: ['admin', 'players'] });
            setDeleteModalOpen(false);
            setPlayerToDelete(null);
        } catch (err) {
            console.error("Failed to delete player", err);
            toast.error("Failed to delete player");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleStatusFilterChange = (id: string | null) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (id && id !== 'ALL') {
                next.set('status', id);
            } else {
                next.delete('status');
            }
            return next;
        });
    };

    const clearFilters = () => {
        setSearchInput('');
        setSearchParams(new URLSearchParams());
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

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'green';
            case 'INACTIVE': return 'secondary';
            case 'BANNED': return 'destructive';
            default: return 'secondary';
        }
    };

    // Filter Options from status-counts
    const statusOptions: FilterOption[] = useMemo(() => [
        { id: 'ACTIVE', label: 'Active', count: statusCounts?.ACTIVE ?? 0 },
        { id: 'INACTIVE', label: 'Inactive', count: statusCounts?.INACTIVE ?? 0 },
        { id: 'BANNED', label: 'Banned', count: statusCounts?.BANNED ?? 0 },
    ], [statusCounts]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <PageHeader
                title="Players"
                description={`${totalPlayers.toLocaleString()} players`}
                action={
                    isAdmin && (
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setUploadModalOpen(true)} className="gap-2">
                                <Plus className="w-4 h-4" />
                                Bulk Upload
                            </Button>
                            <Button onClick={handleAdd} className="gap-2">
                                <Plus className="w-4 h-4" />
                                Add Player
                            </Button>
                        </div>
                    )
                }
            />

            {/* Controls Layout */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="relative w-full md:w-96">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted border-glass-border" />
                    <Input
                        placeholder="Search players..."
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

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <SmartFilterPills
                        options={statusOptions}
                        selectedId={!urlStatus || urlStatus === 'ALL' ? null : urlStatus}
                        onSelect={(id) => handleStatusFilterChange(id || 'ALL')}
                        className="w-full md:w-auto"
                    />
                    {isFetching && !isLoading && (
                        <span className="text-xs text-muted-foreground animate-pulse whitespace-nowrap">
                            Updating…
                        </span>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <GlassCard key={i} className="h-48 animate-pulse flex flex-col p-6">
                            <div className="w-12 h-12 rounded-full bg-white/5 mb-4" />
                            <div className="w-3/4 h-5 bg-white/5 rounded mb-2" />
                            <div className="w-1/2 h-4 bg-white/5 rounded" />
                        </GlassCard>
                    ))}
                </div>
            ) : isError ? (
                <EmptyState
                    icon={UserMinus}
                    title="Couldn't load players."
                    description="Check your connection and try again."
                    actionLabel="Try again"
                    onAction={() => refetch()}
                    className="min-h-[400px] border-dashed border-white/10"
                />
            ) : allPlayers.length === 0 ? (
                <EmptyState
                    icon={UserMinus}
                    title="No players match your search."
                    description="Try adjusting your search query or filters, or add a new player."
                    actionLabel="Clear filters"
                    onAction={clearFilters}
                    className="min-h-[400px] border-dashed border-white/10"
                />
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {allPlayers.map((p) => (
                            <GlassCard
                                key={p.id}
                                hover={true}
                                className="group relative flex flex-col p-5 transition-all duration-300 cursor-pointer"
                                onClick={() => handleCardClick(p)}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-navy/10 text-navy dark:bg-navy-tint/15 dark:text-navy-tint text-lg font-bold border border-navy/20 dark:border-navy-tint/30 overflow-hidden">
                                        {p.photoUrl ? (
                                            <img
                                                src={getImageUrl(p.photoUrl)}
                                                alt={`${p.firstName} ${p.lastName}`}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span>{p.firstName[0]}{p.lastName[0]}</span>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        <Badge variant={getStatusVariant(p.status) as any} className="text-[10px] px-1.5 h-5">
                                            {p.status}
                                        </Badge>
                                        {isAdmin && (
                                            <>
                                                <button
                                                    onClick={(e) => handleEdit(p, e)}
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-black/60 dark:text-white/60 hover:bg-navy/10 hover:text-navy dark:hover:bg-navy-tint/15 dark:hover:text-navy-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-navy-tint transition-colors"
                                                    aria-label="Edit player"
                                                >
                                                    <PencilSimple className="w-4 h-4" />
                                                </button>
                                                {canDeletePlayer(p) && (
                                                    <button
                                                        onClick={(e) => handleDeleteClick(p, e)}
                                                        className="w-8 h-8 rounded-full flex items-center justify-center text-black/60 dark:text-white/60 hover:bg-crimson/10 hover:text-crimson dark:hover:bg-crimson-tint/15 dark:hover:text-crimson-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson dark:focus-visible:ring-crimson-tint transition-colors"
                                                        aria-label="Delete player"
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
                                        {p.firstName} {p.lastName}
                                    </h3>
                                    <p className="text-sm text-muted-foreground truncate">{p.email || "No email"}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/5 text-xs text-muted-foreground">
                                    <div>
                                        <span className="block text-[10px] uppercase tracking-wider opacity-60">Age</span>
                                        <span className="font-medium text-foreground">{calculateAge(p.dob) ?? "-"}</span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] uppercase tracking-wider opacity-60">Nationality</span>
                                        <span className="font-medium text-foreground truncate">{p.nationality || "-"}</span>
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
                    setPlayerToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                title="Delete Player"
                message={`Are you sure you want to delete "${playerToDelete?.firstName} ${playerToDelete?.lastName}"? This action cannot be undone.`}
                isDeleting={isDeleting}
            />

            <BulkUploadModal
                isOpen={uploadModalOpen}
                onClose={() => setUploadModalOpen(false)}
                title="Bulk Upload Players"
                expectedColumns={["firstName", "lastName", "dob", "gender", "email", "teamId", "organisationId", "nationality"]}
                onUpload={handleUpload}
                sampleCsvHeader="firstName,lastName,dob,gender,email,teamId,organisationId,nationality,state,medicalNotes\nJohn,Doe,1995-05-12,MALE,john@example.com,UUID-HERE,UUID-HERE,Malaysia,Selangor,"
            />
        </div>
    );
}
