import { useEffect, useState } from "react";
import { GlassCard } from "../../components/GlassCard";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Link } from "react-router-dom";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useTournamentsStore } from "../../store/tournaments.store";
import { StatusPill } from "../../components/StatusPill";
import { TournamentModal } from "@/components/modals/TournamentModal";
import { useAuthStore } from "@/store/auth.store";
import { PageHeader } from "../../components/PageHeader";

export default function Tournaments() {
    const { tournaments, loading, error, getTournaments } = useTournamentsStore();
    const { user } = useAuthStore();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedTournament, setSelectedTournament] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [seasonFilter, setSeasonFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [levelFilter, setLevelFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    useEffect(() => {
        getTournaments();
    }, [getTournaments]);

    const isAdmin = user?.roles?.some(r => ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN'].includes(r));

    // Extract unique values for filters
    const seasons = Array.from(new Set(tournaments.map(t => t.seasonName).filter(Boolean)));
    const types = Array.from(new Set(tournaments.map(t => t.competitionType).filter(Boolean)));
    const levels = Array.from(new Set(tournaments.map(t => t.level).filter(Boolean)));
    const statuses = Array.from(new Set(tournaments.map(t => t.status).filter(Boolean)));

    // Apply search and filters
    const filteredTournaments = tournaments.filter(tournament => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesSearch = tournament.name.toLowerCase().includes(query) ||
                tournament.seasonName?.toLowerCase().includes(query) ||
                tournament.level?.toLowerCase().includes(query);
            if (!matchesSearch) return false;
        }

        // Dropdown filters
        if (seasonFilter && tournament.seasonName !== seasonFilter) return false;
        if (typeFilter && tournament.competitionType !== typeFilter) return false;
        if (levelFilter && tournament.level !== levelFilter) return false;
        if (statusFilter && tournament.status !== statusFilter) return false;

        return true;
    });

    return (
        <div className="space-y-6">
            <PageHeader
                title="Tournaments"
                description="Overview of rugby competitions"
                action={
                    isAdmin && (
                        <Button onClick={() => {
                            setSelectedTournament(null);
                            setIsCreateModalOpen(true);
                        }}>
                            New Tournament
                        </Button>
                    )
                }
            />

            <GlassCard>
                <div className="p-0">
                    {/* Search Box */}
                    <div className="p-4 border-b border-glass-border">
                        <div className="relative">
                            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                            <Input
                                placeholder="Search by name, season, or level..."
                                className="pl-9 bg-glass-bg/50"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="p-4 border-b border-glass-border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <select
                            value={seasonFilter}
                            onChange={(e) => setSeasonFilter(e.target.value)}
                            className="h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Filter by Season"
                        >
                            <option value="">All Seasons</option>
                            {seasons.map(season => (
                                <option key={season} value={season}>{season}</option>
                            ))}
                        </select>

                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Filter by Type"
                        >
                            <option value="">All Types</option>
                            {types.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>

                        <select
                            value={levelFilter}
                            onChange={(e) => setLevelFilter(e.target.value)}
                            className="h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Filter by Level"
                        >
                            <option value="">All Levels</option>
                            {levels.map(level => (
                                <option key={level} value={level}>{level}</option>
                            ))}
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Filter by Status"
                        >
                            <option value="">All Statuses</option>
                            {statuses.map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>

                    {loading && <p className="p-4">Loading tournaments...</p>}
                    {error && <p className="p-4 text-destructive">{error}</p>}

                    {!loading && filteredTournaments.length === 0 && <p className="p-4 text-muted-foreground">No tournaments found</p>}

                    {!loading && filteredTournaments.length > 0 && (
                        <div className="w-full overflow-auto">
                            <table className="glass-table w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border/60 text-muted-foreground text-sm">
                                        <th className="p-4 font-medium">Title</th>
                                        <th className="p-4 font-medium">Season</th>
                                        <th className="p-4 font-medium">Type</th>
                                        <th className="p-4 font-medium">Level</th>
                                        <th className="p-4 font-medium">Start Date</th>
                                        <th className="p-4 font-medium">Status</th>
                                        <th className="p-4 font-medium"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTournaments.map((t) => (
                                        <tr key={t.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                                            <td className="p-4">
                                                <Link
                                                    to={`/dashboard/tournaments/${t.slug || t.id}`}
                                                    className="text-blue-600 dark:text-blue-400 hover:underline"
                                                >
                                                    {t.name}
                                                </Link>
                                            </td>
                                            <td className="p-4">{t.seasonName || '-'}</td>
                                            <td className="p-4">{t.competitionType || '-'}</td>
                                            <td className="p-4">{t.level}</td>
                                            <td className="p-4">{new Date(t.startDate).toLocaleDateString()}</td>
                                            <td className="p-4">
                                                <StatusPill status={t.status} />
                                            </td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    {isAdmin && (
                                                        <Button
                                                            className="btn-secondary h-8 px-3 text-xs"
                                                            onClick={() => {
                                                                setSelectedTournament(t);
                                                                setIsCreateModalOpen(true);
                                                            }}
                                                        >
                                                            Edit
                                                        </Button>
                                                    )}
                                                    <Button
                                                        className="btn-secondary h-8 px-3 text-xs"
                                                        onClick={() => window.open(`/api/v1/tournaments/${t.id}/export/matches`, '_blank')}
                                                    >
                                                        Matches
                                                    </Button>
                                                    <Button
                                                        className="btn-secondary h-8 px-3 text-xs"
                                                        onClick={() => window.open(`/api/v1/tournaments/${t.id}/export/results`, '_blank')}
                                                    >
                                                        Results
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </GlassCard>

            <TournamentModal
                isOpen={isCreateModalOpen}
                tournament={selectedTournament}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setSelectedTournament(null);
                }}
                onSuccess={() => {
                    getTournaments();
                }}
            />
        </div>
    );
}
