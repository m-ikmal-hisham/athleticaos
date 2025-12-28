import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CalendarBlank, MapPin, Trophy, Users, Gear, Play, ListNumbers, TreeStructure } from '@phosphor-icons/react';
import { tournamentService } from '@/services/tournamentService';
import { Tournament, TournamentStatus } from '@/types';
import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { Badge } from '@/components/Badge';
import { SuspensionWidget } from '@/components/roster/SuspensionWidget';
import { useAuthStore } from '@/store/auth.store';

// Tabs
import { TournamentTeams } from './tournament-tabs/TournamentTeams';
import { TournamentFormat } from './tournament-tabs/TournamentFormat';
import { TournamentMatches } from './tournament-tabs/TournamentMatches';
import StandingsTable from '@/components/content/StandingsTable';
import BracketView from '@/components/content/BracketView';
import { BracketViewResponse, StandingsResponse } from '@/types';
// Removed unused lucide import
import ConfirmDeleteModal from '@/components/modals/ConfirmDeleteModal';
import { deleteTournament } from '@/api/tournaments.api';

export default function TournamentDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuthStore();

    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [standings, setStandings] = useState<StandingsResponse[]>([]);
    const [bracket, setBracket] = useState<BracketViewResponse | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (id) {
            loadTournament();
            // Simple query param handling for deep linking tabs
            const params = new URLSearchParams(location.search);
            const tabParam = params.get('tab');
            if (tabParam) {
                setActiveTab(tabParam);
            }
        }
    }, [id, location.search]);

    const loadStandings = async () => {
        if (!id) return;
        try {
            const data = await tournamentService.getStandings(id);
            setStandings(data);
        } catch (err) {
            console.error('Failed to load standings', err);
        }
    };

    const loadBracket = async () => {
        if (!id) return;
        try {
            const data = await tournamentService.getBracket(id);
            setBracket(data);
        } catch (err) {
            console.error('Failed to load bracket', err);
        }
    };

    useEffect(() => {
        if (activeTab === 'standings') {
            loadStandings();
        } else if (activeTab === 'bracket') {
            loadBracket();
        }
    }, [activeTab, id]);

    const loadTournament = async () => {
        if (!id) return;

        try {
            setLoading(true);
            const data = await tournamentService.getById(id);
            setTournament(data);
        } catch (err) {
            console.error('Failed to load tournament:', err);
            setError('Failed to load tournament details');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!tournament?.id) return;
        if (!confirm(`Are you sure you want to change status to ${newStatus}?`)) return;

        try {
            setLoading(true);
            await tournamentService.updateStatus(tournament.id, newStatus);
            await loadTournament();
        } catch (err) {
            console.error('Failed to update status:', err);
            setError('Failed to update status');
            setLoading(false);
        }
    };

    const handleDeleteTournament = async () => {
        if (!tournament?.id) return;

        try {
            setIsDeleting(true);
            await deleteTournament(tournament.id);
            navigate('/dashboard/tournaments');
        } catch (err) {
            console.error('Failed to delete tournament:', err);
            // Ideally show toast here
            setError('Failed to delete tournament');
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 text-center text-slate-500">Loading tournament...</div>
        );
    }

    if (error || !tournament) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-500 mb-4">{error || 'Tournament not found'}</p>
                <Button onClick={() => navigate('/dashboard/tournaments')}>
                    Back to Tournaments
                </Button>
            </div>
        );
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Trophy },
        { id: 'teams', label: 'Teams', icon: Users },
        { id: 'format', label: 'Format & Stages', icon: Gear },
        { id: 'matches', label: 'Matches', icon: Play },
        { id: 'standings', label: 'Standings', icon: ListNumbers },
        { id: 'bracket', label: 'Bracket', icon: TreeStructure },
    ];

    const isAdmin = user?.roles?.some(r => ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN'].includes(r));

    {/* Header */ }
    return (
        <div className="space-y-6">
            {/* Header */}
            <GlassCard className="p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            {tournament.seasonName && (
                                <Badge variant="secondary" className="flex items-center gap-1">
                                    <Trophy className="w-3 h-3" />
                                    {tournament.seasonName}
                                </Badge>
                            )}
                            <Badge variant={tournament.status === TournamentStatus.ONGOING ? 'primary' : 'secondary'} className="uppercase">
                                {tournament.status}
                            </Badge>
                        </div>
                        <h1 className="text-4xl font-bold text-foreground mb-4 tracking-tight">
                            {tournament.name}
                        </h1>
                        <div className="flex flex-wrap items-center gap-6 text-sm text-slate-400">
                            <div className="flex items-center gap-2">
                                <CalendarBlank className="w-4 h-4 text-primary-400" />
                                <span>{new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-primary-400" />
                                <span>{tournament.venue}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Gear className="w-4 h-4 text-primary-400" />
                                <span>{tournament.level} • {tournament.competitionType}</span>
                            </div>
                        </div>
                    </div>

                    {isAdmin && (
                        <div className="flex gap-3">
                            {tournament.status === TournamentStatus.DRAFT && (
                                <Button onClick={() => handleStatusChange('PUBLISHED')}>Publish</Button>
                            )}
                            {tournament.status === TournamentStatus.UPCOMING && (
                                <Button onClick={() => handleStatusChange('LIVE')} className="gap-2">
                                    <Play className="w-4 h-4" weight="fill" />
                                    Start Tournament
                                </Button>
                            )}
                            {tournament.status === TournamentStatus.ONGOING && (
                                <Button variant="outline" onClick={() => handleStatusChange('COMPLETED')}>End Tournament</Button>
                            )}
                            <Button
                                variant="danger"
                                className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border-red-500/20"
                                onClick={() => setIsDeleteModalOpen(true)}
                            >
                                Delete
                            </Button>
                        </div>
                    )}
                </div>
            </GlassCard>

            <ConfirmDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteTournament}
                title="Delete Tournament"
                message={`Are you sure you want to delete "${tournament.name}"? This action cannot be undone and will remove all matches, teams, and stats associated with this tournament.`}
                isDeleting={isDeleting}
            />

            {/* Navigation Tabs */}
            <div className="flex space-x-1 p-1 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/10 w-full overflow-x-auto">
                <nav className="flex space-x-1 w-full" aria-label="Tabs">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    navigate(`?tab=${tab.id}`, { replace: true });
                                }}
                                className={`
                                    flex-1 min-w-[120px] py-2.5 px-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all duration-300
                                    ${isActive
                                        ? 'bg-white dark:bg-white/10 text-primary-600 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
                                    }
                                `}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? 'text-primary-500 dark:text-primary-400' : ''}`} />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Overview Content */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <GlassCard className="p-6 flex flex-col items-center justify-center text-center">
                                    <div className="w-12 h-12 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center mb-4">
                                        <Trophy className="w-6 h-6" weight="fill" />
                                    </div>
                                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Competition Level</h3>
                                    <p className="text-2xl font-bold text-foreground">{tournament.level}</p>
                                    <Badge variant="outline" className="mt-2">{tournament.competitionType || 'Standard'}</Badge>
                                </GlassCard>

                                <GlassCard className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Categories</h3>
                                        <Users className="w-5 h-5 text-primary-400" />
                                    </div>

                                    {tournament.categories && tournament.categories.length > 0 ? (
                                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                            {tournament.categories.map(cat => (
                                                <div key={cat.id} className="flex justify-between items-center bg-black/5 dark:bg-white/5 p-2 rounded-lg text-sm border border-black/5 dark:border-white/5">
                                                    <span className="font-semibold text-foreground">{cat.name}</span>
                                                    <Badge variant="secondary" className="text-[10px] h-5">{cat.gender}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-24 text-center">
                                            <p className="text-xl font-bold text-foreground">{tournament.ageGroupLabel || 'Open'}</p>
                                            <p className="text-xs text-slate-500 mt-1">{tournament.isAgeGrade ? 'Age Restricted' : 'Unrestricted Entry'}</p>
                                        </div>
                                    )}
                                </GlassCard>
                            </div>

                            {/* Additional Stats or Info could go here */}
                            <GlassCard className="p-6">
                                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                                    <ListNumbers className="w-5 h-5 text-primary-400" />
                                    Tournament Stats
                                </h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-4 bg-black/5 dark:bg-white/5 rounded-xl text-center border border-black/5 dark:border-white/5">
                                        <div className="text-2xl font-bold text-foreground mb-1">--</div>
                                        <div className="text-xs text-slate-400 uppercase tracking-wider">Teams</div>
                                    </div>
                                    <div className="p-4 bg-black/5 dark:bg-white/5 rounded-xl text-center border border-black/5 dark:border-white/5">
                                        <div className="text-2xl font-bold text-foreground mb-1">--</div>
                                        <div className="text-xs text-slate-400 uppercase tracking-wider">Matches</div>
                                    </div>
                                    <div className="p-4 bg-black/5 dark:bg-white/5 rounded-xl text-center border border-black/5 dark:border-white/5">
                                        <div className="text-2xl font-bold text-foreground mb-1">--</div>
                                        <div className="text-xs text-slate-400 uppercase tracking-wider">Goals</div>
                                    </div>
                                </div>
                            </GlassCard>
                        </div>

                        {/* Recent Suspensions Widget */}
                        <div className="space-y-6">
                            <SuspensionWidget tournamentId={id!} />
                        </div>
                    </div>
                )}

                {activeTab === 'teams' && id && (
                    <TournamentTeams tournamentId={id} />
                )}

                {activeTab === 'format' && id && (
                    <TournamentFormat tournamentId={id} onScheduleGenerated={() => setActiveTab('matches')} />
                )}

                {activeTab === 'matches' && id && (
                    <TournamentMatches tournamentId={id} />
                )}

                {activeTab === 'standings' && (
                    <div className="space-y-6">
                        <StandingsTable standings={standings} />
                    </div>
                )}

                {activeTab === 'bracket' && bracket && (
                    <BracketView stages={bracket.stages.map(s => s.stage)} matches={bracket.stages.flatMap(s => s.matches)} />
                )}
            </div>
        </div >
    );
}
