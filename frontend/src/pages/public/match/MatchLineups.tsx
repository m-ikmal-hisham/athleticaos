import { useState, useEffect } from 'react';
import { Users, Shield, TShirt } from '@phosphor-icons/react';
import { GlassCard } from '@/components/GlassCard';
import { PublicMatchDetail, PublicMatchLineups, PublicLineupEntry, publicTournamentApi } from '../../../api/public.api';
import { getPositionName, getPositionGroup, RugbyFormat } from '@/utils/rugbyPositions';

interface MatchLineupsProps {
    match: PublicMatchDetail;
}

export const MatchLineups = ({ match }: MatchLineupsProps) => {
    const [lineups, setLineups] = useState<PublicMatchLineups | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTeam, setActiveTeam] = useState<'home' | 'away'>('home');

    // Detect format from match duration (heuristic)
    const detectFormat = (): RugbyFormat => {
        const duration = match.matchDuration || 80;
        if (duration <= 16) return 'SEVENS';
        if (duration <= 30) return 'TENS';
        return 'XV';
    };

    const format = detectFormat();

    useEffect(() => {
        const loadLineups = async () => {
            try {
                const data = await publicTournamentApi.getMatchLineups(match.id);
                setLineups(data);
            } catch (error) {
                console.error('Failed to load lineups:', error);
            } finally {
                setLoading(false);
            }
        };

        loadLineups();
    }, [match.id]);

    if (loading) {
        return (
            <GlassCard className="p-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                    <div className="space-y-3">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                        ))}
                    </div>
                </div>
            </GlassCard>
        );
    }

    if (!lineups || (lineups.homeLineup.length === 0 && lineups.awayLineup.length === 0)) {
        return (
            <GlassCard className="p-8 text-center">
                <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Lineups Not Available</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Team sheets have not been submitted for this match yet.</p>
            </GlassCard>
        );
    }

    const renderPlayerRow = (player: PublicLineupEntry, index: number, isStarter: boolean) => {
        const positionName = isStarter ? getPositionName(player.orderIndex, format) : '';
        const hasJersey = player.jerseyNumber != null && player.jerseyNumber > 0;

        return (
            <div
                key={`${player.playerName}-${index}`}
                className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                    ${isStarter
                        ? 'bg-white/70 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 hover:shadow-md hover:border-slate-300 dark:hover:border-white/20'
                        : 'bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100/50 dark:border-white/5 hover:bg-slate-100/50 dark:hover:bg-white/5'}
                `}
            >
                {/* Order Index / Position Number */}
                <div className={`
                    flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
                    ${isStarter
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}
                `}>
                    {player.orderIndex || (isStarter ? index + 1 : '—')}
                </div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className={`font-semibold truncate ${isStarter ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                            {player.playerName}
                        </span>
                        {player.captain && (
                            <span className="flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider border border-amber-200 dark:border-amber-800">
                                <Shield className="w-2.5 h-2.5" weight="fill" />
                                C
                            </span>
                        )}
                    </div>
                    {positionName && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {player.positionDisplay || positionName}
                        </span>
                    )}
                </div>

                {/* Jersey Number */}
                <div className={`
                    flex-shrink-0 flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold min-w-[2.5rem]
                    ${hasJersey
                        ? 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10'
                        : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'}
                `}>
                    <TShirt className="w-3 h-3" weight={hasJersey ? 'fill' : 'regular'} />
                    {hasJersey ? player.jerseyNumber : '—'}
                </div>
            </div>
        );
    };

    const renderTeamLineup = (
        teamLineup: PublicLineupEntry[],
        accentColor: string
    ) => {
        const starters = teamLineup
            .filter(p => p.role === 'STARTER')
            .sort((a, b) => (a.orderIndex || 999) - (b.orderIndex || 999));
        const bench = teamLineup
            .filter(p => p.role === 'BENCH' || p.role === 'RESERVE')
            .sort((a, b) => (a.orderIndex || 999) - (b.orderIndex || 999));

        // Group starters by position group
        const forwards = starters.filter(p => getPositionGroup(p.orderIndex, format) === 'Forwards');
        const backs = starters.filter(p => getPositionGroup(p.orderIndex, format) === 'Backs');
        const ungrouped = starters.filter(p => getPositionGroup(p.orderIndex, format) === '');

        return (
            <div className="space-y-6">
                {/* Starters */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className={`w-1 h-5 rounded-full ${accentColor}`} />
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Starting XV
                        </h4>
                        <span className="text-xs text-slate-400 font-medium">
                            {starters.length} players
                        </span>
                    </div>

                    {/* Forwards */}
                    {forwards.length > 0 && (
                        <div className="mb-4">
                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">
                                Forwards
                            </div>
                            <div className="space-y-1.5">
                                {forwards.map((p, i) => renderPlayerRow(p, i, true))}
                            </div>
                        </div>
                    )}

                    {/* Backs */}
                    {backs.length > 0 && (
                        <div className="mb-4">
                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">
                                Backs
                            </div>
                            <div className="space-y-1.5">
                                {backs.map((p, i) => renderPlayerRow(p, i, true))}
                            </div>
                        </div>
                    )}

                    {/* Ungrouped (fallback) */}
                    {ungrouped.length > 0 && forwards.length === 0 && backs.length === 0 && (
                        <div className="space-y-1.5">
                            {ungrouped.map((p, i) => renderPlayerRow(p, i, true))}
                        </div>
                    )}
                </div>

                {/* Bench / Substitutes */}
                {bench.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-1 h-5 rounded-full bg-slate-300 dark:bg-slate-600" />
                            <h4 className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                Replacements
                            </h4>
                            <span className="text-xs text-slate-400 font-medium">
                                {bench.length} players
                            </span>
                        </div>
                        <div className="space-y-1.5">
                            {bench.map((p, i) => renderPlayerRow(p, i, false))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const homeLineup = lineups.homeLineup || [];
    const awayLineup = lineups.awayLineup || [];

    return (
        <div className="space-y-6">
            {/* Mobile Team Switcher */}
            <div className="lg:hidden">
                <div className="flex p-1 bg-slate-100/80 dark:bg-white/5 rounded-xl border border-slate-200/50 dark:border-white/10 backdrop-blur-sm">
                    <button
                        onClick={() => setActiveTeam('home')}
                        className={`
                            flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all
                            ${activeTeam === 'home'
                                ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}
                        `}
                    >
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${activeTeam === 'home' ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                        {match.homeTeamShortName || match.homeTeamName}
                    </button>
                    <button
                        onClick={() => setActiveTeam('away')}
                        className={`
                            flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all
                            ${activeTeam === 'away'
                                ? 'bg-white dark:bg-white/10 text-red-600 dark:text-red-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}
                        `}
                    >
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${activeTeam === 'away' ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                        {match.awayTeamShortName || match.awayTeamName}
                    </button>
                </div>
            </div>

            {/* Desktop: Side-by-side | Mobile: Active team only */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Home Team */}
                <div className={`${activeTeam !== 'home' ? 'hidden lg:block' : ''}`}>
                    <GlassCard className="p-5 md:p-6">
                        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-200/50 dark:border-white/10">
                            <div className="w-1.5 h-8 rounded-full bg-blue-500" />
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    {match.homeTeamName}
                                </h3>
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                                    Home
                                </span>
                            </div>
                        </div>
                        {homeLineup.length > 0 ? (
                            renderTeamLineup(homeLineup, 'bg-blue-500')
                        ) : (
                            <p className="text-sm text-slate-400 text-center py-8">Lineup not submitted</p>
                        )}
                    </GlassCard>
                </div>

                {/* Away Team */}
                <div className={`${activeTeam !== 'away' ? 'hidden lg:block' : ''}`}>
                    <GlassCard className="p-5 md:p-6">
                        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-200/50 dark:border-white/10">
                            <div className="w-1.5 h-8 rounded-full bg-red-500" />
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    {match.awayTeamName}
                                </h3>
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                                    Away
                                </span>
                            </div>
                        </div>
                        {awayLineup.length > 0 ? (
                            renderTeamLineup(awayLineup, 'bg-red-500')
                        ) : (
                            <p className="text-sm text-slate-400 text-center py-8">Lineup not submitted</p>
                        )}
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};
