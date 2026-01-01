import { useState, useEffect } from 'react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
} from '@/components/Card';

// Actually I replaced it in DisciplineTrends, so I should probably use native select here too to be safe.

import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Label
} from 'recharts';
import { getActiveTournamentsHealth, CompetitionHealthSummary } from '@/api/federation.api';
import { getDisciplineImpact, DisciplineCorrelation } from '@/api/analytics.api';
import { Info } from '@phosphor-icons/react';

export const DisciplineImpactAnalysis = () => {
    const [tournaments, setTournaments] = useState<CompetitionHealthSummary[]>([]);
    const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
    const [data, setData] = useState<DisciplineCorrelation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadTournaments = async () => {
            try {
                const t = await getActiveTournamentsHealth();
                setTournaments(t);
                if (t.length > 0) setSelectedTournament(t[0].tournamentId);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadTournaments();
    }, []);

    useEffect(() => {
        if (!selectedTournament) return;
        const loadData = async () => {
            try {
                const d = await getDisciplineImpact(selectedTournament);
                setData(d);
            } catch (e) {
                console.error(e);
            }
        };
        loadData();
    }, [selectedTournament]);

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Discipline vs Performance</h1>
                    <p className="text-muted text-sm">Analyze how card fractions coincide with league points.</p>
                </div>
                <div>
                    <select
                        className="h-10 px-3 py-2 rounded-md border border-glass-border bg-glass-panel text-foreground"
                        value={selectedTournament || ''}
                        onChange={(e) => setSelectedTournament(e.target.value)}
                        aria-label="Select Tournament"
                    >
                        {tournaments.map(t => (
                            <option key={t.tournamentId} value={t.tournamentId}>{t.tournamentName}</option>
                        ))}
                    </select>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Info className="w-5 h-5 text-blue-500" />
                        Impact Correlation
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                <XAxis type="number" dataKey="totalYellowCards" name="Yellow Cards">
                                    <Label value="Yellow Cards" offset={-10} position="insideBottom" fill="#888" />
                                </XAxis>
                                <YAxis type="number" dataKey="leaguePoints" name="League Points">
                                    <Label value="League Points" angle={-90} position="insideLeft" fill="#888" />
                                </YAxis>
                                <Tooltip cursor={{ strokeDasharray: '3 3' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const d = payload[0].payload as DisciplineCorrelation;
                                            return (
                                                <div className="bg-gray-800 p-2 rounded border border-gray-700 text-xs">
                                                    <p className="font-bold">{d.teamName}</p>
                                                    <p>Points: {d.leaguePoints}</p>
                                                    <p>Yellow Cards: {d.totalYellowCards}</p>
                                                    <p>Red Cards: {d.totalRedCards}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Scatter name="Teams" data={data} fill="#8884d8" shape="circle" />
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
