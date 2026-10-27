import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { GlassCard } from '@/components/GlassCard';
import { PublicMatchDetail, PublicMatchEvent } from '../../../api/public.api';
import { ChartPieSlice } from '@phosphor-icons/react';
import { getEventPoints } from '@/constants/scoring';

interface ScoringBreakdownProps {
    match: PublicMatchDetail;
}

export const ScoringBreakdown = ({ match }: ScoringBreakdownProps) => {
    const { t } = useTranslation(['match', 'common']);

    const data = useMemo(() => {
        if (!match.events) return { typeData: [], halfData: [] };

        const duration = match.matchDuration || 80;
        const isOneWay = match.isOneWayMatch || false;
        const halfTime = isOneWay ? duration : duration / 2;

        const stats = {
            home: { tries: 0, pens: 0, cons: 0, p1: 0, p2: 0, name: match.homeTeamName },
            away: { tries: 0, pens: 0, cons: 0, p1: 0, p2: 0, name: match.awayTeamName }
        };

        match.events.forEach((event: PublicMatchEvent) => {
            const isHome = event.teamName === match.homeTeamName;
            const minutes = event.minute || 0;
            // For One Way, everything is in "Period 1". 
            // For Two Halves, check if min <= halfTime.
            const isFirstPeriod = isOneWay ? true : minutes <= halfTime;

            const points = getEventPoints(event.eventType);
            const side = isHome ? stats.home : stats.away;

            switch (event.eventType.toUpperCase()) {
                case 'TRY':
                case 'SUPER_TRY':
                case 'PENALTY_TRY':
                    side.tries += points;
                    break;
                case 'PENALTY':
                case 'DROP_GOAL':
                    side.pens += points;
                    break;
                case 'CONVERSION':
                    side.cons += points;
                    break;
            }

            if (isFirstPeriod) {
                if (isHome) stats.home.p1 += points; else stats.away.p1 += points;
            } else {
                if (isHome) stats.home.p2 += points; else stats.away.p2 += points;
            }
        });

        const triesKey = t('match:scoring.tries');
        const kicksKey = t('match:scoring.kicks');

        // Shape for Stacked Bar (Type Breakdown)
        const typeData = [
            {
                name: match.homeTeamName,
                [triesKey]: stats.home.tries,
                [kicksKey]: stats.home.pens + stats.home.cons,
            },
            {
                name: match.awayTeamName,
                [triesKey]: stats.away.tries,
                [kicksKey]: stats.away.pens + stats.away.cons,
            }
        ];

        // Shape for Period Breakdown
        const halfData = [];

        if (isOneWay) {
            halfData.push({
                name: t('match:scoring.fullMatch'),
                [match.homeTeamName]: stats.home.p1,
                [match.awayTeamName]: stats.away.p1,
            });
        } else {
            halfData.push(
                {
                    name: t('match:scoring.firstHalf'),
                    [match.homeTeamName]: stats.home.p1,
                    [match.awayTeamName]: stats.away.p1,
                },
                {
                    name: t('match:scoring.secondHalf'),
                    [match.homeTeamName]: stats.home.p2,
                    [match.awayTeamName]: stats.away.p2,
                }
            );
        }

        return { typeData, halfData, triesKey, kicksKey };
    }, [match.events, match.homeTeamName, match.awayTeamName, match.matchDuration, match.isOneWayMatch, t]);

    if (!match.events || match.events.length === 0) return null;

    const homeColor = match.organiserBranding?.primaryColor || '#3b82f6';
    const awayColor = match.organiserBranding?.secondaryColor || '#ef4444';

    return (
        <GlassCard className="p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <ChartPieSlice className="w-5 h-5 text-navy dark:text-navy-tint" />
                {t('match:scoring.title')}
            </h3>

            <div className="space-y-8">
                {/* Scoring Source (Tries vs Kicks) */}
                <div>
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">{t('match:scoring.pointsSource')}</h4>
                    <div className="h-[180px] w-full text-xs min-w-0">
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
                                <Bar dataKey={data.triesKey} stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                                <Bar dataKey={data.kicksKey} stackId="a" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Half Breakdown */}
                <div>
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">{t('match:scoring.halfPerformance')}</h4>
                    <div className="h-[180px] w-full text-xs min-w-0">
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
