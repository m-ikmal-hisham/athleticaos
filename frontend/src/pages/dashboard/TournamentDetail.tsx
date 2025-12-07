import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, MapPin, Trophy, Users, Settings, Play } from 'lucide-react';
import { tournamentService } from '@/services/tournamentService';
import { Tournament, TournamentStatus } from '@/types';
import { Button } from '@/components/Button';
import { SuspensionWidget } from '@/components/roster/SuspensionWidget';

// Tabs
import { TournamentTeams } from './tournament-tabs/TournamentTeams';
import { TournamentFormat } from './tournament-tabs/TournamentFormat';
import { TournamentMatches } from './tournament-tabs/TournamentMatches';

export default function TournamentDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('overview');

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
        { id: 'format', label: 'Format & Stages', icon: Settings },
        { id: 'matches', label: 'Matches', icon: Play },
    ];

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Link to="/dashboard/tournaments" className="hover:text-blue-600 dark:hover:text-blue-400">
                    Tournaments
                </Link>
                <span>/</span>
                <span className="text-slate-900 dark:text-white">{tournament.name}</span>
            </div>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                        {tournament.name}
                    </h1>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
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
                </div>
            </div>

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
                                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Age Group</h3>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{tournament.ageGroupLabel || 'Open'}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{tournament.isAgeGrade ? 'Restricted' : 'Unrestricted'}</p>
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
            </div>
        </div>
    );
}
