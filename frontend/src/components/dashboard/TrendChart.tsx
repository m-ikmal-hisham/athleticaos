import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';


interface TrendChartProps {
    data: { name: string; value: number }[];
    color?: string;
    height?: number;
}

export const TrendChart = ({ data, color = "#3b82f6", height = 120 }: TrendChartProps) => {


    // Apple-style minimal tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/80 dark:bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-xl border border-white/20 text-xs font-semibold">
                    <p className="text-foreground">{payload[0].value} Matches</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ width: '100%', height: height }}>
            <ResponsiveContainer>
                <AreaChart
                    data={data}
                    margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="name"
                        hide
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        hide
                        axisLine={false}
                        tickLine={false}
                        domain={[0, 'dataMax + 1']}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorValue)"
                        animationDuration={1500}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
