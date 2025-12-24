import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { RosterList } from '../../../components/RosterList';
import { fetchTeamBySlug, fetchTeamStats, fetchTeamMatches, fetchTeamPlayers } from '../../../api/teams.api';
import { usePlayersStore } from '../../../store/players.store';
import { ArrowLeft, Users, Trophy, Target, TrendUp } from '@phosphor-icons/react';
import { RecentActivityWidget } from '@/components/RecentActivityWidget';

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

export default function TeamDetail() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { openPlayerDrawer } = usePlayersStore();

    const [team, setTeam] = useState<TeamDetail | null>(null);
    const [stats, setStats] = useState<TeamStats | null>(null);
    const [matches, setMatches] = useState<Match[]>([]);
    const [teamPlayers, setTeamPlayers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!slug) return;

        const loadTeamData = async () => {
            setLoading(true);
            setError(null);
            try {
                // First fetch team by slug
                const teamRes = await fetchTeamBySlug(slug);
                setTeam(teamRes.data);

                // Then fetch stats, matches, and players using team ID
                const [statsRes, matchesRes, playersRes] = await Promise.all([
                    fetchTeamStats(teamRes.data.id).catch(() => ({ data: null })),
                    fetchTeamMatches(teamRes.data.id).catch(() => ({ data: [] })),
                    fetchTeamPlayers(teamRes.data.id).catch(() => ({ data: [] }))
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
                <Button onClick={() => navigate('/dashboard/teams')} style={{ marginTop: '1rem' }}>
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
                <button
                    onClick={() => navigate('/dashboard/teams')}
                    className="flex items-center gap-2 mb-4 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Teams
                </button>
                <h1 className="text-4xl font-bold text-foreground mb-2">
                    {team.name}
                </h1>
                <p className="text-muted-foreground">
                    {team.category} • {team.ageGroup} • {team.division} • {team.state}
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
                    {/* Roster */}
                    <Card>
                        <CardHeader>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <CardTitle>
                                        <div className="flex items-center gap-2">
                                            <Users className="w-5 h-5" />
                                            Roster
                                        </div>
                                    </CardTitle>
                                    <CardDescription>{teamPlayers.length} players</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <RosterList
                                players={teamPlayers}
                                onPlayerClick={openPlayerDrawer}
                            />
                        </CardContent>
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
                                                    {match.status}
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
