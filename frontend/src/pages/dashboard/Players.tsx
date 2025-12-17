import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, MoreHorizontal, UserX } from "lucide-react";
import { TableSkeleton } from "../../components/LoadingSkeleton";
import { EmptyState } from "../../components/EmptyState";
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
import { usePlayersStore } from "../../store/players.store";
import { PlayerModal } from "../../components/modals/PlayerModal";
import { PlayerDetailDrawer } from "./players/PlayerDetailDrawer";
import { useAuthStore } from "../../store/auth.store";
import { Player } from "../../types";
import { calculateAge } from "../../utils/date";

export default function Players() {
    const {
        filteredPlayers,
        loading,
        error,
        getPlayers,
        savePlayer,
        // Drawer
        selectedPlayerId,
        isDrawerOpen,
        openPlayerDrawer,
        closePlayerDrawer,
        // Filters
        statusFilter,
        searchQuery,
        setStatusFilter,
        setSearchQuery,
    } = usePlayersStore();

    const { user } = useAuthStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

    const [searchParams, setSearchParams] = useSearchParams();
    const isAdmin = user?.roles?.some(r => ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN'].includes(r));

    useEffect(() => {
        getPlayers();
    }, [getPlayers]);

    // URL is the Source of Truth for Drawer Sate
    useEffect(() => {
        const playerParam = searchParams.get('player');
        if (playerParam) {
            if (!isDrawerOpen || selectedPlayerId !== playerParam) {
                openPlayerDrawer(playerParam);
            }
        } else {
            if (isDrawerOpen) {
                closePlayerDrawer();
            }
        }
    }, [searchParams, isDrawerOpen, selectedPlayerId, openPlayerDrawer, closePlayerDrawer]);

    // Handle opening drawer via URL update
    const handleRowClick = (player: Player) => {
        const slugOrId = player.slug || player.id;
        setSearchParams((prev) => {
            prev.set('player', slugOrId);
            return prev;
        });
    };

    // Handle closing drawer by clearing URL
    const handleCloseDrawer = () => {
        setSearchParams((prev) => {
            prev.delete('player');
            return prev;
        });
    };

    const handleAdd = () => {
        setModalMode('create');
        setSelectedPlayer(null);
        setIsModalOpen(true);
    };

    const handleEdit = (player: Player, e: React.MouseEvent) => {
        e.stopPropagation();
        setModalMode('edit');
        setSelectedPlayer(player);
        setIsModalOpen(true);
    };

    const handleSubmit = async (data: any) => {
        try {
            await savePlayer(data);
            setIsModalOpen(false);
        } catch (error) {
            console.error('Failed to save player:', error);
            // Error handling is done in store/api usually via toast
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

    return (
        <div className="space-y-6">
            <PageHeader
                title="Players"
                description="Manage all registered rugby players"
                action={
                    isAdmin && (
                        <Button onClick={handleAdd}>
                            Add Player
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
                                placeholder="Search by name or email..."
                                className="pl-9 bg-glass-bg/50"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <select
                                className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="ALL">All Status</option>
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                                <option value="BANNED">Banned</option>
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-4">
                            <TableSkeleton rows={5} cols={6} />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="border-b border-border/60">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="text-xs font-medium text-muted-foreground">Name</TableHead>
                                    <TableHead className="text-xs font-medium text-muted-foreground">Email</TableHead>
                                    <TableHead className="text-xs font-medium text-muted-foreground">Gender</TableHead>
                                    <TableHead className="text-xs font-medium text-muted-foreground">Age</TableHead>
                                    <TableHead className="text-xs font-medium text-muted-foreground">Nationality</TableHead>
                                    <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
                                    <TableHead className="text-xs font-medium text-muted-foreground text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {error ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-destructive">{error}</TableCell>
                                    </TableRow>
                                ) : filteredPlayers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="p-0">
                                            <EmptyState
                                                icon={UserX}
                                                title="No players found"
                                                description="Try adjusting your search or filters, or add a new player."
                                                actionLabel={isAdmin ? "Add Player" : undefined}
                                                onAction={isAdmin ? handleAdd : undefined}
                                                className="border-none bg-transparent"
                                            />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredPlayers.map((p) => (
                                        <TableRow
                                            key={p.id}
                                            className="group hover:bg-muted/30 transition-colors cursor-pointer border-b border-border/40"
                                            onClick={() => handleRowClick(p)}
                                        >
                                            <TableCell className="py-4">
                                                <span className="text-sm font-medium">{p.firstName} {p.lastName}</span>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <span className="text-sm text-muted-foreground">{p.email || "—"}</span>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <span className="text-sm">{p.gender || "—"}</span>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <span className="text-sm">{calculateAge(p.dob) ?? "—"}</span>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <span className="text-sm">{p.nationality || "—"}</span>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <span className="text-sm">
                                                    <Badge variant={getStatusVariant(p.status) as any} className="text-xs">
                                                        {p.status}
                                                    </Badge>
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {isAdmin && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => handleEdit(p, e)}
                                                            className="h-8 px-3"
                                                        >
                                                            Edit
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openPlayerDrawer(p.id);
                                                        }}
                                                    >
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <PlayerModal
                isOpen={isModalOpen}
                mode={modalMode}
                initialPlayer={selectedPlayer}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
            />

            <PlayerDetailDrawer
                isOpen={isDrawerOpen}
                onClose={handleCloseDrawer}
                playerId={selectedPlayerId}
            />
        </div>
    );
}
