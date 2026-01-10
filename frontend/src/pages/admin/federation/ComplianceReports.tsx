
import { useEffect, useState } from 'react';
import { getAllComplianceIssues, ComplianceIssue } from '@/api/federation.api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/Table';
import { Badge } from '@/components/Badge';
import { Warning, WarningCircle, Info } from '@phosphor-icons/react';

export const ComplianceReports = () => {
    const [issues, setIssues] = useState<ComplianceIssue[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getAllComplianceIssues();
                setIssues(data);
            } catch (err) {
                console.error("Failed to load compliance issues", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'HIGH': return <Warning className="w-5 h-5 text-red-500" />;
            case 'MEDIUM': return <WarningCircle className="w-5 h-5 text-orange-500" />;
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    if (loading) return <div>Loading compliance reports...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Compliance Reports</h1>

            <div className="flex gap-4 mb-4">
                <Card className="flex-1 bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20">
                    <CardHeader>
                        <CardTitle className="text-red-700 dark:text-red-400">High Priority</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                            {issues.filter(i => i.severity === 'HIGH').length}
                        </div>
                    </CardContent>
                </Card>
                <Card className="flex-1">
                    <CardHeader>
                        <CardTitle>Total Open Issues</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{issues.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Active Issues List</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Severity</TableHead>
                                <TableHead>Issue Type</TableHead>
                                <TableHead>Tournament</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead>Description</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {issues.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">all good! No active compliance issues found.</TableCell>
                                </TableRow>
                            ) : (
                                issues.map((issue, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell className="flex items-center gap-2">
                                            {getSeverityIcon(issue.severity)}
                                            <span className="font-semibold text-xs">{issue.severity}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{issue.issueType}</Badge>
                                        </TableCell>
                                        <TableCell>{issue.tournamentName}</TableCell>
                                        <TableCell className="font-mono text-xs">{issue.matchDetails}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{issue.description}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};
