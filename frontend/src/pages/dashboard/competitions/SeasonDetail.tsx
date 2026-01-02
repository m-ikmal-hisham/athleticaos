import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSeasonById, updateSeasonStatus, getTournamentsBySeason, getSeasonOverview } from '@/api/seasons.api';
import { Season, SeasonOverview } from '@/types/season.types';
import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/Badge';
import { ArrowLeft, Trophy, CalendarBlank, ArrowSquareOut, Plus, PencilSimple } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { formatDate } from '@/utils/date';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export const SeasonDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [season, setSeason] = useState<Season | null>(null);
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [stats, setStats] = useState<SeasonOverview | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const [seasonRes, tournamentsRes, overviewRes] = await Promise.all([
                getSeasonById(id),
                getTournamentsBySeason(id),
                getSeasonOverview(id)
            ]);
            setSeason(seasonRes);
            setTournaments(tournamentsRes);
            setStats(overviewRes);
        } catch (error) {
            console.error('Failed to load season details:', error);
            toast.error("Failed to load season details");
            navigate('/dashboard/competitions');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!season) return;
        try {
            const updated = await updateSeasonStatus(season.id, newStatus);
            setSeason(updated);
            toast.success(`Season status updated to ${newStatus}`);
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    if (!season) return null;

    const breadcrumbs = [
        { label: 'Competitions', path: '/dashboard/competitions' },
        { label: season.name }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Breadcrumbs items={breadcrumbs} />
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/competitions')}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <PageHeader
                    title={season.name}
                    description={`Season Code: ${season.code}`}
                />
                <div className="ml-auto flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/dashboard/competitions/seasons/${season.id}/edit`)}>
                        <PencilSimple className="w-4 h-4 mr-2" />
                        Edit Season
                    </Button>
                    {season.status === 'PLANNED' && (
                        <Button size="sm" onClick={() => handleStatusChange('ACTIVE')}>Activate Season</Button>
                    )}
                    {season.status === 'ACTIVE' && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange('COMPLETED')}>Complete Season</Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    <GlassCard className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Status</p>
                                <Badge
                                    variant={
                                        season.status === 'ACTIVE' ? 'success' :
                                            season.status === 'COMPLETED' ? 'default' : 'warning'
                                    }
                                >
                                    {season.status}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Start Date</p>
                                <div className="flex items-center gap-2">
                                    <CalendarBlank className="w-4 h-4 text-primary-500" />
                                    <span>{season.startDate ? formatDate(season.startDate) : 'TBD'}</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">End Date</p>
                                <div className="flex items-center gap-2">
                                    <CalendarBlank className="w-4 h-4 text-primary-500" />
                                    <span>{season.endDate ? formatDate(season.endDate) : 'TBD'}</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Tournaments</p>
                                <div className="flex items-center gap-2">
                                    <Trophy className="w-4 h-4 text-primary-500" />
                                    <span>{tournaments.length}</span>
                                </div>
                            </div>
                        </div>

                        {season.description && (
                            <div className="mt-6 pt-6 border-t border-white/10">
                                <h3 className="text-sm font-medium mb-2">Description</h3>
                                <p className="text-sm text-muted-foreground">{season.description}</p>
                            </div>
                        )}
                    </GlassCard>

                    {/* Linked Tournaments */}
                    <GlassCard className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-primary-500" />
                                Tournaments
                            </h3>
                            <Button size="sm" variant="ghost" onClick={() => navigate('/dashboard/tournaments/new')}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Tournament
                            </Button>
                        </div>

                        {tournaments.length > 0 ? (
                            <div className="relative overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="text-xs uppercase bg-black/5 dark:bg-white/5 text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-3 rounded-l-lg">Name</th>
                                            <th className="px-4 py-3">Dates</th>
                                            <th className="px-4 py-3">Level</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3 rounded-r-lg"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tournaments.map((tournament) => (
                                            <tr key={tournament.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 font-medium cursor-pointer" onClick={() => navigate(`/dashboard/tournaments/${tournament.id}`)}>
                                                    {tournament.name}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline">{tournament.level}</Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant={tournament.status === 'Ongoing' ? 'success' : 'default'}>
                                                        {tournament.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/tournaments/${tournament.id}`)}>
                                                        <ArrowSquareOut className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                No tournaments linked to this season yet.
                            </div>
                        )}
                    </GlassCard>
                </div>

                {/* Sidebar / Stats */}
                <div className="space-y-6">
                    <GlassCard className="p-6">
                        <h3 className="text-sm font-semibold text-primary-500 uppercase tracking-wider mb-4">Season Stats</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Total Matches</span>
                                <span className="font-medium">{stats?.totalMatches ?? '-'}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Total Teams</span>
                                <span className="font-medium">{stats?.totalTeams ?? '-'}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Total Players</span>
                                <span className="font-medium">{stats?.totalPlayers ?? '-'}</span>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};
