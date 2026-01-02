import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlass, PencilSimple, UserMinus, Plus } from "@phosphor-icons/react";
import { EmptyState } from "../../components/EmptyState";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { GlassCard } from "../../components/GlassCard";
import { Badge } from "../../components/Badge";
import { usePlayersStore } from "../../store/players.store";
import { useAuthStore } from "../../store/auth.store";
import { Player } from "../../types";
import { calculateAge } from "../../utils/date";
import { SmartFilterPills, FilterOption } from "../../components/SmartFilterPills";
import { deletePlayer } from "../../api/players.api";
import toast from "react-hot-toast";
import { Trash } from "@phosphor-icons/react";

export default function Players() {
    const navigate = useNavigate();
    const {
        filteredPlayers,
        loading,
        getPlayers,
        statusFilter,
        searchQuery,
        setStatusFilter,
        setSearchQuery,
    } = usePlayersStore();

    const { user } = useAuthStore();
    const isAdmin = user?.roles?.some(r => ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN'].includes(r));

    useEffect(() => {
        getPlayers();
    }, [getPlayers]);

    // Navigation handlers
    const handleCardClick = (player: Player) => {
        navigate(`/dashboard/players/${player.id}`);
    };

    const handleAdd = () => {
        navigate('/dashboard/players/new');
    };

    const handleEdit = (player: Player, e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/dashboard/players/${player.id}/edit`);
    };

    const handleDelete = async (player: Player, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to delete ${player.firstName} ${player.lastName}?`)) {
            try {
                await deletePlayer(player.id);
                toast.success("Player deleted successfully");
                getPlayers();
            } catch (error) {
                console.error("Failed to delete player", error);
                toast.error("Failed to delete player");
            }
        }
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'green';
            case 'INACTIVE': return 'secondary';
            case 'BANNED': return 'destructive';
            default: return 'secondary';
        }
    };

    // Filter Options
    const statusOptions: FilterOption[] = useMemo(() => [
        { id: 'ACTIVE', label: 'Active', count: filteredPlayers.filter(p => p.status === 'ACTIVE').length },
        { id: 'INACTIVE', label: 'Inactive' },
        { id: 'BANNED', label: 'Banned' },
    ], [filteredPlayers]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <PageHeader
                title="Players"
                description="Manage all registered rugby players"
                action={
                    isAdmin && (
                        <Button onClick={handleAdd} className="gap-2">
                            <Plus className="w-4 h-4" />
                            Add Player
                        </Button>
                    )
                }
            />

            {/* Controls Layout */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="relative w-full md:w-96">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted border-glass-border" />
                    <Input
                        placeholder="Search players..."
                        className="pl-9 bg-glass-bg border-glass-border focus:border-primary-500/50 transition-colors"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <SmartFilterPills
                    options={statusOptions}
                    selectedId={statusFilter === 'ALL' ? null : statusFilter}
                    onSelect={(id) => setStatusFilter(id || 'ALL')}
                    className="w-full md:w-auto"
                />
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <GlassCard key={i} className="h-48 animate-pulse flex flex-col p-6">
                            <div className="w-12 h-12 rounded-full bg-white/5 mb-4" />
                            <div className="w-3/4 h-5 bg-white/5 rounded mb-2" />
                            <div className="w-1/2 h-4 bg-white/5 rounded" />
                        </GlassCard>
                    ))}
                </div>
            ) : filteredPlayers.length === 0 ? (
                <EmptyState
                    icon={UserMinus}
                    title="No players found"
                    description="Try adjusting your search or filters, or add a new player."
                    actionLabel={isAdmin ? "Add Player" : undefined}
                    onAction={isAdmin ? handleAdd : undefined}
                    className="min-h-[400px] border-dashed border-white/10"
                />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredPlayers.map((p) => (
                        <GlassCard
                            key={p.id}
                            className="group relative flex flex-col p-5 hover:bg-white/5 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-glass-lg border-white/10"
                            onClick={() => handleCardClick(p)}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary-500/10 text-primary-500 text-lg font-bold border border-primary-500/20">
                                    {p.firstName[0]}{p.lastName[0]}
                                </div>
                                <div className="flex gap-1">
                                    <Badge variant={getStatusVariant(p.status) as any} className="text-[10px] px-1.5 h-5">
                                        {p.status}
                                    </Badge>
                                    {isAdmin && (
                                        <>
                                            <button
                                                onClick={(e) => handleEdit(p, e)}
                                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                                                aria-label="Edit player"
                                            >
                                                <PencilSimple className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(p, e)}
                                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-colors"
                                                aria-label="Delete player"
                                            >
                                                <Trash className="w-4 h-4" />
                                            </button>
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
            )}
        </div>
    );
}
