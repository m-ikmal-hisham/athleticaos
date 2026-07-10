import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip } from 'recharts';
import { GlassCard } from '@/components/GlassCard';
import { PublicMatchDetail, PublicMatchEvent } from '../../../api/public.api';
import { TrendUp } from '@phosphor-icons/react';

interface MomentumIndicatorProps {
    match: PublicMatchDetail;
}

interface MomentumDataPoint {
    minute: number;
    value: number; // Positive for Home, Negative for Away
    label: string;
}

export const MomentumIndicator = ({ match }: MomentumIndicatorProps) => {

    // Calculate momentum data
    // Group events into 5-minute buckets
    // Group events into buckets
    const data = useMemo(() => {
        if (!match.events || match.events.length === 0) return [];

        const maxMinute = match.matchDuration || 80;
        // Adaptive bucket size: 2 mins for short matches (e.g. 7s), 5 mins for full matches
        const bucketSize = maxMinute <= 20 ? 2 : 5;
        const buckets: Record<number, number> = {};

        // Initialize buckets
        for (let i = 0; i <= maxMinute; i += bucketSize) {
            buckets[i] = 0;
        }

        // Process events
        match.events.forEach((event: PublicMatchEvent) => {
            const minute = event.minute || 0;
            // Find closest bucket
            const bucketKey = Math.floor(minute / bucketSize) * bucketSize;

            // Ensure we don't go out of bounds (e.g. overtime events go into last bucket)
            const safeKey = bucketKey > maxMinute ? (Math.floor(maxMinute / bucketSize) * bucketSize) : bucketKey;

            let momentumValue = 0;
            const isHome = event.teamName === match.homeTeamName;

            // ... (rest of logic is fine)

            // Assign weight based on event type
            switch (event.eventType.toUpperCase()) {
                case 'TRY': momentumValue = 5; break;
                case 'PENALTY': momentumValue = 3; break;
                case 'CONVERSION': momentumValue = 2; break;
                case 'YELLOW_CARD': momentumValue = -5; break;
                case 'RED_CARD': momentumValue = -10; break;
                default: momentumValue = 1;
            }

            let impact = momentumValue;

            if (event.eventType.includes('CARD')) {
                if (isHome) {
                    impact = -Math.abs(momentumValue);
                } else {
                    impact = Math.abs(momentumValue);
                }
            } else {
                if (isHome) {
                    impact = Math.abs(momentumValue);
                } else {
                    impact = -Math.abs(momentumValue);
                }
            }

            if (buckets[safeKey] !== undefined) {
                buckets[safeKey] += impact;
            }
        });

        // Convert to array
        const rawData: MomentumDataPoint[] = Object.keys(buckets).map(key => ({
            minute: parseInt(key),
            value: buckets[parseInt(key)],
            label: `${key}'`
        }));

        return rawData;

    }, [match.events, match.homeTeamName, match.matchDuration]);

    if (data.length === 0) return null;

    // Helper to get bucket size for tooltip
    const getBucketSize = () => (match.matchDuration || 80) <= 20 ? 2 : 5;
    const bucketSize = getBucketSize();

    // Determine colors
    const homeColor = match.organiserBranding?.primaryColor || '#3b82f6';
    const awayColor = match.organiserBranding?.secondaryColor || '#ef4444';

    // Gradient definitions
    const gradientOffset = () => {
        const dataMax = Math.max(...data.map((i) => i.value));
        const dataMin = Math.min(...data.map((i) => i.value));

        if (dataMax <= 0) return 0;
        if (dataMin >= 0) return 1;

        return dataMax / (dataMax - dataMin);
    };

    const off = gradientOffset();

    return (
        <GlassCard className="p-4 md:p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 uppercase tracking-wider">
                    <TrendUp className="w-4 h-4 text-blue-500" />
                    Match Momentum
                </h3>
                {/* ... Legend ... */}
                <div className="flex items-center gap-3 text-xs font-medium">
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: homeColor }} />
                        <span className="text-slate-600 dark:text-slate-400">{match.homeTeamName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: awayColor }} />
                        <span className="text-slate-600 dark:text-slate-400">{match.awayTeamName}</span>
                    </div>
                </div>
            </div>

            <div className="h-[120px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                                <stop offset={off} stopColor={homeColor} stopOpacity={0.6} />
                                <stop offset={off} stopColor={awayColor} stopOpacity={0.6} />
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="minute" hide />
                        <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const val = payload[0].value as number;
                                    const min = payload[0].payload.minute;
                                    const team = val > 0 ? match.homeTeamName : (val < 0 ? match.awayTeamName : 'Neutral');
                                    return (
                                        <div className="bg-slate-900/90 text-white text-xs px-2 py-1 rounded shadow-lg backdrop-blur-sm border border-white/10">
                                            <p className="font-bold">{min}' - {min + bucketSize}'</p>
                                            <p>{team} Dominance</p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" strokeOpacity={0.5} />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="url(#splitColor)"
                            fill="url(#splitColor)"
                            strokeWidth={2}
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </GlassCard>
    );
};
