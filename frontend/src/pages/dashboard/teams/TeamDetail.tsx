import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { RosterList } from '../../../components/RosterList';
import { fetchTeamBySlug, fetchTeamById, fetchTeamStats, fetchTeamMatches, fetchTeamPlayers } from '../../../api/teams.api';
import { usePlayersStore } from '../../../store/players.store';
import { Users, Trophy, Target, TrendUp, CaretDown, CaretUp, MagnifyingGlass } from '@phosphor-icons/react';
import { RecentActivityWidget } from '@/components/RecentActivityWidget';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { getImageUrl } from '@/utils/image';
import { formatTeamCategory, formatAgeGroup, formatMatchStatus } from "@/utils/formatters";
import { TeamStaffPanel } from '@/components/admin/team/TeamStaffPanel';

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
}

interface TeamStats {
    teamId: string;
    teamName: string;
    totalMatches: number;
    wins: number;
    losses: number;
    draws: number;
    pointsFor: number;
    pointsAgainst: number;
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

                const [statsRes, matchesRes, playersRes] = await Promise.all([
                    fetchTeamStats(teamId).catch(() => ({ data: null })),
                    fetchTeamMatches(teamId).catch(() => ({ data: [] })),
                    fetchTeamPlayers(teamId).catch(() => ({ data: [] })),
                ]);
                setStats(statsRes.data);
                setMatches(matchesRes.data || []);
                setTeamPlayers(playersRes.data || []);
            } catch (err) {
                setError('Failed to load team details');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadTeamData();
    }, [slug]);

    // Callback from TeamStaffPanel when staff list changes
    const handleStaffChange = useCallback((ids: string[]) => {
        setStaffPersonIds(ids);
    }, []);

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
                                <CardTitle>Team Statistics</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="stats-grid mb-6">
                                    <div className="stat-card">
                                        <Target className="w-5 h-5 text-primary" />
                                        <div>
                                            <p className="text-2xl font-bold text-foreground">{stats.totalMatches}</p>
                                            <p className="text-sm text-muted-foreground">Matches</p>
                                        </div>
                                    </div>
                                    <div className="stat-card">
                                        <Trophy className="w-5 h-5 text-primary" />
                                        <div>
                                            <p className="text-2xl font-bold text-foreground">{stats.wins}</p>
                                            <p className="text-sm text-muted-foreground">Wins</p>
                                        </div>
                                    </div>
                                    <div className="stat-card">
                                        <TrendUp className="w-5 h-5 text-primary" />
                                        <div>
                                            <p className="text-2xl font-bold text-foreground">{stats.pointsFor}</p>
                                            <p className="text-sm text-muted-foreground">Points For</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Losses</span>
                                        <span className="text-foreground font-medium">{stats.losses}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Draws</span>
                                        <span className="text-foreground font-medium">{stats.draws}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Points Against</span>
                                        <span className="text-foreground font-medium">{stats.pointsAgainst}</span>
                                    </div>
                                    <div className="flex justify-between pt-3 border-t border-border/50">
                                        <span className="text-muted-foreground">Win Rate</span>
                                        <span className="text-foreground font-bold">
                                            {stats.totalMatches > 0
                                                ? `${Math.round((stats.wins / stats.totalMatches) * 100)}%`
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
                                <RosterList
                                    players={rosterSearch ? filteredRoster : displayedRoster}
                                    onPlayerClick={openPlayerDrawer}
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
        </div>
    );
}
