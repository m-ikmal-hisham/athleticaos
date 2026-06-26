import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { RosterList } from '../../../components/RosterList';
import { fetchTeamBySlug, fetchTeamById, fetchTeamStats, fetchTeamMatches, fetchTeamPlayers } from '../../../api/teams.api';
import { removePlayersFromTeam } from '../../../api/playerTeams.api';
import { usePlayersStore } from '../../../store/players.store';
import { Users, Trophy, Target, CaretDown, CaretUp, MagnifyingGlass, Trash } from '@phosphor-icons/react';
import { RecentActivityWidget } from '@/components/RecentActivityWidget';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { getImageUrl } from '@/utils/image';
import { formatTeamCategory, formatAgeGroup, formatMatchStatus } from "@/utils/formatters";
import { TeamStaffPanel } from '@/components/admin/team/TeamStaffPanel';
import { useAuthStore } from '../../../store/auth.store';
import { BulkPasteRosterModal } from '@/components/modals/BulkPasteRosterModal';
import ConfirmDeleteModal from '../../../components/modals/ConfirmDeleteModal';

interface TeamDetail {
    id: string;
    name: string;
    category: string;
    ageGroup: string;
    division: string;
    state: string;
    status: string;
    organisationId: string;
    organisationName?: string;
    logoUrl?: string;
    tournaments?: { id: string; name: string }[];
}

interface TeamStats {
    teamId: string;
    teamName: string;
    organisationName?: string;
    matchesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
    pointsFor: number;
    pointsAgainst: number;
    pointsDifference: number;
    triesScored: number;
    conversions: number;
    penalties: number;
    dropGoals: number;
    yellowCards: number;
    redCards: number;
    tablePoints: number;
}

interface Match {
    id: string;
    homeTeamName: string;
    awayTeamName: string;
    homeScore: number;
    awayScore: number;
    status: string;
    scheduledTime: string;
}

const COLLAPSED_LIMIT = 5;

