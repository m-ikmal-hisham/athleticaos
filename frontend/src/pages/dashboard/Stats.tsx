import { useEffect, useState, useRef } from 'react';
import { useStatsStore } from '@/store/stats.store';
import { useUIStore } from '@/store/ui.store';
import { fetchTournaments } from '@/api/tournaments.api';
import { Trophy, Users, Pulse, WarningCircle, Flag, Medal, CaretUp, CaretDown, Check, MagnifyingGlass } from '@phosphor-icons/react';
import { BentoGrid, BentoItem } from '@/components/dashboard/BentoGrid';
import { GlassCard } from '@/components/GlassCard';

interface Tournament {
    id: string;
    name: string;
    level: string;
}

export default function Stats() {
    const {
        selectedTournamentId,
        summary,
        playerStats,
        disciplineStats,
        teamStats,
        loading,
        error,
        setSelectedTournamentId,
        loadStatsForTournament
    } = useStatsStore();

    const { activeTournamentId, setActiveTournamentId } = useUIStore();
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [tournamentsLoading, setTournamentsLoading] = useState(true);

    // Local state for the dropdown / search
    const [localTournamentId, setLocalTournamentId] = useState<string>('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Sync global active tournament to local stats selection on mount/update
    // Only if we haven't selected anything locally yet or if the global one changes significantly?
    // Actually, if we want to default to the global one, we should set it when activeTournamentId changes.
    // But we don't want to override user's pending selection if they haven't clicked search yet.
    // A simple approach: When activeTournamentId changes (e.g. from sidebar), update local and trigger load.
    // But the user issue was "Changing to different tournament manually ... causing infinite loop".
    // So we decouple the dropdown from the store execution.

    useEffect(() => {
        if (activeTournamentId) {
            setLocalTournamentId(activeTournamentId);
            // Pre-fill search query with the name if available
            const t = tournaments.find((t: Tournament) => t.id === activeTournamentId);
            if (t) setSearchQuery(t.name);

            // If it's a fresh mount or external change, we might want to ensure store matches.
            // But let's rely on the manual search logic or initial load logic.
            // If the store is empty, we load it.
            if (activeTournamentId !== selectedTournamentId || !summary) {
                setSelectedTournamentId(activeTournamentId);
                loadStatsForTournament(activeTournamentId);
            }
        }
    }, [activeTournamentId, tournaments]); // Depend on tournaments to get name correctly

    // Load tournaments on mount
    useEffect(() => {
        const loadTournaments = async () => {
            try {
                const res = await fetchTournaments();
                setTournaments(res.data);
                // Also set initial search query if we have a local Id but no query (page reload case)
                if (localTournamentId && !searchQuery) {
                    const t = res.data.find((t: Tournament) => t.id === localTournamentId);
                    if (t) setSearchQuery(t.name);
                }
            } catch (err) {
                console.error("Failed to load tournaments", err);
            } finally {
                setTournamentsLoading(false);
            }
        };
        loadTournaments();
    }, []);

    // Close dropdown involved clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
                // Reset query to selected tournament name if we didn't select anything new
                const t = tournaments.find(t => t.id === localTournamentId);
                if (t && searchQuery !== t.name) {
                    setSearchQuery(t.name);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [localTournamentId, tournaments, searchQuery]);

    // REMOVED: Auto-load effect on selectedTournamentId change
    // useEffect(() => {
    //     if (selectedTournamentId) {
    //         loadStatsForTournament(selectedTournamentId);
    //     }
    // }, [selectedTournamentId, loadStatsForTournament]);

    const handleSearch = () => {
        if (localTournamentId) {
            setSelectedTournamentId(localTournamentId); // Update stats store
            setActiveTournamentId(localTournamentId);   // Update global UI store (sidebar pill)
            loadStatsForTournament(localTournamentId);  // Trigger data fetch
        }
    };

    const handleSelectTournament = (t: Tournament) => {
        setLocalTournamentId(t.id);
        setSearchQuery(t.name);
        setIsDropdownOpen(false);
    };

    const filteredTournaments = tournaments.filter((t: Tournament) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 pt-2 pb-12 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Stats & Leaderboards</h1>
                    <p className="text-muted-foreground mt-1">View tournament performance, top players and top teams.</p>
                </div>

                <div className="w-full md:w-auto flex items-center gap-2">
                    {/* Searchable Combobox */}
                    <div className="relative flex-1 md:w-72" ref={dropdownRef}>
                        <div
                            className="relative w-full group"
                            onClick={() => setIsDropdownOpen(true)}
                        >
                            <input
                                type="text"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pl-10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors placeholder:text-muted-foreground/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                placeholder="Select tournament..."
                                value={searchQuery}
                                disabled={tournamentsLoading}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setIsDropdownOpen(true);
                                }}
                                onFocus={() => setIsDropdownOpen(true)}
                            />
                            <MagnifyingGlass className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                <CaretDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>
                        </div>

                        {/* Dropdown List */}
                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                {filteredTournaments.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        No tournaments found.
                                    </div>
                                ) : (
                                    <div className="p-1">
                                        {filteredTournaments.map((t) => (
                                            <button
                                                key={t.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelectTournament(t);
                                                }}
                                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between transition-colors ${localTournamentId === t.id
                                                    ? 'bg-primary/20 text-primary'
                                                    : 'text-foreground hover:bg-white/5'
                                                    }`}
                                            >
                                                <span className="truncate">{t.name}</span>
                                                {localTournamentId === t.id && (
                                                    <Check className="w-4 h-4 flex-shrink-0 ml-2" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleSearch}
                        disabled={loading || !localTournamentId || localTournamentId === selectedTournamentId}
                        className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-primary/20"
                    >
                        Search
                    </button>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-500 mb-6">
                    <WarningCircle className="w-5 h-5" />
                    <p>{error}</p>
                </div>
            )}

            {/* Main Content */}
            {!selectedTournamentId ? (
                <GlassCard className="p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                    <Trophy className="w-16 h-16 text-white/10 mb-6" />
                    <h3 className="text-2xl font-semibold text-foreground">No Tournament Selected</h3>
                    <p className="text-muted-foreground mt-2 max-w-sm mx-auto">Please select a tournament from the dropdown above to view detailed statistics and leaderboards.</p>
                </GlassCard>
            ) : (
                <StatsContent
                    summary={summary}
                    loading={loading}
                    playerStats={playerStats}
                    disciplineStats={disciplineStats}
                    teamStats={teamStats}
                />
            )}
        </div>
    );
}

// Sub-component to handle sorting logic cleanly
function StatsContent({ summary, loading, playerStats, disciplineStats, teamStats }: any) {
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc'; type: 'scorers' | 'discipline' | 'teams' } | null>(null);

    const handleSort = (key: string, type: 'scorers' | 'discipline' | 'teams') => {
        let direction: 'asc' | 'desc' = 'desc'; // Default to descending for stats
        if (sortConfig && sortConfig.key === key && sortConfig.type === type && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction, type });
    };

    const getSortedData = (data: any[], type: 'scorers' | 'discipline' | 'teams') => {
        // Default sorts
        if (!sortConfig || sortConfig.type !== type) {
            if (type === 'scorers') return [...data].sort((a, b) => b.totalPoints - a.totalPoints);
            if (type === 'discipline') return [...data].sort((a, b) => {
                if (b.redCards !== a.redCards) return b.redCards - a.redCards;
                return b.yellowCards - a.yellowCards;
            });
            if (type === 'teams') return [...data].sort((a, b) => b.tablePoints - a.tablePoints);
            return data;
        }

        // Custom sort
        return [...data].sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    };

    const SortIcon = ({ columnKey, type }: { columnKey: string, type: 'scorers' | 'discipline' | 'teams' }) => {
        if (!sortConfig || sortConfig.key !== columnKey || sortConfig.type !== type) {
            return <div className="w-4 h-4 inline-block" />; // Placeholder
        }
        return sortConfig.direction === 'asc' ? <CaretUp className="w-4 h-4 inline ml-1" /> : <CaretDown className="w-4 h-4 inline ml-1" />;
    };

    const sortedScorers = getSortedData(playerStats, 'scorers');
    const sortedDiscipline = getSortedData(disciplineStats, 'discipline');
    const sortedTeams = getSortedData(teamStats, 'teams');

    if (loading) {
        return (
            <div className="h-[600px] w-full flex flex-col items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-4 text-muted-foreground text-sm font-medium">Loading tournament statistics...</p>
            </div>
        );
    }

    return (
        <BentoGrid>
            {/* Summary Cards Row - Using smaller items for summary */}
            {/* Using 2 columns for 6 items logic is tricky in 4-col grid. 
                We can make them Span 1 (takes 1/4 width on LG).
                Top row: 4 items.
                Second row: 2 items + larger content? 
                Or just let them flow. 6 items will take 1.5 rows. 
                Let's try to fit them in top row(s).
             */}

            <BentoItem colSpan={1}>
                <SummaryCard
                    label="Total Matches"
                    value={summary?.totalMatches ?? 0}
                    icon={<Pulse className="w-5 h-5 text-blue-400" />}
                />
            </BentoItem>
            <BentoItem colSpan={1}>
                <SummaryCard
                    label="Completed"
                    value={summary?.completedMatches ?? 0}
                    icon={<Flag className="w-5 h-5 text-green-400" />}
                />
            </BentoItem>
            <BentoItem colSpan={1}>
                <SummaryCard
                    label="Total Tries"
                    value={summary?.totalTries ?? 0}
                    icon={<Medal className="w-5 h-5 text-yellow-400" />}
                />
            </BentoItem>
            <BentoItem colSpan={1}>
                <SummaryCard
                    label="Total Points"
                    value={summary?.totalPoints ?? 0}
                    icon={<Trophy className="w-5 h-5 text-purple-400" />}
                />
            </BentoItem>
            <BentoItem colSpan={1}>
                <SummaryCard
                    label="Yellow Cards"
                    value={summary?.totalYellowCards ?? 0}
                    icon={<div className="w-4 h-5 bg-yellow-400 rounded-[2px]" />}
                />
            </BentoItem>
            <BentoItem colSpan={1}>
                <SummaryCard
                    label="Red Cards"
                    value={summary?.totalRedCards ?? 0}
                    icon={<div className="w-4 h-5 bg-red-500 rounded-[2px]" />}
                />
            </BentoItem>

            {/* Empty spacer to fill the row if we have 6 items (4 on row 1, 2 on row 2). 
                The next 2 items will fill the rest of row 2?
                Actually, let's put Leaderboards on new rows or let them flow.
                If we have 6 items, that's 1.5 rows. Next item being colSpan 2 will fit in the remaining 2 slots of row 2! Perfect fit!
             */}

            {/* Top Scorers */}
            <BentoItem colSpan={2} rowSpan={3}>
                <GlassCard className="h-full flex flex-col p-0 overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Trophy className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-lg text-foreground">Top Point Scorers</h3>
                        </div>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-white/5 text-muted-foreground/70 bg-white/[0.01]">
                                    <th className="px-6 py-3 font-medium w-12 text-xs uppercase tracking-wider">#</th>
                                    <th className="px-6 py-3 font-medium cursor-pointer hover:text-foreground transition-colors text-xs uppercase tracking-wider" onClick={() => handleSort('firstName', 'scorers')}>Player <SortIcon columnKey="firstName" type="scorers" /></th>
                                    <th className="px-6 py-3 font-medium cursor-pointer hover:text-foreground transition-colors text-xs uppercase tracking-wider" onClick={() => handleSort('teamName', 'scorers')}>Team <SortIcon columnKey="teamName" type="scorers" /></th>
                                    <th className="px-6 py-3 font-medium text-right cursor-pointer hover:text-foreground transition-colors text-xs uppercase tracking-wider" onClick={() => handleSort('tries', 'scorers')}>Tries <SortIcon columnKey="tries" type="scorers" /></th>
                                    <th className="px-6 py-3 font-medium text-right cursor-pointer hover:text-foreground transition-colors text-xs uppercase tracking-wider" onClick={() => handleSort('totalPoints', 'scorers')}>Pts <SortIcon columnKey="totalPoints" type="scorers" /></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {sortedScorers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                                            No scoring stats available.
                                        </td>
                                    </tr>
                                ) : (
                                    sortedScorers.slice(0, 10).map((player: any, idx: number) => ( // Limit to top 10 for dashboard view
                                        <tr
                                            key={player.playerId}
                                            className="hover:bg-white/5 transition-colors cursor-pointer group"
                                            onClick={() => window.location.href = `/dashboard/players?player=${player.playerId}`}
                                        >
                                            <td className="px-6 py-3.5 font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                                                {idx + 1}
                                            </td>
                                            <td className="px-6 py-3.5 font-medium text-foreground group-hover:text-primary transition-colors">
                                                {player.firstName} {player.lastName}
                                            </td>
                                            <td className="px-6 py-3.5 text-muted-foreground text-xs">
                                                {player.teamName || '-'}
                                            </td>
                                            <td className="px-6 py-3.5 text-right text-foreground/80 font-medium">
                                                {player.tries}
                                            </td>
                                            <td className="px-6 py-3.5 text-right text-primary font-bold">
                                                {player.totalPoints}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>
            </BentoItem>

            {/* Discipline */}
            <BentoItem colSpan={2} rowSpan={3}>
                <GlassCard className="h-full flex flex-col p-0 overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                                <Flag className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-lg text-foreground">Discipline</h3>
                        </div>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-white/5 text-muted-foreground/70 bg-white/[0.01]">
                                    <th className="px-6 py-3 font-medium w-12 text-xs uppercase tracking-wider">#</th>
                                    <th className="px-6 py-3 font-medium cursor-pointer hover:text-foreground transition-colors text-xs uppercase tracking-wider" onClick={() => handleSort('firstName', 'discipline')}>Player <SortIcon columnKey="firstName" type="discipline" /></th>
                                    <th className="px-6 py-3 font-medium cursor-pointer hover:text-foreground transition-colors text-xs uppercase tracking-wider" onClick={() => handleSort('teamName', 'discipline')}>Team <SortIcon columnKey="teamName" type="discipline" /></th>
                                    <th className="px-6 py-3 font-medium text-right cursor-pointer hover:text-foreground transition-colors text-xs uppercase tracking-wider" onClick={() => handleSort('yellowCards', 'discipline')}>YC <SortIcon columnKey="yellowCards" type="discipline" /></th>
                                    <th className="px-6 py-3 font-medium text-right cursor-pointer hover:text-foreground transition-colors text-xs uppercase tracking-wider" onClick={() => handleSort('redCards', 'discipline')}>RC <SortIcon columnKey="redCards" type="discipline" /></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {sortedDiscipline.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                                            No discipline stats available.
                                        </td>
                                    </tr>
                                ) : (
                                    sortedDiscipline.slice(0, 10).map((player: any, idx: number) => (
                                        <tr
                                            key={`disc-${player.playerId}`}
                                            className="hover:bg-white/5 transition-colors cursor-pointer group"
                                            onClick={() => window.location.href = `/dashboard/players?player=${player.playerId}`}
                                        >
                                            <td className="px-6 py-3.5 font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                                                {idx + 1}
                                            </td>
                                            <td className="px-6 py-3.5 font-medium text-foreground group-hover:text-primary transition-colors">
                                                {player.firstName} {player.lastName}
                                            </td>
                                            <td className="px-6 py-3.5 text-muted-foreground text-xs">
                                                {player.teamName || '-'}
                                            </td>
                                            <td className="px-6 py-3.5 text-right text-yellow-500 font-bold">
                                                {player.yellowCards}
                                            </td>
                                            <td className="px-6 py-3.5 text-right text-red-500 font-bold">
                                                {player.redCards}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>
            </BentoItem>

            {/* Top Teams */}
            <BentoItem colSpan={4} rowSpan={2}>
                <GlassCard className="h-full flex flex-col p-0 overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                <Users className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-lg text-foreground">Top Teams</h3>
                        </div>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-white/5 text-muted-foreground/70 bg-white/[0.01]">
                                    <th className="px-6 py-3 font-medium w-12 text-xs uppercase tracking-wider">#</th>
                                    <th className="px-6 py-3 font-medium cursor-pointer hover:text-foreground transition-colors text-xs uppercase tracking-wider" onClick={() => handleSort('teamName', 'teams')}>Team <SortIcon columnKey="teamName" type="teams" /></th>
                                    <th className="px-6 py-3 font-medium cursor-pointer hover:text-foreground transition-colors text-xs uppercase tracking-wider" onClick={() => handleSort('organisationName', 'teams')}>Org <SortIcon columnKey="organisationName" type="teams" /></th>
                                    <th className="px-6 py-3 font-medium text-right cursor-pointer hover:text-foreground transition-colors text-xs uppercase tracking-wider" onClick={() => handleSort('wins', 'teams')}>Wins <SortIcon columnKey="wins" type="teams" /></th>
                                    <th className="px-6 py-3 font-medium text-right cursor-pointer hover:text-foreground transition-colors text-xs uppercase tracking-wider" onClick={() => handleSort('tablePoints', 'teams')}>Pts <SortIcon columnKey="tablePoints" type="teams" /></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {sortedTeams.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                                            No team stats available.
                                        </td>
                                    </tr>
                                ) : (
                                    sortedTeams.slice(0, 10).map((team: any, idx: number) => (
                                        <tr key={team.teamId} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-3.5 font-medium text-muted-foreground">
                                                {idx + 1}
                                            </td>
                                            <td className="px-6 py-3.5 font-medium text-foreground text-base">
                                                {team.teamName}
                                            </td>
                                            <td className="px-6 py-3.5 text-muted-foreground text-sm">
                                                {team.organisationName || '-'}
                                            </td>
                                            <td className="px-6 py-3.5 text-right text-foreground/80 font-medium">
                                                {team.wins}
                                            </td>
                                            <td className="px-6 py-3.5 text-right text-blue-500 font-bold text-base">
                                                {team.tablePoints}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>
            </BentoItem>
        </BentoGrid>
    );
}

function SummaryCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
    return (
        <GlassCard className="h-full flex flex-col items-center justify-center text-center p-6 border-white/5 hover:border-white/10 transition-colors">
            <div className="mb-3 p-3 rounded-2xl bg-white/[0.03]">
                {icon}
            </div>
            <span className="text-3xl font-bold text-foreground tracking-tight">{value}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2">{label}</span>
        </GlassCard>
    );
}
