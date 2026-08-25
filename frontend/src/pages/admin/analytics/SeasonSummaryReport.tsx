import { useState, useEffect } from 'react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent
} from '@/components/Card';
import { getActiveTournamentsHealth, CompetitionHealthSummary } from '@/api/federation.api';
import { getSeasonSummary, SeasonSummary } from '@/api/analytics.api';
import { Trophy, ChartLineUp, Flag } from '@phosphor-icons/react';
import { CompetitionFilterBar } from '@/components/common/CompetitionFilterBar';

export const SeasonSummaryReport = () => {
    const [tournaments, setTournaments] = useState<CompetitionHealthSummary[]>([]);
    const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
    const [summary, setSummary] = useState<SeasonSummary | null>(null);
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
                const s = await getSeasonSummary(selectedTournament);
                setSummary(s);
            } catch (e) {
                console.error(e);
            }
        };
        loadData();
    }, [selectedTournament]);

    if (loading) return <div>Loading...</div>;
    if (!summary) return <div>Select a tournament</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Season Summary</h1>
                    <p className="text-muted text-sm">High-level overview of the competition.</p>
                </div>
                <div>
                    <CompetitionFilterBar
                        tournaments={tournaments.map(t => ({
                            id: t.tournamentId,
                            name: t.tournamentName,
                        }))}
                        selectedTournamentId={selectedTournament}
                        onSelect={(id) => {
                            if (id) setSelectedTournament(id);
                        }}
                        allLabel={tournaments[0]?.tournamentName || 'Tournament'}
                        variant="admin"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Matches</CardTitle>
                        <ChartLineUp className="w-4 h-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.totalMatches}</div>
                        <p className="text-xs text-muted-foreground">{summary.completedMatches} completed</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Tries</CardTitle>
                        <Flag className="w-4 h-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.totalTries}</div>
                        <p className="text-xs text-muted-foreground">~{summary.completedMatches > 0 ? (summary.totalTries / summary.completedMatches).toFixed(1) : 0} per match</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Avg Points</CardTitle>
                        <ChartLineUp className="w-4 h-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.avgPointsPerMatch}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Highest Scoring</CardTitle>
                        <Trophy className="w-4 h-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold truncate">{summary.highestScoringTeam}</div>
                        <div className="text-xs text-muted-foreground">{summary.activeTeams} active teams</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