export default function TeamDetail() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { openPlayerDrawer } = usePlayersStore();
    const { user } = useAuthStore();
    const isAdmin = user?.roles?.some(r => ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN'].includes(r));
    const [pasteModalOpen, setPasteModalOpen] = useState(false);

    const [team, setTeam] = useState<TeamDetail | null>(null);
    const [stats, setStats] = useState<TeamStats | null>(null);
    const [matches, setMatches] = useState<Match[]>([]);
    const [teamPlayers, setTeamPlayers] = useState<any[]>([]);
    const [staffPersonIds, setStaffPersonIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Roster expand/search state — collapsed by default
    const [rosterExpanded, setRosterExpanded] = useState(false);
    const [rosterSearch, setRosterSearch] = useState('');
    const [showRosterStats, setShowRosterStats] = useState(false);
    const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [removeModalOpen, setRemoveModalOpen] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);

    const selectedTournamentName = useMemo(() => {
        if (!selectedTournamentId) return 'Global';
        return team?.tournaments?.find(t => t.id === selectedTournamentId)?.name || '';
    }, [selectedTournamentId, team?.tournaments]);

    useEffect(() => {
        if (!slug) return;

        const loadTeamData = async () => {
            setLoading(true);
            setError(null);
            try {
                let teamData;
                try {
                    const res = await fetchTeamBySlug(slug);
                    teamData = res.data;
                } catch (e) {
                    console.warn("Failed to fetch by slug, trying ID...", e);
                    const res = await fetchTeamById(slug);
                    teamData = res.data;
                }

                if (!teamData) throw new Error("Team not found");
                setTeam(teamData);

                const teamId = teamData.id;

                const [statsRes, matchesRes] = await Promise.all([
                    fetchTeamStats(teamId).catch(() => ({ data: null })),
                    fetchTeamMatches(teamId).catch(() => ({ data: [] })),
                ]);
                setStats(statsRes.data);
                setMatches(matchesRes.data || []);
            } catch (err) {
                setError('Failed to load team details');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadTeamData();
    }, [slug]);

    const loadRosterAndStats = useCallback(async () => {
        if (!team?.id) return;
        try {
            const [playersRes, statsRes] = await Promise.all([
                fetchTeamPlayers(team.id, selectedTournamentId || undefined),
                fetchTeamStats(team.id, selectedTournamentId || undefined).catch(() => ({ data: null }))
            ]);
            setTeamPlayers(playersRes.data || []);
            setStats(statsRes.data);
        } catch (err) {
            console.error("Failed to fetch team roster and stats:", err);
        }
    }, [team?.id, selectedTournamentId]);

    useEffect(() => {
        loadRosterAndStats();
    }, [loadRosterAndStats]);

    useEffect(() => {
        setSelectedPlayerIds([]);
    }, [selectedTournamentId, showRosterStats, rosterSearch]);

    // Callback from TeamStaffPanel when staff list changes
    const handleStaffChange = useCallback((ids: string[]) => {
        setStaffPersonIds(ids);
    }, []);

    const handleConfirmRemove = async () => {
        if (selectedPlayerIds.length === 0 || !team?.id) return;
        try {
            setIsRemoving(true);
            await removePlayersFromTeam(selectedPlayerIds, team.id);
            toast.success("Successfully removed players from team");
            setSelectedPlayerIds([]);
            setRemoveModalOpen(false);
            loadRosterAndStats();
        } catch (err) {
            console.error("Failed to remove players from team:", err);
            toast.error("Failed to remove players");
        } finally {
            setIsRemoving(false);
        }
    };

    // Filter roster: exclude persons who are assigned as staff
    const rosterPlayers = useMemo(() => {
        if (staffPersonIds.length === 0) return teamPlayers;
        const staffSet = new Set(staffPersonIds);
        return teamPlayers.filter(p => {
            const personId = p.personId || p.person?.id;
            return !personId || !staffSet.has(personId);
        });
    }, [teamPlayers, staffPersonIds]);

    // Searchable + expandable roster
    const filteredRoster = useMemo(() => {
        if (!rosterSearch.trim()) return rosterPlayers;
        const q = rosterSearch.toLowerCase();
        return rosterPlayers.filter(p =>
            `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
            (p.position || '').toLowerCase().includes(q) ||
            String(p.jerseyNumber || '').includes(q)
        );
    }, [rosterPlayers, rosterSearch]);

    const displayedRoster = rosterExpanded ? filteredRoster : filteredRoster.slice(0, COLLAPSED_LIMIT);
    const hasMoreRoster = filteredRoster.length > COLLAPSED_LIMIT;

    const handleViewMatches = () => {
        if (team?.id) {
            navigate(`/dashboard/matches?teamId=${team.id}`);
        }
    };

    if (loading) {
        return (
            <Card>
                <p className="text-muted-foreground">Loading team details...</p>
            </Card>
        );
    }

    if (error || !team) {
        return (
            <Card>
                <p className="text-red-400">{error || 'Team not found'}</p>
                <Button onClick={() => navigate('/dashboard/teams')} className="mt-4">
                    Back to Teams
                </Button>
            </Card>
        );
    }

    const recentMatches = matches.slice(0, 5);

    return (
        <div className="container mx-auto max-w-[1400px]">
            {/* Header */}
            <div className="mb-8">
                <Breadcrumbs
                    items={[
                        { label: 'Teams', path: '/dashboard/teams' },
                        { label: team.name }
                    ]}
                    className="mb-4"
                />

                {team.logoUrl && (
                    <img
                        src={getImageUrl(team.logoUrl)}
                        alt={`${team.name} logo`}
                        className="w-20 h-20 mb-4 object-contain"
                    />
                )}
                <h1 className="text-4xl font-bold text-foreground mb-2">
                    {team.name}
                </h1>
                <p className="text-muted-foreground">
                    {formatTeamCategory(team.category)} • {formatAgeGroup(team.ageGroup)} • {team.division} • {team.state}
                </p>
            </div>

            {/* Desktop 2-column layout, Mobile stacked */}
            <div className="grid grid-cols-1 md:grid-cols-[minmax(300px,1fr)] lg:grid-cols-[1fr,1.5fr] gap-6">
                {/* Left Column */}
                <div className="flex flex-col gap-6">
                    {/* Team Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Team Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-4">
                                <div>
                                    <p className="text-muted-foreground text-sm">Organisation</p>
                                    <p className="text-foreground font-medium">
                                        {team.organisationName || '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-sm">Status</p>
                                    <span className={`status-pill status-${team.status.toLowerCase()}`}>
                                        {team.status}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Team Staff — directly after Team Info */}
                    <TeamStaffPanel teamId={team.id} organisationId={team.organisationId} onStaffChange={handleStaffChange} />

                    {/* Team Stats */}
                    {stats && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                                    <span>Team Statistics</span>
                                    <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                        {selectedTournamentName}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="stat-card">
                                        <Target className="w-5 h-5 text-primary" />
                                        <div>
                                            <p className="text-2xl font-bold text-foreground">{stats.matchesPlayed}</p>
                                            <p className="text-sm text-muted-foreground">Played</p>
                                        </div>
                                    </div>
                                    <div className="stat-card">
                                        <Trophy className="w-5 h-5 text-primary" />
                                        <div>
                                            <p className="text-2xl font-bold text-foreground">{stats.wins}</p>
                                            <p className="text-sm text-muted-foreground">Wins</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Draws</span>
                                        <span className="text-foreground font-medium">{stats.draws}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Losses</span>
                                        <span className="text-foreground font-medium">{stats.losses}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-border/50 pt-2">
                                        <span className="text-muted-foreground font-medium">Tries Scored</span>
                                        <span className="text-foreground font-bold">{stats.triesScored}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Conversions</span>
                                        <span className="text-foreground font-medium">{stats.conversions}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Penalties</span>
                                        <span className="text-foreground font-medium">{stats.penalties}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Drop Goals</span>
                                        <span className="text-foreground font-medium">{stats.dropGoals}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-border/50 pt-2">
                                        <span className="text-muted-foreground">Points For</span>
                                        <span className="text-foreground font-medium">{stats.pointsFor}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Points Against</span>
                                        <span className="text-foreground font-medium">{stats.pointsAgainst}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Points Difference</span>
                                        <span className={`font-medium ${stats.pointsDifference >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {stats.pointsDifference > 0 ? `+${stats.pointsDifference}` : stats.pointsDifference}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-t border-border/50 pt-2">
                                        <span className="text-muted-foreground flex items-center gap-1.5">
                                            <span className="w-2.5 h-3.5 bg-yellow-400 rounded-[2px]" /> Yellow Cards
                                        </span>
                                        <span className="text-foreground font-medium">{stats.yellowCards}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground flex items-center gap-1.5">
                                            <span className="w-2.5 h-3.5 bg-red-500 rounded-[2px]" /> Red Cards
                                        </span>
                                        <span className="text-foreground font-medium">{stats.redCards}</span>
                                    </div>
                                    <div className="flex justify-between pt-3 border-t border-border/50">
                                        <span className="text-muted-foreground">Win Rate</span>
                                        <span className="text-foreground font-bold">
                                            {stats.matchesPlayed > 0
                                                ? `${Math.round((stats.wins / stats.matchesPlayed) * 100)}%`
                                                : '—'}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Column */}
                <div className="flex flex-col gap-6">
                    {/* Roster (collapsible + searchable) */}
                    <Card>
                        <CardHeader
                            className="cursor-pointer select-none"
                            onClick={() => setRosterExpanded(!rosterExpanded)}
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>
                                        <div className="flex items-center gap-2">
                                            <Users className="w-5 h-5" />
                                            Roster
                                        </div>
                                    </CardTitle>
                                    <CardDescription>{rosterPlayers.length} players</CardDescription>
                                </div>
                                <Button variant="ghost" size="sm" className="h-10 w-10 p-0 shrink-0">
                                    {rosterExpanded ? (
                                        <CaretUp className="w-6 h-6" />
                                    ) : (
                                        <CaretDown className="w-6 h-6" />
                                    )}
                                </Button>
                            </div>
                        </CardHeader>

                        {/* Content only shown when expanded */}
                        {rosterExpanded && (
                            <CardContent>
                                {/* Search bar */}
                                {rosterPlayers.length > COLLAPSED_LIMIT && (
                                    <div className="relative mb-4">
                                        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Search players..."
                                            value={rosterSearch}
                                            onChange={(e) => setRosterSearch(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full pl-9 pr-4 py-2 text-sm bg-muted/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 text-foreground placeholder:text-muted-foreground"
                                        />
                                    </div>
                                )}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/50 mb-4 pb-2 gap-4">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowRosterStats(false);
                                            }}
                                            className={`pb-2 px-4 font-semibold text-sm transition-all border-b-2 ${
                                                !showRosterStats
                                                    ? 'border-primary text-foreground'
                                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            Standard Roster
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowRosterStats(true);
                                            }}
                                            className={`pb-2 px-4 font-semibold text-sm transition-all border-b-2 ${
                                                showRosterStats
                                                    ? 'border-primary text-foreground'
                                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            Player Stats
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-3 px-4" onClick={(e) => e.stopPropagation()}>
                                        {isAdmin && selectedPlayerIds.length > 0 && (
                                            <Button
                                                size="sm"
                                                variant="danger"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setRemoveModalOpen(true);
                                                }}
                                                className="py-1 px-3 text-xs gap-1"
                                            >
                                                <Trash className="w-3.5 h-3.5" />
                                                Remove Selected ({selectedPlayerIds.length})
                                            </Button>
                                        )}
                                        {isAdmin && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPasteModalOpen(true);
                                                }}
                                                className="py-1 px-3 text-xs"
                                            >
                                                Bulk Paste Roster
                                            </Button>
                                        )}
                                        {team.tournaments && team.tournaments.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tournament:</span>
                                                <select
                                                    value={selectedTournamentId}
                                                    onChange={(e) => setSelectedTournamentId(e.target.value)}
                                                    className="px-2 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                                                >
                                                    <option value="">All (Global)</option>
                                                    {team.tournaments.map((t) => (
                                                        <option key={t.id} value={t.id}>
                                                            {t.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <RosterList
                                    players={rosterSearch ? filteredRoster : displayedRoster}
                                    onPlayerClick={openPlayerDrawer}
                                    showStats={showRosterStats}
                                    showCheckboxes={isAdmin}
                                    selectedIds={selectedPlayerIds}
                                    onSelectionChange={setSelectedPlayerIds}
                                />
                                {/* Show More / Less toggle (when not searching) */}
                                {!rosterSearch && hasMoreRoster && (
                                    <div className="mt-3 text-center">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // This toggles between showing 5 and all
                                                setRosterExpanded(true);
                                            }}
                                            className="text-muted-foreground hover:text-foreground gap-1"
                                        >
                                            Showing {displayedRoster.length} of {rosterPlayers.length} players
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        )}
                    </Card>

                    {/* Recent Matches */}
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Recent Matches</CardTitle>
                                {matches.length > 0 && (
                                    <Button onClick={handleViewMatches} size="sm" variant="outline">
                                        View All
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {recentMatches.length === 0 ? (
                                <p className="text-muted-foreground">No matches found</p>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {recentMatches.map((match) => (
                                        <div key={match.id} className="match-row">
                                            <div className="flex-1">
                                                <p className="text-foreground font-medium text-sm">
                                                    {match.homeTeamName} vs {match.awayTeamName}
                                                </p>
                                                <p className="text-muted-foreground text-xs">
                                                    {new Date(match.scheduledTime).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-foreground font-bold">
                                                    {match.homeScore} - {match.awayScore}
                                                </p>
                                                <span className={`status-pill status-${match.status.toLowerCase()} text-[0.7rem]`}>
                                                    {formatMatchStatus(match.status)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Activity */}
                    {team && (
                        <div className="h-[400px]">
                            <RecentActivityWidget
                                entityType="TEAM"
                                entityId={team.id}
                                title="Team Activity"
                                limit={5}
                            />
                        </div>
                    )}
                </div>
            </div>

            {team && (
                <BulkPasteRosterModal
                    isOpen={pasteModalOpen}
                    onClose={() => setPasteModalOpen(false)}
                    teamId={team.id}
                    onSuccess={loadRosterAndStats}
                />
            )}
            {team && (
                <ConfirmDeleteModal
                    isOpen={removeModalOpen}
                    onClose={() => setRemoveModalOpen(false)}
                    onConfirm={handleConfirmRemove}
                    title="Remove Players from Team"
                    message={`Are you sure you want to remove the selected ${selectedPlayerIds.length} player(s) from this team's roster?`}
                    isDeleting={isRemoving}
                />
            )}
        </div>
    );
}
