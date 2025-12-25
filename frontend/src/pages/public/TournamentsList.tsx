import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarBlank, MapPin, Trophy, MagnifyingGlass } from '@phosphor-icons/react';
import { publicTournamentApi, PublicTournamentSummary } from '../../api/public.api';
import { TournamentLogo } from '@/components/common/TournamentLogo';

export default function TournamentsList() {
    const [tournaments, setTournaments] = useState<PublicTournamentSummary[]>([]);
    const [filteredTournaments, setFilteredTournaments] = useState<PublicTournamentSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'upcoming' | 'completed'>('all');

    useEffect(() => {
        loadTournaments();
    }, []);

    useEffect(() => {
        filterTournaments();
    }, [tournaments, searchQuery, statusFilter]);

    const loadTournaments = async () => {
        try {
            const data = await publicTournamentApi.getTournaments();
            setTournaments(data);
        } catch (error) {
            console.error('Failed to load tournaments:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterTournaments = () => {
        let filtered = [...tournaments];

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(t =>
                t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.venue.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(t => {
                if (statusFilter === 'live') return t.live;
                if (statusFilter === 'upcoming') return !t.live && !t.completed;
                if (statusFilter === 'completed') return t.completed;
                return true;
            });
        }

        setFilteredTournaments(filtered);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Tournaments
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                    Browse all rugby tournaments across Malaysia
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search tournaments..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-900 dark:text-white placeholder-slate-400"
                    />
                </div>

                {/* Status Filter */}
                <div className="flex gap-2">
                    {(['all', 'live', 'upcoming', 'completed'] as const).map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${statusFilter === status
                                ? 'bg-blue-600 text-white'
                                : 'bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 hover:border-blue-500/50'
                                }`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results Count */}
            <div className="text-sm text-slate-600 dark:text-slate-400">
                Showing {filteredTournaments.length} of {tournaments.length} tournaments
            </div>

            {/* Tournaments Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div
                            key={i}
                            className="h-56 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl animate-pulse"
                        />
                    ))}
                </div>
            ) : filteredTournaments.length === 0 ? (
                <div className="text-center py-16 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50">
                    <Trophy className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                    <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                        No tournaments found
                    </p>
                    <p className="text-slate-600 dark:text-slate-400">
                        Try adjusting your filters or search query
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTournaments.map(tournament => (
                        <Link
                            key={tournament.id}
                            to={`/tournaments/${tournament.slug || tournament.id}`}
                            className="group relative overflow-hidden rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 hover:border-blue-500/50 transition-all hover:shadow-xl hover:shadow-blue-500/10"
                        >
                            <div className="p-6 space-y-4">
                                {/* Status Badge */}
                                <div className="flex items-center gap-2">
                                    {tournament.live && (
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium">
                                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                            LIVE
                                        </div>
                                    )}
                                    {tournament.completed && (
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700/30 text-slate-700 dark:text-slate-300 text-xs font-medium">
                                            COMPLETED
                                        </div>
                                    )}
                                    {!tournament.live && !tournament.completed && (
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                                            UPCOMING
                                        </div>
                                    )}
                                </div>

                                {/* Tournament Info */}
                                {/* Tournament Info & Logo */}
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                                            {tournament.name}
                                        </h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                            {tournament.level}
                                            {tournament.competitionType && ` • ${tournament.competitionType}`}
                                        </p>
                                        {tournament.seasonName && (
                                            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                                                {tournament.seasonName}
                                            </p>
                                        )}
                                    </div>
                                    {(tournament.logoUrl || tournament.organiserBranding?.logoUrl) && (
                                        <div className="w-12 h-12 flex-shrink-0 bg-white dark:bg-slate-700/50 rounded-lg p-1 border border-slate-200 dark:border-slate-700 overflow-hidden">
                                            <TournamentLogo
                                                tournamentId={tournament.id}
                                                logoUrl={tournament.logoUrl || tournament.organiserBranding?.logoUrl}
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Details */}
                                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                    <div className="flex items-center gap-2">
                                        <CalendarBlank className="w-4 h-4 flex-shrink-0" />
                                        <span className="truncate">
                                            {new Date(tournament.startDate).toLocaleDateString()} -{' '}
                                            {new Date(tournament.endDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 flex-shrink-0" />
                                        <span className="truncate">{tournament.venue}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Hover Effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-600/0 group-hover:from-blue-500/5 group-hover:to-blue-600/10 transition-all" />
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
