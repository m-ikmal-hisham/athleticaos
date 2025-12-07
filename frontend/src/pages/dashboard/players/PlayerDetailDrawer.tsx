import { Fragment, useEffect, useState } from 'react';
import { X, TrendingUp, Award, Target } from 'lucide-react';
import { fetchPlayerById, fetchPlayerStats } from '../../../api/players.api';
import { Button } from '../../../components/Button';

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
    matchStats?: Array<{
        matchId: string;
        matchDate: string;
        opponent: string;
        points: number;
        tries: number;
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

    const handleViewStats = () => {
        window.location.href = `/dashboard/stats?playerId=${playerId}`;
    };

    return (
        <Fragment>
            {/* Backdrop */}
            <div
                className="drawer-overlay"
                onClick={onClose}
            />

            {/* Drawer Panel */}
            <div className="drawer-panel" style={{ position: 'fixed', overflowY: 'auto' }}>
                {/* Header */}
                <div className="drawer-header">
                    <h2 className="text-xl font-semibold text-foreground">Player Profile</h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-white/5"
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
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Stats Summary */}
                            {stats && (
                                <>
                                    <div className="glass-section">
                                        <h4 className="section-header-blue">Career Statistics</h4>
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
                                                <TrendingUp className="w-5 h-5 text-primary" />
                                                <div>
                                                    <p className="text-2xl font-bold text-foreground">
                                                        {stats.totalPoints}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">Points</p>
                                                </div>
                                            </div>
                                            <div className="stat-card">
                                                <Award className="w-5 h-5 text-primary" />
                                                <div>
                                                    <p className="text-2xl font-bold text-foreground">
                                                        {stats.tries}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">Tries</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="glass-section">
                                        <h4 className="section-header-blue">Breakdown</h4>
                                        <div className="space-y-2">
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
                                            {(stats.yellowCards > 0 || stats.redCards > 0) && (
                                                <>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Yellow Cards</span>
                                                        <span className="text-yellow-400 font-medium">{stats.yellowCards}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Red Cards</span>
                                                        <span className="text-red-400 font-medium">{stats.redCards}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Latest Matches */}
                                    {stats.matchStats && stats.matchStats.length > 0 && (
                                        <div className="glass-section">
                                            <h4 className="section-header-blue">Recent Matches</h4>
                                            <div className="space-y-3">
                                                {stats.matchStats.slice(0, 5).map((match, idx) => (
                                                    <div key={idx} className="match-row">
                                                        <div>
                                                            <p className="text-foreground font-medium">
                                                                vs {match.opponent}
                                                            </p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {new Date(match.matchDate).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-foreground font-bold">{match.points} pts</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {match.tries} tries
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Notes */}
                            {player.notes && (
                                <div className="glass-section">
                                    <h4 className="section-header-blue">Notes</h4>
                                    <p className="text-muted-foreground text-sm">{player.notes}</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="pt-4">
                                <Button onClick={handleViewStats} className="w-full">
                                    View Full Stats
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Fragment>
    );
};
