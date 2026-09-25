import { useEffect, useRef, useState } from 'react';
import { formatCompetitionType, formatTournamentLevel, formatGender, formatTournamentStatus } from '@/utils/formatters';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CalendarBlank, MapPin, Trophy, Users, Gear, Play, ListNumbers, TreeStructure, type Icon } from '@phosphor-icons/react';
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
import { SearchableSelect } from '@/components/SearchableSelect';
import ConfirmDeleteModal from '@/components/modals/ConfirmDeleteModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { deleteTournament } from '@/api/tournaments.api';
import TournamentRosters from './TournamentRosters';

export default function TournamentDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuthStore();

    const [tournament, setTournament] = useState<Tournament | null>(null);

    // formatCompetitionType removed

    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('overview');
    // The phone/tablet tab bar scrolls sideways; keep the active tab in view.
    const tabBarRef = useRef<HTMLElement>(null);
    useEffect(() => {
        const bar = tabBarRef.current;
        const active = bar?.querySelector<HTMLElement>('[aria-current="page"]');
        if (!bar || !active) return;
        bar.scrollTo({ left: active.offsetLeft - (bar.clientWidth - active.clientWidth) / 2, behavior: 'smooth' });
    }, [activeTab]);
    const [standings, setStandings] = useState<StandingsResponse[]>([]);
    const [bracket, setBracket] = useState<BracketViewResponse | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        variant: 'primary' as 'primary' | 'destructive',
        confirmText: 'Confirm'
    });

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
            const [data, dashboardData] = await Promise.all([
                tournamentService.getById(id),
                tournamentService.getDashboard(id).catch(e => {
                    console.error('Failed to load dashboard stats', e);
                    return null;
                })
            ]);
            setTournament(data);
            if (dashboardData && dashboardData.stats) {
                setStats(dashboardData.stats);
            }
        } catch (err) {
            console.error('Failed to load tournament:', err);
            setError('Failed to load tournament details');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = (newStatus: string) => {
        if (!tournament?.id) return;

        setConfirmModal({
            isOpen: true,
            title: `Change Status to ${newStatus}?`,
            message: `Are you sure you want to change the tournament status to ${newStatus}? This may affect visibility and team interactions.`,
            confirmText: 'Change Status',
            variant: 'primary',
            onConfirm: async () => {
                try {
                    setLoading(true);
                    await tournamentService.updateStatus(tournament.id, newStatus);
                    await loadTournament();
                } catch (err) {
                    console.error('Failed to update status:', err);
                    setError('Failed to update status');
                    setLoading(false);
                }
            }
        });
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

    const selectTab = (tabId: string) => {
        setActiveTab(tabId);
        navigate(`?tab=${tabId}`, { replace: true });
    };

    const tabs: { id: string; label: string; shortLabel?: string; icon: Icon }[] = [
        { id: 'overview', label: 'Overview', icon: Trophy },
        { id: 'teams', label: 'Teams', icon: Users },
        { id: 'format', label: 'Format & Stages', shortLabel: 'Format', icon: Gear },
        { id: 'matches', label: 'Matches', icon: Play },
        { id: 'standings', label: 'Standings', icon: ListNumbers },
        { id: 'bracket', label: 'Bracket', icon: TreeStructure },
        { id: 'rosters', label: 'Rosters', icon: Users },
    ];

    const isAdmin = user?.roles?.some(r => ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN'].includes(r));

    {/* Header */ }
    return (
        <div className="space-y-4 md:space-y-6">
            {/* Header */}
            <GlassCard className="p-4 md:p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-6">
                    <div className="min-w-0 w-full md:w-auto">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5 md:mb-2">
                            {tournament.seasonName && (
                                <Badge variant="outline" className="flex items-center gap-1 bg-white/50 dark:bg-black/50 backdrop-blur-sm border-primary-500/20 text-primary-700 dark:text-primary-300">
                                    <Trophy className="w-3 h-3" />
                                    {tournament.seasonName}
                                </Badge>
                            )}
                            <Badge variant={tournament.status === TournamentStatus.ONGOING ? 'primary' : 'secondary'} className="uppercase">
                                {formatTournamentStatus(tournament.status)}
                            </Badge>
                        </div>
                        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2 md:mb-3 tracking-tight leading-tight [overflow-wrap:anywhere]">
                            {tournament.name}
                        </h1>
                        {/* One wrapping row: on phones the three items used to take a line each with a wide gap */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-sm text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-1.5">
                                <CalendarBlank className="w-4 h-4 text-primary-400 shrink-0" />
                                <span>{new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0">
                                <MapPin className="w-4 h-4 text-primary-400 shrink-0" />
                                <span className="truncate">{tournament.venue}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Gear className="w-4 h-4 text-primary-400 shrink-0" />
                                <span>{formatTournamentLevel(tournament.level)} • {formatCompetitionType(tournament.competitionType)}</span>
                            </div>
                        </div>
                    </div>

                    {isAdmin && (
                        <div className="flex flex-wrap gap-2 md:gap-3 shrink-0">
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

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                variant={confirmModal.variant}
            />

            {/* Navigation Tabs. Below lg: the same blue icon-over-label bar as the public tournament
                page, pinned to the top of the scrolling <main> and scrolling sideways when the seven tabs
                do not fit. From lg: one row of equal-width tabs that always fits. */}
            <nav
                ref={tabBarRef}
                aria-label="Tabs"
                className="lg:hidden sticky top-0 z-20 flex overflow-x-auto gap-1 p-1.5 rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/25 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => selectTab(tab.id)}
                            aria-current={isActive ? 'page' : undefined}
                            className={`flex-1 min-w-[4.75rem] flex flex-col items-center gap-1 px-2 py-2 rounded-xl text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap transition-colors ${isActive ? 'bg-white/20 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
                        >
                            <Icon className="w-5 h-5" weight={isActive ? 'fill' : 'regular'} />
                            {tab.shortLabel ?? tab.label}
                        </button>
                    );
                })}
            </nav>
            <div className="hidden lg:block p-1.5 bg-white/40 dark:bg-black/40 backdrop-blur-md rounded-xl border border-white/20 dark:border-white/10 shadow-sm">
                <nav className="grid grid-cols-7 gap-1" aria-label="Tabs">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => selectTab(tab.id)}
                                className={`
                                    min-w-0 py-2.5 px-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-300
                                    ${isActive
                                        ? 'bg-blue-500/10 dark:bg-red-500/20 text-blue-700 dark:text-red-400 shadow-sm ring-1 ring-blue-500/20 dark:ring-red-500/20'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-slate-200'
                                    }
                                `}
                            >
                                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600 dark:text-red-400' : ''}`} />
                                <span className="truncate">{tab.label}</span>
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
                                    <Badge variant="outline" className="mt-2">{formatCompetitionType(tournament.competitionType) || 'Standard'}</Badge>
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
                                                    <Badge variant="outline" className="text-[10px] h-5 bg-white dark:bg-white/10 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10">
                                                        {formatGender(cat.gender)}
                                                    </Badge>
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
                                        <div className="text-2xl font-bold text-foreground mb-1">{stats?.totalTeams || 0}</div>
                                        <div className="text-xs text-slate-400 uppercase tracking-wider">Teams</div>
                                    </div>
                                    <div className="p-4 bg-black/5 dark:bg-white/5 rounded-xl text-center border border-black/5 dark:border-white/5">
                                        <div className="text-2xl font-bold text-foreground mb-1">{stats?.totalMatches || 0}</div>
                                        <div className="text-xs text-slate-400 uppercase tracking-wider">Matches</div>
                                    </div>
                                    <div className="p-4 bg-black/5 dark:bg-white/5 rounded-xl text-center border border-black/5 dark:border-white/5">
                                        <div className="text-2xl font-bold text-foreground mb-1">{stats?.totalGoals || 0}</div>
                                        <div className="text-xs text-slate-400 uppercase tracking-wider">Total Points</div>
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

                {activeTab === 'teams' && tournament && (
                    <TournamentTeams tournamentId={tournament.id} />
                )}

                {activeTab === 'format' && tournament && (
                    <TournamentFormat tournamentId={tournament.id} onScheduleGenerated={() => setActiveTab('matches')} />
                )}

                {activeTab === 'matches' && tournament && (
                    <TournamentMatches tournamentId={tournament.id} tournamentSlug={tournament.slug} />
                )}

                {activeTab === 'standings' && (
                    <div className="space-y-6">
                        <div className="flex justify-end">
                            <div className="w-64">
                                <SearchableSelect
                                    options={[{ value: '', label: 'All Categories' }, ...(tournament?.categories?.map(c => ({ value: c.id, label: c.name })) || [])]}
                                    value={selectedCategoryId || ''}
                                    onChange={(val) => setSelectedCategoryId(val ? String(val) : null)}
                                    placeholder="Filter by Category"
                                    className="bg-white dark:bg-slate-800"
                                />
                            </div>
                        </div>
                        <StandingsTable standings={standings.filter(s => !selectedCategoryId || s.categoryId === selectedCategoryId)} />
                    </div>
                )}

                {activeTab === 'bracket' && bracket && (
                    <div className="space-y-6">
                        <div className="flex justify-end">
                            <div className="w-64">
                                <SearchableSelect
                                    options={[{ value: '', label: 'All Categories' }, ...(tournament?.categories?.map(c => ({ value: c.id, label: c.name })) || [])]}
                                    value={selectedCategoryId || ''}
                                    onChange={(val) => setSelectedCategoryId(val ? String(val) : null)}
                                    placeholder="Filter by Category"
                                    className="bg-white dark:bg-slate-800"
                                />
                            </div>
                        </div>
                        <BracketView
                            stages={bracket.stages
                                .filter(s => !selectedCategoryId || s.stage.categoryId === selectedCategoryId)
                                .map(s => s.stage)}
                            matches={bracket.stages
                                .filter(s => !selectedCategoryId || s.stage.categoryId === selectedCategoryId)
                                .flatMap(s => s.matches)}
                        />
                    </div>
                )}

                {activeTab === 'rosters' && tournament && (
                    <TournamentRosters tournamentId={tournament.id} />
                )}
            </div>
        </div >
    );
}

