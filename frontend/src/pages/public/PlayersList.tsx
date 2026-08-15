import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { User, Shield, Trophy, MapPin, MagnifyingGlass } from '@phosphor-icons/react';
import { publicProfileApi, PublicPlayerDirectoryItem } from '../../api/public.api';
import { GlassCard } from '@/components/GlassCard';
import { SmartFilterPills } from '@/components/SmartFilterPills';

const POSITION_OPTIONS = [
    { id: 'all', label: 'All Positions' },
    { id: 'Prop', label: 'Prop' },
    { id: 'Hooker', label: 'Hooker' },
    { id: 'Lock', label: 'Lock' },
    { id: 'Flanker', label: 'Flanker' },
    { id: 'Number 8', label: 'Number 8' },
    { id: 'Scrum Half', label: 'Scrum Half' },
    { id: 'Fly Half', label: 'Fly Half' },
    { id: 'Centre', label: 'Centre' },
    { id: 'Wing', label: 'Wing' },
    { id: 'Fullback', label: 'Fullback' },
];

export default function PlayersList() {
    const [players, setPlayers] = useState<PublicPlayerDirectoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPosition, setSelectedPosition] = useState<string>('all');
    const [selectedState, setSelectedState] = useState<string>('all');

    useEffect(() => {
        loadPlayers();
    }, []);

    const loadPlayers = async () => {
        try {
            setLoading(true);
            const data = await publicProfileApi.getPlayers({ limit: 100 });
            setPlayers(data);
        } catch (error) {
            console.error('Failed to load players:', error);
        } finally {
            setLoading(false);
        }
    };

    // Extract unique states
    const availableStates = useMemo(() => {
        const states = new Set<string>();
        players.forEach(p => {
            if (p.state && p.state.trim()) {
                states.add(p.state.trim());
            }
        });
        return Array.from(states).sort();
    }, [players]);

    const filteredPlayers = useMemo(() => {
        return players.filter(player => {
            // Search filter
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const fullName = `${player.firstName} ${player.lastName}`.toLowerCase();
                const matchesName = fullName.includes(q);
                const matchesTeam = player.currentTeamName?.toLowerCase().includes(q);
                const matchesPos = player.position?.toLowerCase().includes(q);
                const matchesCity = player.city?.toLowerCase().includes(q);
                if (!matchesName && !matchesTeam && !matchesPos && !matchesCity) {
                    return false;
                }
            }

            // Position filter
            if (selectedPosition && selectedPosition !== 'all') {
                const pos = player.position?.toLowerCase() || '';
                const pos2 = player.position2?.toLowerCase() || '';
                const target = selectedPosition.toLowerCase();
                if (!pos.includes(target) && !pos2.includes(target)) {
                    return false;
                }
            }

            // State filter
            if (selectedState && selectedState !== 'all') {
                if (player.state?.toLowerCase() !== selectedState.toLowerCase()) {
                    return false;
                }
            }

            return true;
        });
    }, [players, searchQuery, selectedPosition, selectedState]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Players Directory
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                    Discover rugby players, squad members, and athlete profiles
                </p>
            </div>

            {/* Search & State Filter */}
            <div className="flex flex-col md:flex-row gap-4">
                {/* Search Input */}
                <div className="flex-1 relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search players by name, team, position, or city..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-900 dark:text-white placeholder-slate-400 text-sm"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* State Dropdown */}
                {availableStates.length > 0 && (
                    <div className="relative">
                        <select
                            value={selectedState}
                            onChange={(e) => setSelectedState(e.target.value)}
                            className="w-full md:w-44 px-3 py-2.5 rounded-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-900 dark:text-white text-sm cursor-pointer"
                        >
                            <option value="all">All States</option>
                            {availableStates.map(st => (
                                <option key={st} value={st}>{st}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Position Filter Pills */}
            <div className="overflow-x-auto pb-1">
                <SmartFilterPills
                    options={POSITION_OPTIONS}
                    selectedId={selectedPosition}
                    onSelect={(id) => setSelectedPosition(id || 'all')}
                />
            </div>

            {/* Results Count */}
            <div className="text-sm text-slate-600 dark:text-slate-400">
                Showing {filteredPlayers.length} of {players.length} players
            </div>

            {/* Players Grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div
                            key={i}
                            className="h-64 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl animate-pulse"
                        />
                    ))}
                </div>
            ) : filteredPlayers.length === 0 ? (
                <div className="text-center py-16 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50">
                    <User className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                    <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                        No players found
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                        Try adjusting your search query or position filter
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredPlayers.map(player => (
                        <Link
                            key={player.id}
                            to={`/players/${player.slug || player.id}`}
                            className="block group"
                        >
                            <GlassCard className="h-full relative overflow-hidden hover:border-blue-500/50 transition-all hover:shadow-xl hover:shadow-blue-500/10 p-5 flex flex-col justify-between space-y-4">
                                <div className="space-y-3.5">
                                    {/* Avatar & Jersey Number */}
                                    <div className="flex items-center justify-between">
                                        <div className="relative">
                                            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 p-0.5 shadow-md border border-slate-200/80 dark:border-slate-700/80 overflow-hidden flex items-center justify-center">
                                                {player.profilePictureUrl ? (
                                                    <img
                                                        src={player.profilePictureUrl}
                                                        alt={player.firstName}
                                                        className="w-full h-full object-cover rounded-full"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                                        }}
                                                    />
                                                ) : null}
                                                <div className={`w-full h-full rounded-full flex items-center justify-center text-slate-400 font-bold text-lg ${player.profilePictureUrl ? 'hidden' : ''}`}>
                                                    {player.firstName.charAt(0)}{player.lastName.charAt(0)}
                                                </div>
                                            </div>
                                            {player.jerseyNumber && (
                                                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-black flex items-center justify-center shadow-md ring-2 ring-white dark:ring-slate-800">
                                                    {player.jerseyNumber}
                                                </div>
                                            )}
                                        </div>

                                        {/* Position Badge */}
                                        {player.position && (
                                            <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">
                                                {player.position}
                                            </span>
                                        )}
                                    </div>

                                    {/* Name & Team */}
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                            {player.firstName} {player.lastName}
                                        </h3>
                                        {player.currentTeamName ? (
                                            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium mt-1 truncate">
                                                <Shield className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                                <span className="truncate">{player.currentTeamName}</span>
                                            </div>
                                        ) : player.organisationName ? (
                                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                                                {player.organisationName}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                                Independent Player
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer info */}
                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                    {player.tournamentCount > 0 ? (
                                        <div className="flex items-center gap-1">
                                            <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                                            <span>{player.tournamentCount} {player.tournamentCount === 1 ? 'Tournament' : 'Tournaments'}</span>
                                        </div>
                                    ) : (
                                        <span className="text-slate-400">AthleticaOS</span>
                                    )}
                                    {player.state && (
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            <span>{player.state}</span>
                                        </div>
                                    )}
                                </div>
                            </GlassCard>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
