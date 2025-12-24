import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CalendarBlank, MapPin, Trophy, Users, Gear, Play, ListNumbers, TreeStructure } from '@phosphor-icons/react';
import { tournamentService } from '@/services/tournamentService';
import { Tournament, TournamentStatus } from '@/types';
import { Button } from '@/components/Button';
import { SuspensionWidget } from '@/components/roster/SuspensionWidget';

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

    {/* Header */ }
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                        {tournament.name}
                    </h1>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                            <CalendarBlank className="w-4 h-4" />
                            {new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {tournament.venue}
                        </div>
                        {tournament.seasonName && (
                            <div className="flex items-center gap-1">
                                <Trophy className="w-4 h-4" />
                                {tournament.seasonName}
                            </div>
                        )}
                        <div className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
                            {tournament.status}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    {tournament.status === TournamentStatus.DRAFT && (
                        <Button size="sm" onClick={() => handleStatusChange('PUBLISHED')}>Publish</Button>
                    )}
                    {tournament.status === TournamentStatus.UPCOMING && (
                        <Button size="sm" onClick={() => handleStatusChange('LIVE')}>Start Tournament</Button>
                    )}
                    {tournament.status === TournamentStatus.ONGOING && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange('COMPLETED')}>End Tournament</Button>
                    )}
                    <Button
                        size="sm"
                        variant="cancel"
                        className="text-red-500 hover:text-red-400 border-red-500/20 hover:bg-red-500/10"
                        onClick={() => setIsDeleteModalOpen(true)}
                    >
                        Delete
                    </Button>
                </div>
            </div>

            <ConfirmDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteTournament}
                title="Delete Tournament"
                message={`Are you sure you want to delete "${tournament.name}"? This action cannot be undone and will remove all matches, teams, and stats associated with this tournament.`}
                isDeleting={isDeleting}
            />

            {/* Navigation Tabs */}
            <div className="border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
                <nav className="flex space-x-8" aria-label="Tabs">
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
                                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                                    ${isActive
                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                                    }
                                `}
                            >
                                <Icon className="w-4 h-4" />
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
                        {/* Overview Content similar to before */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-6 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Competition</h3>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{tournament.level}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{tournament.competitionType || 'Standard'}</p>
                                </div>
                                <div className="p-6 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Divisions / Categories</h3>
                                    {tournament.categories && tournament.categories.length > 0 ? (
                                        <div className="space-y-2">
                                            {tournament.categories.map(cat => (
                                                <div key={cat.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-2 rounded text-sm">
                                                    <span className="font-semibold">{cat.name}</span>
                                                    <span className="text-xs text-muted-foreground">{cat.gender}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{tournament.ageGroupLabel || 'Open'}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{tournament.isAgeGrade ? 'Restricted' : 'Unrestricted'}</p>
                                        </>
                                    )}
                                </div>
                            </div>
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
