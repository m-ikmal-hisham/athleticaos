import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, Trophy, MapPin, MagnifyingGlass } from '@phosphor-icons/react';
import { publicProfileApi, PublicTeamDirectoryItem } from '../../api/public.api';
import { GlassCard } from '@/components/GlassCard';
import { SmartFilterPills } from '@/components/SmartFilterPills';

const CATEGORY_OPTIONS = [
    { id: 'all', label: 'All Categories' },
    { id: 'MENS', label: "Men's" },
    { id: 'WOMENS', label: "Women's" },
    { id: 'MIXED', label: 'Mixed' },
    { id: 'BOYS', label: 'Boys' },
    { id: 'GIRLS', label: 'Girls' },
];

export default function TeamsList() {
    const [teams, setTeams] = useState<PublicTeamDirectoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedState, setSelectedState] = useState<string>('all');

    useEffect(() => {
        loadTeams();
    }, []);

    const loadTeams = async () => {
        try {
            setLoading(true);
            const data = await publicProfileApi.getTeams();
            setTeams(data);
        } catch (error) {
            console.error('Failed to load teams:', error);
        } finally {
            setLoading(false);
        }
    };

    // Extract unique states for filter dropdown
    const availableStates = useMemo(() => {
        const states = new Set<string>();
        teams.forEach(t => {
            if (t.state && t.state.trim()) {
                states.add(t.state.trim());
            }
        });
        return Array.from(states).sort();
    }, [teams]);

    const filteredTeams = useMemo(() => {
        return teams.filter(team => {
            // Search query filter
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchesName = team.name.toLowerCase().includes(q);
                const matchesShortName = team.shortName?.toLowerCase().includes(q);
                const matchesOrg = team.organisationName?.toLowerCase().includes(q);
                const matchesState = team.state?.toLowerCase().includes(q);
                if (!matchesName && !matchesShortName && !matchesOrg && !matchesState) {
                    return false;
                }
            }

            // Category filter
            if (selectedCategory && selectedCategory !== 'all') {
                if (team.category?.toUpperCase() !== selectedCategory.toUpperCase()) {
                    return false;
                }
            }

            // State filter
            if (selectedState && selectedState !== 'all') {
                if (team.state?.toLowerCase() !== selectedState.toLowerCase()) {
                    return false;
                }
            }

            return true;
        });
    }, [teams, searchQuery, selectedCategory, selectedState]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Teams & Clubs
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                    Explore rugby teams, clubs, and academies across Malaysia
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search teams by name, short name, club, or state..."
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

            {/* Category Pills */}
            <div className="overflow-x-auto pb-1">
                <SmartFilterPills
                    options={CATEGORY_OPTIONS}
                    selectedId={selectedCategory}
                    onSelect={(id) => setSelectedCategory(id || 'all')}
                />
            </div>

            {/* Results Count */}
            <div className="text-sm text-slate-600 dark:text-slate-400">
                Showing {filteredTeams.length} of {teams.length} teams
            </div>

            {/* Teams Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div
                            key={i}
                            className="h-48 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl animate-pulse"
                        />
                    ))}
                </div>
            ) : filteredTeams.length === 0 ? (
                <div className="text-center py-16 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50">
                    <Shield className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                    <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                        No teams found
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                        Try adjusting your search query or filters
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTeams.map(team => (
                        <Link
                            key={team.id}
                            to={`/teams/${team.slug || team.id}`}
                            className="block group"
                        >
                            <GlassCard className="h-full relative overflow-hidden hover:border-blue-500/50 transition-all hover:shadow-xl hover:shadow-blue-500/10 p-6 flex flex-col justify-between space-y-4">
                                <div className="space-y-4">
                                    <div className="flex items-start gap-4">
                                        {/* Logo */}
                                        <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 p-2 shadow-md border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                            {team.logoUrl ? (
                                                <img
                                                    src={team.logoUrl}
                                                    alt={team.name}
                                                    className="w-full h-full object-contain"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                                    }}
                                                />
                                            ) : null}
                                            <div className={`w-full h-full flex items-center justify-center text-slate-400 ${team.logoUrl ? 'hidden' : ''}`}>
                                                <Shield className="w-8 h-8" />
                                            </div>
                                        </div>

                                        {/* Name & Badges */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                                {team.category && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">
                                                        {team.category}
                                                    </span>
                                                )}
                                                {team.division && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-violet-500/10 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300">
                                                        {team.division}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                                {team.name}
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                {team.organisationName || team.shortName || 'Independent Team'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Tournaments Tags */}
                                    {team.tournaments && team.tournaments.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                            {team.tournaments.slice(0, 2).map(t => (
                                                <span
                                                    key={t.id}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 truncate max-w-[200px]"
                                                >
                                                    <Trophy className="w-3 h-3 text-yellow-500 shrink-0" />
                                                    <span className="truncate">{t.name}</span>
                                                </span>
                                            ))}
                                            {team.tournaments.length > 2 && (
                                                <span className="text-[11px] text-slate-400 font-medium self-center">
                                                    +{team.tournaments.length - 2} more
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Card Footer */}
                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                    <div className="flex items-center gap-1.5">
                                        <Users className="w-4 h-4 text-blue-500" />
                                        <span>{team.playerCount} Players</span>
                                    </div>
                                    {team.state && (
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-3.5 h-3.5" />
                                            <span>{team.state}</span>
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
