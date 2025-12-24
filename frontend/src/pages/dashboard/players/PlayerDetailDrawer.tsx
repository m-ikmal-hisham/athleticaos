import { Fragment, useEffect, useState } from 'react';
import { X, TrendUp, Medal, Target, Trash } from '@phosphor-icons/react';
import { fetchPlayerById, fetchPlayerStats } from '../../../api/players.api';
import { Button } from '../../../components/Button';
import { usePlayersStore } from '../../../store/players.store';
import { useAuthStore } from '../../../store/auth.store';
import { calculateAge } from '../../../utils/date';

interface PlayerDetailDrawerProps {
    playerId: string | null;
    isOpen: boolean;
    onClose: () => void;
}

interface PlayerStats {
    playerId: string;
    playerName: string;
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
    // Optional extended fields
    position?: string;
    jerseyNumber?: number;
    gender?: string;
    dateOfBirth?: string;
    notes?: string;
}

export const PlayerDetailDrawer = ({ playerId, isOpen, onClose }: PlayerDetailDrawerProps) => {
    const [player, setPlayer] = useState<PlayerDetail | null>(null);
    const [stats, setStats] = useState<PlayerStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const [isDeleting, setIsDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    const { deletePlayer } = usePlayersStore();
    const { user } = useAuthStore();
    const isAdmin = user?.roles?.some(r => ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN'].includes(r));

    const handleDeleteClick = () => {
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!playerId) return;
        setIsDeleting(true);
        try {
            await deletePlayer(playerId);
            // success is handled by closing drawer (logic in store or here)
            // But store logic closes drawer if active player is deleted.
            // We just need to ensure modal closes.
            setShowDeleteConfirm(false);
        } catch (err) {
            console.error('Failed to delete player:', err);
            // Optional: Show toast error
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        if (!isOpen) {
            // Only clear state when drawer is actually closed
            setPlayer(null);
            setStats(null);
            setError(null);
            setLoading(false);
            return;
        }

        if (!playerId) {
            return;
        }

        const abortController = new AbortController();
        let isMounted = true;

        const loadPlayerData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [playerRes, statsRes] = await Promise.all([
                    fetchPlayerById(playerId),
                    fetchPlayerStats(playerId).catch(() => ({ data: null })) // Stats might not exist
                ]);

                if (isMounted && !abortController.signal.aborted) {
                    setPlayer(playerRes.data);
                    setStats(statsRes.data);
                }
            } catch (err) {
                if (isMounted && !abortController.signal.aborted) {
                    setError('Failed to load player details');
                    console.error('Player load error:', err);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadPlayerData();

        return () => {
            isMounted = false;
            abortController.abort();
        };
    }, [playerId, isOpen]);

    if (!isOpen) return null;

    const getInitials = (firstName: string, lastName: string) => {
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    };

    return (
        <Fragment>
            {/* Backdrop */}
            <div
                className="drawer-overlay"
                onClick={onClose}
            />

            {/* Drawer Panel */}
            <div className="drawer-panel fixed overflow-y-auto">
                {/* Header */}
                <div className="drawer-header">
                    <h2 className="text-xl font-semibold text-foreground">Player Profile</h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-white/5"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="drawer-content">
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <p className="text-muted-foreground">Loading player details...</p>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-red-400">{error}</p>
                        </div>
                    )}

                    {!loading && !error && player && (
                        <div className="space-y-6">
                            {/* Avatar & Basic Info */}
                            <div className="flex items-start gap-4">
                                <div className="player-avatar">
                                    {getInitials(player.firstName, player.lastName)}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-2xl font-bold text-foreground">
                                        {player.firstName} {player.lastName}
                                    </h3>
                                    <p className="text-muted-foreground mt-1">{player.email}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`status-pill status-${player.status?.toLowerCase()}`}>
                                            {player.status || 'ACTIVE'}
                                        </span>
                                        {player.jerseyNumber && (
                                            <span className="text-sm text-muted-foreground">
                                                #{player.jerseyNumber}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Organisation & Team */}
                            <div className="glass-section">
                                <h4 className="section-header-blue">Organisation</h4>
                                <p className="text-foreground">{player.organisationName || '—'}</p>
                            </div>

                            {/* Teams */}
                            {player.teamNames && player.teamNames.length > 0 && (
                                <div className="glass-section">
                                    <h4 className="section-header-blue">Teams</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {player.teamNames.map((teamName, idx) => (
                                            <span key={idx} className="status-pill status-active">
                                                {teamName}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Optional Fields */}
                            {(player.position || player.gender || player.dateOfBirth) && (
                                <div className="glass-section">
                                    <h4 className="section-header-blue">Details</h4>
                                    <div className="space-y-2">
                                        {player.position && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Position</span>
                                                <span className="text-foreground">{player.position}</span>
                                            </div>
                                        )}
                                        {player.gender && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Gender</span>
                                                <span className="text-foreground">{player.gender}</span>
                                            </div>
                                        )}
                                        {player.dateOfBirth && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Date of Birth</span>
                                                <span className="text-foreground">
                                                    {new Date(player.dateOfBirth).toLocaleDateString()}
                                                    <span className="text-muted-foreground ml-2">
                                                        ({calculateAge(player.dateOfBirth)} yrs)
                                                    </span>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tabs Header */}
                            <div className="flex border-b border-border mb-6">
                                {['Overview', 'Matches', 'Stats'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab.toLowerCase())}
                                        className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === tab.toLowerCase()
                                            ? 'text-primary'
                                            : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        {tab}
                                        {activeTab === tab.toLowerCase() && (
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Tab Content */}
                            {stats ? (
                                <>
                                    {activeTab === 'overview' && (
                                        <div className="space-y-6">
                                            {/* Overview: Career Summary Cards */}
                                            <div className="stats-grid">
                                                <div className="stat-card">
                                                    <Target className="w-5 h-5 text-primary" />
                                                    <div>
                                                        <p className="text-2xl font-bold text-foreground">
                                                            {stats.totalMatches}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">Matches</p>
                                                    </div>
                                                </div>
                                                <div className="stat-card">
                                                    <TrendUp className="w-5 h-5 text-primary" />
                                                    <div>
                                                        <p className="text-2xl font-bold text-foreground">
                                                            {stats.totalPoints}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">Points</p>
                                                    </div>
                                                </div>
                                                <div className="stat-card">
                                                    <Medal className="w-5 h-5 text-primary" />
                                                    <div>
                                                        <p className="text-2xl font-bold text-foreground">
                                                            {stats.tries}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">Tries</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Overview: Latest Matches Preview */}
                                            {stats.recentMatches && stats.recentMatches.length > 0 && (
                                                <div className="glass-section">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h4 className="section-header-blue mb-0">Recent Matches</h4>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setActiveTab('matches')}
                                                            className="text-xs text-primary hover:text-primary/80 p-0 h-auto"
                                                        >
                                                            View All
                                                        </Button>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {stats.recentMatches.slice(0, 5).map((match, idx) => (
                                                            <div key={idx} className="match-row flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${match.result.startsWith('W') ? 'bg-green-500/20 text-green-400' :
                                                                            match.result.startsWith('D') ? 'bg-yellow-500/20 text-yellow-400' :
                                                                                'bg-red-500/20 text-red-400'
                                                                            }`}>
                                                                            {match.result.split(' ')[0]}
                                                                        </span>
                                                                        <p className="text-foreground font-medium text-sm">
                                                                            vs {match.opponentName}
                                                                        </p>
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                                        {new Date(match.matchDate).toLocaleDateString()}
                                                                    </p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-foreground font-bold text-sm">{match.points} pts</p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {match.tries} tries
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'matches' && (
                                        <div className="space-y-4">
                                            <div className="glass-section p-0 overflow-hidden">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-white/5 text-muted-foreground font-medium border-b border-white/5">
                                                        <tr>
                                                            <th className="p-3">Date</th>
                                                            <th className="p-3">Opponent</th>
                                                            <th className="p-3 text-center">Res</th>
                                                            <th className="p-3 text-center">Mins</th>
                                                            <th className="p-3 text-center">Pts</th>
                                                            <th className="p-3 text-center">T</th>
                                                            <th className="p-3 text-center">YC</th>
                                                            <th className="p-3 text-center">RC</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {stats.recentMatches.map((match, idx) => (
                                                            <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                                <td className="p-3 text-muted-foreground">
                                                                    {new Date(match.matchDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                                </td>
                                                                <td className="p-3 text-foreground font-medium">
                                                                    {match.opponentName}
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${match.result.startsWith('W') ? 'bg-green-500/20 text-green-400' :
                                                                        match.result.startsWith('D') ? 'bg-yellow-500/20 text-yellow-400' :
                                                                            'bg-red-500/20 text-red-400'
                                                                        }`}>
                                                                        {match.result.split(' ')[0]}
                                                                    </span>
                                                                </td>
                                                                <td className="p-3 text-center text-muted-foreground">{match.minutesPlayed}</td>
                                                                <td className="p-3 text-center text-foreground font-bold">{match.points}</td>
                                                                <td className="p-3 text-center text-muted-foreground">{match.tries}</td>
                                                                <td className="p-3 text-center">
                                                                    {match.yellowCards > 0 && <span className="text-yellow-400 font-bold">{match.yellowCards}</span>}
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    {match.redCards > 0 && <span className="text-red-400 font-bold">{match.redCards}</span>}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                {stats.recentMatches.length === 0 && (
                                                    <p className="p-6 text-center text-muted-foreground">No matches found.</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'stats' && (
                                        <div className="glass-section">
                                            <h4 className="section-header-blue">Detailed Breakdown</h4>
                                            <div className="space-y-3">
                                                <div className="flex justify-between p-2 hover:bg-white/5 rounded">
                                                    <span className="text-muted-foreground">Matches Played</span>
                                                    <span className="text-foreground font-medium">{stats.totalMatches}</span>
                                                </div>
                                                <div className="flex justify-between p-2 hover:bg-white/5 rounded">
                                                    <span className="text-muted-foreground">Tries Scored</span>
                                                    <span className="text-foreground font-medium">{stats.tries}</span>
                                                </div>
                                                <div className="flex justify-between p-2 hover:bg-white/5 rounded">
                                                    <span className="text-muted-foreground">Conversions</span>
                                                    <span className="text-foreground font-medium">{stats.conversions}</span>
                                                </div>
                                                <div className="flex justify-between p-2 hover:bg-white/5 rounded">
                                                    <span className="text-muted-foreground">Penalties</span>
                                                    <span className="text-foreground font-medium">{stats.penalties}</span>
                                                </div>
                                                <div className="flex justify-between p-2 hover:bg-white/5 rounded">
                                                    <span className="text-muted-foreground">Drop Goals</span>
                                                    <span className="text-foreground font-medium">{stats.dropGoals}</span>
                                                </div>
                                                <div className="border-t border-white/10 my-2"></div>
                                                <div className="flex justify-between p-2 hover:bg-white/5 rounded">
                                                    <span className="text-muted-foreground">Yellow Cards</span>
                                                    <span className="text-yellow-400 font-medium">{stats.yellowCards}</span>
                                                </div>
                                                <div className="flex justify-between p-2 hover:bg-white/5 rounded">
                                                    <span className="text-muted-foreground">Red Cards</span>
                                                    <span className="text-red-400 font-medium">{stats.redCards}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="p-8 text-center bg-white/5 rounded-lg border border-white/10">
                                    <p className="text-muted-foreground">No statistics available.</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="pt-4 flex gap-3">
                                {isAdmin && (
                                    <Button
                                        onClick={handleDeleteClick}
                                        variant="danger"
                                        className="w-full flex items-center justify-center gap-2"
                                        title="Delete Player"
                                    >
                                        <Trash className="w-4 h-4" /> Delete Player
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-background border border-border rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
                        <h3 className="text-lg font-semibold text-foreground">Delete Player</h3>
                        <p className="text-muted-foreground">
                            Are you sure you want to delete <strong>{player?.firstName} {player?.lastName}</strong>?
                            This action uses soft delete and can be audited.
                        </p>
                        <div className="flex justify-end gap-3 pt-2">
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
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </Fragment>
    );
};
