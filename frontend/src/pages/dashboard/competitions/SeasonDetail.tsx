import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Calendar,
    Trophy,
    Users,
    Medal,
    ArrowLeft,
    Activity
} from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { getSeasonOverview } from '@/api/seasons.api';
import { SeasonOverview, SeasonStatus } from '@/types/season.types';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export const SeasonDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [season, setSeason] = useState<SeasonOverview | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            loadSeason(id);
        }
    }, [id]);

    const loadSeason = async (seasonId: string) => {
        try {
            setLoading(true);
            const data = await getSeasonOverview(seasonId);
            setSeason(data);
        } catch (error) {
            console.error('Failed to load season details', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: SeasonStatus) => {
        switch (status) {
            case SeasonStatus.ACTIVE:
                return 'success';
            case SeasonStatus.PLANNED:
                return 'info';
            case SeasonStatus.COMPLETED:
                return 'warning';
            case SeasonStatus.ARCHIVED:
                return 'default';
            default:
                return 'default';
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <LoadingSpinner />
            </div>
        );
    }

    if (!season) {
        return (
            <div className="text-center py-12 text-muted">
                Season not found.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/competitions')}
                className="mb-2"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Competitions
            </Button>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-3xl font-display font-bold text-foreground">
                            {season.name}
                        </h1>
                        <Badge variant={getStatusColor(season.status)}>{season.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-muted text-sm">
                        <span className="font-mono">{season.code}</span>
                        <span className="w-1 h-1 rounded-full bg-glass-border" />
                        <div className="flex items-center gap-1.5">
                            <Medal className="w-4 h-4" />
                            <span>{season.level}</span>
                        </div>
                        {season.startDate && season.endDate && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-glass-border" />
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4" />
                                    <span>{season.startDate} - {season.endDate}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <Button onClick={() => { }}>Edit Season</Button>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-3 text-muted mb-2">
                        <Trophy className="w-4 h-4" />
                        <span className="text-sm font-medium">Tournaments</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{season.totalTournaments}</p>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3 text-muted mb-2">
                        <Activity className="w-4 h-4" />
                        <span className="text-sm font-medium">Matches</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold text-foreground">{season.totalMatches}</p>
                        <span className="text-xs text-muted">({season.completedMatches} completed)</span>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3 text-muted mb-2">
                        <Users className="w-4 h-4" />
                        <span className="text-sm font-medium">Teams</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{season.totalTeams}</p>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3 text-muted mb-2">
                        <Users className="w-4 h-4" />
                        <span className="text-sm font-medium">Players</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{season.totalPlayers}</p>
                </Card>
            </div>

            {/* Tournaments List */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-foreground">Tournaments</h2>
                    <Button size="sm" onClick={() => { }}>
                        <Plus className="w-4 h-4" />
                        Add Tournament
                    </Button>
                </div>

                {/* TODO: Fetch tournaments for this season and display in table */}
                <div className="text-center py-8 text-muted text-sm">
                    Tournaments list will be implemented here.
                </div>
            </Card>
        </div>
    );
};

import { Plus } from 'lucide-react';
