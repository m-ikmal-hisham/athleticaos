import { useState, useEffect } from 'react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
} from '@/components/Card';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts';
import { fetchTeams } from '@/api/teams.api';
import { getTeamPerformanceTrends, TeamPerformanceTrend } from '@/api/analytics.api';
import { TrendUp, User } from '@phosphor-icons/react';

interface Team {
    id: string;
    name: string;
}

export const TeamAnalyticsDashboard = () => {
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
    const [trends, setTrends] = useState<TeamPerformanceTrend[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadTeams = async () => {
            try {
                const res = await fetchTeams();
                setTeams(res.data);
                if (res.data.length > 0) setSelectedTeam(res.data[0].id);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadTeams();
    }, []);

    useEffect(() => {
        if (!selectedTeam) return;
        const loadTrends = async () => {
            try {
                const t = await getTeamPerformanceTrends(selectedTeam);
                setTrends(t);
            } catch (e) {
                console.error(e);
            }
        };
        loadTrends();
    }, [selectedTeam]);

    if (loading) return <div>Loading...</div>;

    const winCount = trends.filter(t => t.result === 'WIN').length;
    const lossCount = trends.filter(t => t.result === 'LOSS').length;
    const drawCount = trends.filter(t => t.result === 'DRAW').length;
    const resultData = [
        { name: 'Win', count: winCount, fill: '#10B981' }, // green-500
        { name: 'Draw', count: drawCount, fill: '#F59E0B' }, // amber-500
        { name: 'Loss', count: lossCount, fill: '#EF4444' }, // red-500
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Team Analytics</h1>
                    <p className="text-muted text-sm">Deep dive into team performance form and history.</p>
                </div>
                <div>
                    <select
                        className="h-10 px-3 py-2 rounded-md border border-glass-border bg-glass-panel text-foreground"
                        value={selectedTeam || ''}
                        onChange={(e) => setSelectedTeam(e.target.value)}
                        aria-label="Select Team"
                    >
                        {teams.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Scoring Trend Line Chart */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendUp className="w-5 h-5 text-purple-500" />
                            Scoring Trends
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                    <XAxis dataKey="matchDate" tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} />
                                    <YAxis />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }}
                                        labelFormatter={(val) => new Date(val).toLocaleDateString()}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="pointsScored" stroke="#8884d8" name="Points Scored" />
                                    <Line type="monotone" dataKey="pointsConceded" stroke="#82ca9d" name="Points Conceded" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Win/Loss Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-500" />
                            Result Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={resultData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }} />
                                    <Bar dataKey="count" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
