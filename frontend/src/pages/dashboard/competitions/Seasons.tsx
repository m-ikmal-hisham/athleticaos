import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Filter, Calendar, Users, Medal } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { getSeasons } from '@/api/seasons.api';
import { Season, SeasonLevel, SeasonStatus } from '@/types/season.types';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export const Seasons = () => {
    const navigate = useNavigate();
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterLevel, setFilterLevel] = useState<string>('ALL');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');

    useEffect(() => {
        loadSeasons();
    }, []);

    const loadSeasons = async () => {
        try {
            setLoading(true);
            const data = await getSeasons();
            setSeasons(data);
        } catch (error) {
            console.error('Failed to load seasons', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredSeasons = seasons.filter((season) => {
        if (filterLevel !== 'ALL' && season.level !== filterLevel) return false;
        if (filterStatus !== 'ALL' && season.status !== filterStatus) return false;
        return true;
    });

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

    return (
        <div className="space-y-6">
            <PageHeader
                title="Competitions & Seasons"
                description="Manage and review national, state, and age-grade rugby seasons."
                action={
                    <Button onClick={() => { }}>
                        <Plus className="w-4 h-4" />
                        New Season
                    </Button>
                }
            />

            {/* Filters */}
            <div className="flex gap-4 items-center bg-glass-bg p-4 rounded-xl border border-glass-border">
                <Filter className="w-5 h-5 text-muted" />
                <select
                    className="bg-transparent border-none focus:ring-0 text-sm font-medium"
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                >
                    <option value="ALL">All Levels</option>
                    {Object.values(SeasonLevel).map((level) => (
                        <option key={level} value={level}>
                            {level}
                        </option>
                    ))}
                </select>
                <div className="h-6 w-px bg-glass-border" />
                <select
                    className="bg-transparent border-none focus:ring-0 text-sm font-medium"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="ALL">All Statuses</option>
                    {Object.values(SeasonStatus).map((status) => (
                        <option key={status} value={status}>
                            {status}
                        </option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <LoadingSpinner />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredSeasons.map((season) => (
                        <Card
                            key={season.id}
                            className="cursor-pointer hover:border-primary-500/50 transition-colors group"
                            onClick={() => navigate(`/competitions/seasons/${season.id}`)}
                        >
                            <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-bold text-foreground group-hover:text-primary-500 transition-colors">
                                            {season.name}
                                        </h3>
                                        <p className="text-sm text-muted font-mono mt-1">{season.code}</p>
                                    </div>
                                    <Badge variant={getStatusColor(season.status)}>{season.status}</Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2 text-muted">
                                        <Medal className="w-4 h-4" />
                                        <span>{season.level}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted">
                                        <Calendar className="w-4 h-4" />
                                        <span>
                                            {season.startDate} - {season.endDate}
                                        </span>
                                    </div>
                                    {season.organiser && (
                                        <div className="flex items-center gap-2 text-muted col-span-2">
                                            <Users className="w-4 h-4" />
                                            <span>{season.organiser.name}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}

                    {filteredSeasons.length === 0 && (
                        <div className="col-span-full text-center py-12 text-muted">
                            No seasons found matching your filters.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
