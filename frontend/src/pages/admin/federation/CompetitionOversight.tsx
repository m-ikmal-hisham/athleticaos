
import { useEffect, useState } from 'react';
import { getActiveTournamentsHealth, CompetitionHealthSummary } from '@/api/federation.api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/Table';
import { Badge } from '@/components/Badge';
import { ChartBar, CheckCircle, Warning } from '@phosphor-icons/react';

export const CompetitionOversight = () => {
    const [healthData, setHealthData] = useState<CompetitionHealthSummary[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getActiveTournamentsHealth();
                setHealthData(data);
            } catch (err) {
                console.error("Failed to load health metrics", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return <div>Loading oversight data...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Competition Oversight</h1>

            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Tournaments</CardTitle>
                        <ChartBar className="w-5 h-5 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{healthData.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Matches Pending</CardTitle>
                        <CheckCircle className="w-5 h-5 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {healthData.reduce((acc, curr) => acc + curr.pendingMatches, 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Blocking Issues</CardTitle>
                        <Warning className="w-5 h-5 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-500">
                            {healthData.reduce((acc, curr) => acc + curr.issueCount, 0)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Tournament Health Scorecard</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tournament</TableHead>
                                <TableHead>Matches (Done/Total)</TableHead>
                                <TableHead>Completion Rate</TableHead>
                                <TableHead>Overdue</TableHead>
                                <TableHead>Health Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {healthData.map(t => {
                                const progressStyle = { width: `${t.completionRate}%` };
                                return (
                                    <TableRow key={t.tournamentId}>
                                        <TableCell className="font-medium">{t.tournamentName}</TableCell>
                                        <TableCell>{t.completedMatches} / {t.totalMatches}</TableCell>
                                        <TableCell>
                                            <div className="w-full bg-secondary rounded-full h-2.5 dark:bg-gray-700 max-w-[100px]">
                                                <div className="bg-blue-600 h-2.5 rounded-full" {...{ style: progressStyle }}></div>
                                            </div>
                                            <span className="text-xs text-muted-foreground mt-1 block">{Math.round(t.completionRate)}%</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className={t.overdueMatches > 0 ? "text-red-500 font-bold" : "text-muted-foreground"}>
                                                {t.overdueMatches}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {t.issueCount === 0 ? (
                                                <Badge variant="success">Healthy</Badge>
                                            ) : t.issueCount < 5 ? (
                                                <Badge variant="warning">Attention</Badge>
                                            ) : (
                                                <Badge variant="destructive">Critical</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};
