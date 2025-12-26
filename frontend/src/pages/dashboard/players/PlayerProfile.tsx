import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { PageHeader } from '@/components/PageHeader';
import { ArrowLeft, Target, TrendUp, Medal, Trash, PencilSimple } from '@phosphor-icons/react';
import { fetchPlayerById, fetchPlayerStats, deletePlayer } from '@/api/players.api';
import { useAuthStore } from '@/store/auth.store';
import { calculateAge } from '@/utils/date';
import toast from 'react-hot-toast';

interface PlayerStats {
    totalMatches: number;
    totalPoints: number;
    tries: number;
    conversions: number;
    penalties: number;
    dropGoals: number;
    yellowCards: number;
    redCards: number;
    recentMatches: Array<{
        matchId: string;
        matchDate: string;
        opponentName: string;
        result: string;
        tries: number;
        points: number;
        yellowCards: number;
        redCards: number;
        minutesPlayed: string;
    }>;
}

interface PlayerDetail {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
    role: string;
    organisationName?: string;
    teamNames?: string[];
    position?: string;
    jerseyNumber?: number;
    gender?: string;
    dateOfBirth?: string; // or dob
    dob?: string;
    notes?: string;
}

export const PlayerProfile = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const isAdmin = user?.roles?.some(r => ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN'].includes(r));

    const [player, setPlayer] = useState<PlayerDetail | null>(null);
    const [stats, setStats] = useState<PlayerStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const [playerRes, statsRes] = await Promise.all([
                    fetchPlayerById(id),
                    fetchPlayerStats(id).catch(() => ({ data: null }))
                ]);
                setPlayer(playerRes.data);
                setStats(statsRes.data);
            } catch (error) {
                console.error("Failed to load player profile", error);
                toast.error("Failed to load player profile");
                navigate('/dashboard/players');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id, navigate]);

    const handleConfirmDelete = async () => {
        if (!id) return;
        setIsDeleting(true);
        try {
            await deletePlayer(id);
            toast.success("Player deleted successfully");
            navigate('/dashboard/players');
        } catch (error) {
            console.error("Failed to delete player", error);
            toast.error("Failed to delete player");
            setIsDeleting(false);
            setShowDeleteConfirm(false); // Close modal on error to allow retry
        }
    };

    const getInitials = (firstName: string, lastName: string) => {
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    if (!player) return null;

    const dobValue = player.dob || player.dateOfBirth;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/players')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <PageHeader
                        title={`${player.firstName} ${player.lastName}`}
                        description="Player Profile & Stats"
                    />
                </div>
                {isAdmin && (
                    <div className="flex gap-2">
                        <Button onClick={() => navigate(`/dashboard/players/${id}/edit`)}>
                            <PencilSimple className="w-4 h-4 mr-2" />
                            Edit Profile
                        </Button>
                        <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                            <Trash className="w-4 h-4 mr-2" />
                            Delete
                        </Button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Profile Card */}
                <GlassCard className="lg:col-span-1 h-fit p-6 space-y-6">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-24 h-24 rounded-full bg-primary-500/10 text-primary-500 flex items-center justify-center text-3xl font-bold border border-primary-500/20 mb-4">
                            {getInitials(player.firstName, player.lastName)}
                        </div>
                        <h2 className="text-xl font-bold text-foreground">{player.firstName} {player.lastName}</h2>
                        <p className="text-muted-foreground text-sm">{player.email}</p>

                        <div className="flex items-center gap-2 mt-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${player.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                                    player.status === 'INACTIVE' ? 'bg-white/10 text-muted-foreground' :
                                        'bg-red-500/20 text-red-400'
                                }`}>
                                {player.status || 'ACTIVE'}
                            </span>
                            {player.jerseyNumber && (
                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-white/5 text-muted-foreground">
                                    #{player.jerseyNumber}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-white/10">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Organisation</p>
                            <p className="text-foreground">{player.organisationName || '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Teams</p>
                            <div className="flex flex-wrap gap-2">
                                {player.teamNames && player.teamNames.length > 0 ? (
                                    player.teamNames.map((team, idx) => (
                                        <span key={idx} className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-foreground">
                                            {team}
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">—</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 pt-6 border-t border-white/10">
                        {player.position && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Position</span>
                                <span className="text-foreground font-medium">{player.position}</span>
                            </div>
                        )}
                        {player.gender && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Gender</span>
                                <span className="text-foreground font-medium capitalize">{player.gender.toLowerCase()}</span>
                            </div>
                        )}
                        {dobValue && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Age</span>
                                <span className="text-foreground font-medium">{calculateAge(dobValue)} yrs</span>
                            </div>
                        )}
                    </div>
                </GlassCard>

                {/* Right Column: Stats & Tabs */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Tabs */}
                    <div className="flex border-b border-white/10">
                        {['Overview', 'Matches', 'Stats'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab.toLowerCase())}
                                className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === tab.toLowerCase()
                                    ? 'text-primary-500'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {tab}
                                {activeTab === tab.toLowerCase() && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
                                )}
                            </button>
                        ))}
                    </div>

                    {stats ? (
                        <>
                            {activeTab === 'overview' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <GlassCard className="p-6 flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                                <Target className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-2xl font-bold text-foreground">{stats.totalMatches}</p>
                                                <p className="text-sm text-muted-foreground">Matches</p>
                                            </div>
                                        </GlassCard>
                                        <GlassCard className="p-6 flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                                <TrendUp className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-2xl font-bold text-foreground">{stats.totalPoints}</p>
                                                <p className="text-sm text-muted-foreground">Points</p>
                                            </div>
                                        </GlassCard>
                                        <GlassCard className="p-6 flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                                <Medal className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-2xl font-bold text-foreground">{stats.tries}</p>
                                                <p className="text-sm text-muted-foreground">Tries</p>
                                            </div>
                                        </GlassCard>
                                    </div>

                                    {/* Recent Matches Table Preview */}
                                    <GlassCard className="p-6">
                                        <h3 className="text-lg font-semibold mb-4">Recent Matches</h3>
                                        <div className="space-y-4">
                                            {stats.recentMatches && stats.recentMatches.length > 0 ? (
                                                stats.recentMatches.slice(0, 5).map((match, idx) => (
                                                    <div key={idx} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                                                        <div>
                                                            <p className="font-medium text-foreground">vs {match.opponentName}</p>
                                                            <p className="text-xs text-muted-foreground">{new Date(match.matchDate).toLocaleDateString()}</p>
                                                        </div>
                                                        <div className="text-right flex items-center gap-4">
                                                            <span className={`text-xs font-bold px-2 py-1 rounded ${match.result.startsWith('W') ? 'bg-green-500/20 text-green-400' :
                                                                match.result.startsWith('D') ? 'bg-yellow-500/20 text-yellow-400' :
                                                                    'bg-red-500/20 text-red-400'
                                                                }`}>
                                                                {match.result}
                                                            </span>
                                                            <div>
                                                                <p className="text-sm font-bold text-foreground">{match.points} pts</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-muted-foreground text-sm">No recent matches found.</p>
                                            )}
                                        </div>
                                    </GlassCard>
                                </div>
                            )}

                            {activeTab === 'matches' && (
                                <GlassCard className="overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-white/5 text-muted-foreground font-medium border-b border-white/5">
                                            <tr>
                                                <th className="p-4">Date</th>
                                                <th className="p-4">Opponent</th>
                                                <th className="p-4 text-center">Result</th>
                                                <th className="p-4 text-center">Mins</th>
                                                <th className="p-4 text-center">Pts</th>
                                                <th className="p-4 text-center">T</th>
                                                <th className="p-4 text-center">YC</th>
                                                <th className="p-4 text-center">RC</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {stats.recentMatches.map((match, idx) => (
                                                <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                    <td className="p-4 text-muted-foreground">
                                                        {new Date(match.matchDate).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-4 text-foreground font-medium">
                                                        {match.opponentName}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className={`text-xs font-bold px-2 py-1 rounded ${match.result.startsWith('W') ? 'bg-green-500/20 text-green-400' :
                                                            match.result.startsWith('D') ? 'bg-yellow-500/20 text-yellow-400' :
                                                                'bg-red-500/20 text-red-400'
                                                            }`}>
                                                            {match.result.split(' ')[0]}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center text-muted-foreground">{match.minutesPlayed}</td>
                                                    <td className="p-4 text-center text-foreground font-bold">{match.points}</td>
                                                    <td className="p-4 text-center text-muted-foreground">{match.tries}</td>
                                                    <td className="p-4 text-center">{match.yellowCards > 0 ? <span className="text-yellow-400 font-bold">{match.yellowCards}</span> : '-'}</td>
                                                    <td className="p-4 text-center">{match.redCards > 0 ? <span className="text-red-400 font-bold">{match.redCards}</span> : '-'}</td>
                                                </tr>
                                            ))}
                                            {stats.recentMatches.length === 0 && (
                                                <tr>
                                                    <td colSpan={8} className="p-8 text-center text-muted-foreground">No stats record found.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </GlassCard>
                            )}

                            {activeTab === 'stats' && (
                                <GlassCard className="p-6">
                                    <h3 className="text-lg font-semibold mb-4">Detailed Statistics</h3>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">Matches Played</p>
                                            <p className="text-xl font-bold text-foreground">{stats.totalMatches}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">Tries Scored</p>
                                            <p className="text-xl font-bold text-foreground">{stats.tries}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">Conversions</p>
                                            <p className="text-xl font-bold text-foreground">{stats.conversions}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">Penalties</p>
                                            <p className="text-xl font-bold text-foreground">{stats.penalties}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">Drop Goals</p>
                                            <p className="text-xl font-bold text-foreground">{stats.dropGoals}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">Yellow Cards</p>
                                            <p className="text-xl font-bold text-yellow-400">{stats.yellowCards}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">Red Cards</p>
                                            <p className="text-xl font-bold text-red-500">{stats.redCards}</p>
                                        </div>
                                    </div>
                                </GlassCard>
                            )}
                        </>
                    ) : (
                        <GlassCard className="p-8 text-center">
                            <p className="text-muted-foreground">No matches played yet.</p>
                        </GlassCard>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <GlassCard className="max-w-md w-full p-6 space-y-6 border-red-500/20">
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-foreground">Delete Player</h3>
                            <p className="text-muted-foreground">
                                Are you sure you want to delete <strong>{player.firstName} {player.lastName}</strong>?
                                This action utilizes soft delete and can be audited by admins.
                            </p>
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Deleting...' : 'Delete Player'}
                            </Button>
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
};
