import { useState } from 'react';
import { CaretDown, CaretUp } from '@phosphor-icons/react';
import { GlassCard } from '@/components/GlassCard';
import { PublicMatchDetail, PublicTeamStats } from '../../../api/public.api';

interface MatchStatsSectionProps {
    match: PublicMatchDetail;
}

export const MatchStatsSection = ({ match }: MatchStatsSectionProps) => {
    const [expanded, setExpanded] = useState(false);

    if (!match.homeStats && !match.awayStats) return null;

    const renderStatBar = (label: string, key: keyof PublicTeamStats) => {
        const homeValue = match.homeStats?.[key] ?? 0;
        const awayValue = match.awayStats?.[key] ?? 0;
        const total = homeValue + awayValue;
        const homePercent = total > 0 ? (homeValue / total) * 100 : 50;

        return (
            <div key={key as string} className="space-y-2">
                <div className="flex items-center justify-between text-sm font-medium">
                    <span className="text-slate-900 dark:text-white w-8 text-left">{homeValue}</span>
                    <span className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">{label}</span>
                    <span className="text-slate-900 dark:text-white w-8 text-right">{awayValue}</span>
                </div>
                <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex relative">
                    {/* Home Bar */}
                    {/* eslint-disable-next-line react-dom/no-missing-iframe-sandbox */}
                    <div
                        className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-1000 ease-out w-[var(--bar-width)]"
                        ref={(el) => {
                            if (el) el.style.setProperty('--bar-width', `${homePercent}%`);
                        }}
                    />
                    {/* Divider */}
                    <div className="w-0.5 h-full bg-white dark:bg-black/20 z-10 absolute left-1/2 -translate-x-1/2" />
                    {/* Away Bar is automatic via flex remainder or background */}
                    <div
                        className="h-full bg-red-600 dark:bg-red-500 transition-all duration-1000 ease-out flex-1"
                    />
                </div>
            </div>
        );
    };

    return (
        <GlassCard className="p-6 md:p-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                Match Statistics
            </h3>

            <div className="space-y-6">
                {/* Tier 1 - Primary Stats */}
                <div className="space-y-6">
                    {renderStatBar('Tries', 'tries')}
                    {renderStatBar('Penalties', 'penalties')}
                    {renderStatBar('Yellow Cards', 'yellowCards')}
                </div>

                {/* Tier 2 - Secondary Stats (Collapsible) */}
                <div className={`space-y-6 overflow-hidden transition-all duration-500 ${expanded ? 'max-h-[500px] opacity-100 pt-4 border-t border-slate-200/50 dark:border-white/5' : 'max-h-0 opacity-0'}`}>
                    {renderStatBar('Conversions', 'conversions')}
                    {renderStatBar('Red Cards', 'redCards')}
                </div>
            </div>

            {/* Toggle Button */}
            <div className="mt-6 flex justify-center">
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-all"
                >
                    {expanded ? (
                        <>
                            Show Less <CaretUp className="w-4 h-4" />
                        </>
                    ) : (
                        <>
                            Show More Stats <CaretDown className="w-4 h-4" />
                        </>
                    )}
                </button>
            </div>
        </GlassCard>
    );
};
