import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MagnifyingGlass } from '@phosphor-icons/react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card, CardContent } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { StatusPill } from '@/components/StatusPill';
import { getSeasons } from '@/api/seasons.api';
import { Season, SeasonLevel, SeasonStatus } from '@/types/season.types';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export const Seasons = () => {
    const navigate = useNavigate();
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterLevel, setFilterLevel] = useState<string>('ALL');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');

    useEffect(() => {
        loadSeasons();
    }, []);

    const loadSeasons = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getSeasons();
            setSeasons(data);
        } catch (err: any) {
            console.error('Failed to load seasons', err);
            if (err.response?.status === 403) {
                setError('You do not have permission to view seasons. Please contact your administrator.');
            } else if (err.response?.status === 401) {
                setError('Your session has expired. Please log in again.');
            } else {
                setError('Failed to load seasons. Please try again later.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Apply search and filters
    const filteredSeasons = seasons.filter((season) => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesSearch = season.name.toLowerCase().includes(query) ||
                season.code?.toLowerCase().includes(query) ||
                season.level?.toLowerCase().includes(query);
            if (!matchesSearch) return false;
        }

        // Dropdown filters
        if (filterLevel !== 'ALL' && season.level !== filterLevel) return false;
        if (filterStatus !== 'ALL' && season.status !== filterStatus) return false;

        return true;
    });

    return (
        <div className="space-y-6">
            <PageHeader
                title="Competitions & Seasons"
                description="Manage and review national, state, and age-grade rugby seasons."
                action={
                    <Button onClick={() => { }}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Season
                    </Button>
                }
            />

            <Card>
                <CardContent className="p-0">
                    {/* Search Box */}
                    <div className="p-4 border-b border-glass-border">
                        <div className="relative">
                            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                            <Input
                                placeholder="Search by name, code, or level..."
                                className="pl-9 bg-glass-bg/50"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="p-4 border-b border-glass-border grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <select
                            className="input-base w-full cursor-pointer"
                            value={filterLevel}
                            onChange={(e) => setFilterLevel(e.target.value)}
                            aria-label="Filter by Level"
                        >
                            <option value="ALL">All Levels</option>
                            {Object.values(SeasonLevel).map((level) => (
                                <option key={level} value={level}>
                                    {level}
                                </option>
                            ))}
                        </select>

                        <select
                            className="input-base w-full cursor-pointer"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            aria-label="Filter by Status"
                        >
                            <option value="ALL">All Statuses</option>
                            {Object.values(SeasonStatus).map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={loadSeasons}
                                className="mt-2"
                            >
                                Try Again
                            </Button>
                        </div>
                    )}

                    {loading && (
                        <div className="flex justify-center py-12">
                            <LoadingSpinner />
                        </div>
                    )}

                    {!loading && !error && filteredSeasons.length === 0 && (
                        <p className="p-4 text-muted-foreground">No seasons found</p>
                    )}

                    {!loading && filteredSeasons.length > 0 && (
                        <div className="w-full overflow-auto">
                            <table className="glass-table w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border/60 text-muted-foreground text-sm">
                                        <th className="p-4 font-medium">Name</th>
                                        <th className="p-4 font-medium">Code</th>
                                        <th className="p-4 font-medium">Level</th>
                                        <th className="p-4 font-medium">Period</th>
                                        <th className="p-4 font-medium">Organiser</th>
                                        <th className="p-4 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSeasons.map((season) => (
                                        <tr
                                            key={season.id}
                                            onClick={() => navigate(`/dashboard/competitions/seasons/${season.id}`)}
                                            className="border-b border-border/40 hover:bg-muted/30 transition-colors cursor-pointer"
                                        >
                                            <td className="p-4 font-medium">{season.name}</td>
                                            <td className="p-4 text-muted-foreground font-mono text-sm">{season.code}</td>
                                            <td className="p-4">
                                                <Badge variant="secondary">{season.level}</Badge>
                                            </td>
                                            <td className="p-4 text-sm text-muted-foreground">
                                                {season.startDate} - {season.endDate}
                                            </td>
                                            <td className="p-4 text-sm">{season.organiser?.name || '-'}</td>
                                            <td className="p-4">
                                                <StatusPill status={season.status} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
