import { useState } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card, CardContent } from '@/components/Card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/Table';
import { Badge } from '@/components/Badge';

const MOCK_MATCHES = [
    { id: 1, home: 'Cobra RC', away: 'KL Tigers', date: '2025-01-10 16:00', venue: 'Bukit Jalil', score: '-', status: 'Scheduled' },
    { id: 2, home: 'Dingoes RC', away: 'Falcon RC', date: '2025-01-10 18:00', venue: 'Bukit Jalil', score: '-', status: 'Scheduled' },
    { id: 3, home: 'Serdang Angels', away: 'UiTM Lions', date: '2025-01-11 16:00', venue: 'UM Arena', score: '24 - 12', status: 'Completed' },
];

export const Matches = () => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredMatches = MOCK_MATCHES.filter(m =>
        m.home.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.away.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <PageHeader
                title="Matches"
                description="View and manage match schedules and results."
                action={
                    <Button className="gap-2">
                        <Plus className="w-4 h-4" />
                        New Match
                    </Button>
                }
            />

            <Card>
                <CardContent className="p-0">
                    <div className="p-4 flex flex-col md:flex-row gap-4 border-b border-glass-border">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                            <Input
                                placeholder="Search matches..."
                                className="pl-9 bg-glass-bg/50"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" className="gap-2">
                            <Filter className="w-4 h-4" />
                            Filters
                        </Button>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date & Time</TableHead>
                                <TableHead>Home Team</TableHead>
                                <TableHead>Away Team</TableHead>
                                <TableHead>Venue</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredMatches.map((m) => (
                                <TableRow key={m.id}>
                                    <TableCell className="font-mono text-xs">{m.date}</TableCell>
                                    <TableCell className="font-medium">{m.home}</TableCell>
                                    <TableCell className="font-medium">{m.away}</TableCell>
                                    <TableCell>{m.venue}</TableCell>
                                    <TableCell className="font-bold">{m.score}</TableCell>
                                    <TableCell>
                                        <Badge variant={m.status === 'Completed' ? 'secondary' : 'primary'}>
                                            {m.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm">Details</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};
