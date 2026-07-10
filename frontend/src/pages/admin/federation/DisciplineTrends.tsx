import { useState, useEffect } from 'react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
} from '@/components/Card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/Table';
// Fallback to standard select if custom component is missing, or check list_dir output first.
// I will start by removing the custom Select import and just use standard HTML select or the correct one if found.
// The code below assumes standard HTML select for simplicity if custom one isn't found, 
// OR I wait for list_dir. But for now I will fix Card/Table.
import {
    ShieldWarning,
    Cards,
    Gavel,
    Trophy
} from '@phosphor-icons/react';
import {
    CompetitionHealthSummary,
    DisciplineSummary,
    getActiveTournamentsHealth,
    getDisciplineSummary
} from '@/api/federation.api';

export const DisciplineTrends = () => {
    const [tournaments, setTournaments] = useState<CompetitionHealthSummary[]>([]);
    const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
    const [disciplineData, setDisciplineData] = useState<DisciplineSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadTournaments = async () => {
            try {
                const data = await getActiveTournamentsHealth();
                setTournaments(data);
                if (data.length > 0) {
                    setSelectedTournament(data[0].tournamentId);
                }
            } catch (error) {
                console.error("Failed to load tournaments", error);
            } finally {
                setLoading(false);
            }
        };
        loadTournaments();
    }, []);

    useEffect(() => {
        if (!selectedTournament) return;

        const loadDisciplineData = async () => {
            try {
                const data = await getDisciplineSummary(selectedTournament);
                setDisciplineData(data);
            } catch (error) {
                console.error("Failed to load discipline data", error);
            }
        };
        loadDisciplineData();
    }, [selectedTournament]);

    const totalRed = disciplineData.reduce((acc, curr) => acc + curr.redCards, 0);
    const totalYellow = disciplineData.reduce((acc, curr) => acc + curr.yellowCards, 0);
    const mostDisciplined = [...disciplineData].sort((a, b) => a.totalInfractions - b.totalInfractions)[0];
    const mostPenalized = [...disciplineData].sort((a, b) => b.totalInfractions - a.totalInfractions)[0];

    if (loading) return <div className="p-6 text-foreground">Loading discipline data...</div>;

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-600">
                        Discipline Trends
                    </h1>
                    <p className="text-muted text-sm mt-1">
                        Monitor card infractions and team conduct across tournaments.
                    </p>
                </div>
                <div className="w-full md:w-64">
                    <div className="relative">
                        <select
                            aria-label="Filter by Tournament"
                            className="w-full h-10 px-3 py-2 text-sm rounded-md border border-glass-border bg-glass-panel text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                            value={selectedTournament || ''}
                            onChange={(e) => setSelectedTournament(e.target.value)}
                        >
                            {!selectedTournament && <option value="" disabled>Select Tournament</option>}
                            {tournaments.map((t) => (
                                <option key={t.tournamentId} value={t.tournamentId}>
                                    {t.tournamentName}
                                </option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-muted">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-glass-panel border-glass-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted">Total Red Cards</CardTitle>
                        <Cards className="w-4 h-4 text-red-500" weight="fill" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{totalRed}</div>
                        <p className="text-xs text-muted mt-1">This season</p>
                    </CardContent>
                </Card>
                <Card className="bg-glass-panel border-glass-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted">Total Yellow Cards</CardTitle>
                        <Cards className="w-4 h-4 text-yellow-500" weight="fill" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{totalYellow}</div>
                        <p className="text-xs text-muted mt-1">This season</p>
                    </CardContent>
                </Card>
                <Card className="bg-glass-panel border-glass-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted">Most Penalized</CardTitle>
                        <ShieldWarning className="w-4 h-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold text-foreground truncate">{mostPenalized?.teamName || "N/A"}</div>
                        <p className="text-xs text-muted mt-1">{mostPenalized?.totalInfractions || 0} infractions</p>
                    </CardContent>
                </Card>
                <Card className="bg-glass-panel border-glass-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted">Fair Play Award</CardTitle>
                        <Trophy className="w-4 h-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold text-foreground truncate">{mostDisciplined?.teamName || "N/A"}</div>
                        <p className="text-xs text-muted mt-1">{mostDisciplined?.totalInfractions || 0} infractions</p>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Table */}
            <Card className="bg-glass-panel border-glass-border">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Gavel className="w-5 h-5" /> Discipline Leaderboard
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-glass-border hover:bg-white/5">
                                <TableHead className="text-muted">Team</TableHead>
                                <TableHead className="text-muted text-center text-red-500 font-bold">Red Cards</TableHead>
                                <TableHead className="text-muted text-center text-yellow-500 font-bold">Yellow Cards</TableHead>
                                <TableHead className="text-muted text-right">Total Infractions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {disciplineData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted h-24">
                                        No discipline records found for this tournament.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                disciplineData.map((team) => (
                                    <TableRow key={team.teamId} className="border-glass-border hover:bg-white/5 transition-colors">
                                        <TableCell className="font-medium text-foreground">{team.teamName}</TableCell>
                                        <TableCell className="text-center">
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10 text-red-500 font-bold">
                                                {team.redCards}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/10 text-yellow-600 font-bold">
                                                {team.yellowCards}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-foreground">{team.totalInfractions}</TableCell>
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
