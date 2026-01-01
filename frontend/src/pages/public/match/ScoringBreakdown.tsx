import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { GlassCard } from '@/components/GlassCard';
import { PublicMatchDetail, PublicMatchEvent } from '../../../api/public.api';
import { ChartPieSlice } from '@phosphor-icons/react';

interface ScoringBreakdownProps {
    match: PublicMatchDetail;
}

export const ScoringBreakdown = ({ match }: ScoringBreakdownProps) => {

    const data = useMemo(() => {
        if (!match.events) return { typeData: [], halfData: [] };

        const stats = {
            home: { tries: 0, pens: 0, cons: 0, h1: 0, h2: 0, name: match.homeTeamName },
            away: { tries: 0, pens: 0, cons: 0, h1: 0, h2: 0, name: match.awayTeamName }
        };

        match.events.forEach((event: PublicMatchEvent) => {
            const isHome = event.teamName === match.homeTeamName;
            const minutes = event.minute || 0;
            const isFirstHalf = minutes <= 40;

            let points = 0;
            switch (event.eventType.toUpperCase()) {
                case 'TRY':
                    points = 5;
                    if (isHome) stats.home.tries += 5; else stats.away.tries += 5;
                    break;
                case 'PENALTY':
                    points = 3;
                    if (isHome) stats.home.pens += 3; else stats.away.pens += 3;
                    break;
                case 'DROP_GOAL':
                    points = 3;
                    if (isHome) stats.home.pens += 3; else stats.away.pens += 3; // Group drop goals with pens for simplicity
                    break;
                case 'CONVERSION':
                    points = 2;
                    if (isHome) stats.home.cons += 2; else stats.away.cons += 2;
                    break;
                case 'PENALTY_TRY':
                    points = 7;
                    if (isHome) stats.home.tries += 7; else stats.away.tries += 7; // Count as try points
                    break;
            }

            if (isFirstHalf) {
                if (isHome) stats.home.h1 += points; else stats.away.h1 += points;
            } else {
                if (isHome) stats.home.h2 += points; else stats.away.h2 += points;
            }
        });

        // Shape for Stacked Bar (Type Breakdown)
        const typeData = [
            {
                name: match.homeTeamName,
                Tries: stats.home.tries,
                Kicks: stats.home.pens + stats.home.cons, // Combine kicks for cleaner UI
            },
            {
                name: match.awayTeamName,
                Tries: stats.away.tries,
                Kicks: stats.away.pens + stats.away.cons,
            }
        ];

        // Shape for Half Breakdown
        const halfData = [
            {
                name: '1st Half',
                [match.homeTeamName]: stats.home.h1,
                [match.awayTeamName]: stats.away.h1,
            },
            {
                name: '2nd Half',
                [match.homeTeamName]: stats.home.h2,
                [match.awayTeamName]: stats.away.h2,
            }
        ];

        return { typeData, halfData };
    }, [match.events, match.homeTeamName, match.awayTeamName]);

    if (!match.events || match.events.length === 0) return null;

    const homeColor = match.organiserBranding?.primaryColor || '#3b82f6';
    const awayColor = match.organiserBranding?.secondaryColor || '#ef4444';

    return (
        <GlassCard className="p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <ChartPieSlice className="w-5 h-5 text-purple-500" />
                Scoring Breakdown
            </h3>

            <div className="space-y-8">
                {/* Scoring Source (Tries vs Kicks) */}
                <div>
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Points Source</h4>
                    <div className="h-[180px] w-full text-xs">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={data.typeData}
                                margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
                                barSize={20}
                            >
                                <XAxis type="number" hide />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    tick={{ fill: '#64748b', fontSize: 11 }}
                                    width={80}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    cursor={{ fill: 'transparent' }}
                                />
                                <Legend />
                                <Bar dataKey="Tries" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="Kicks" stackId="a" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Half Breakdown */}
                <div>
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Half-by-Half Performance</h4>
                    <div className="h-[180px] w-full text-xs">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={data.halfData}
                                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                                barSize={32}
                            >
                                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                                    cursor={{ fill: '#1e293b' }}
                                />
                                <Legend />
                                <Bar dataKey={match.homeTeamName} fill={homeColor} radius={[4, 4, 0, 0]} />
                                <Bar dataKey={match.awayTeamName} fill={awayColor} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </GlassCard>
    );
};
