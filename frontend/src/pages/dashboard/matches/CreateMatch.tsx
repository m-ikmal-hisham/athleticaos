import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { PageHeader } from '@/components/PageHeader';
import { Input } from '@/components/Input';
import { Label } from '@/components/Label';
import { SearchableSelect } from '@/components/SearchableSelect';
import { ArrowLeft, Info } from '@phosphor-icons/react';
import { fetchTournaments } from '@/api/tournaments.api';
import { fetchTeams } from '@/api/teams.api';
import { createMatch } from '@/api/matches.api';
import { fetchMatchFormatTemplates, MatchFormatTemplate } from '@/api/matchFormats.api';
import { Team, Tournament } from '@/types';

import { showToast } from '@/lib/customToast';

export const CreateMatch = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);

    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [formatTemplates, setFormatTemplates] = useState<MatchFormatTemplate[]>([]);

    const [formData, setFormData] = useState({
        tournamentId: searchParams.get('tournamentId') || '',
        homeTeamId: '',
        awayTeamId: '',
        matchDate: '',
        kickOffTime: '',
        venue: ''
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const [tournamentsRes, teamsRes, formatsRes] = await Promise.all([
                    fetchTournaments(),
                    fetchTeams(),
                    fetchMatchFormatTemplates()
                ]);
                setTournaments(tournamentsRes.data as any);
                setTeams(teamsRes.data as any);
                setFormatTemplates(formatsRes.data as any);
            } catch (error) {
                console.error("Failed to load form data", error);
                showToast.error("Failed to load options");
            }
        };
        loadData();
    }, []);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await createMatch(formData);
            showToast.success("Match created successfully");
            navigate('/dashboard/matches');
        } catch (error: any) {
            console.error('Failed to create match', error);
            showToast.error(error?.response?.data?.message || 'Failed to create match');
        } finally {
            setLoading(false);
        }
    };

    // Derive format configuration
    const selectedFormatConfig = useMemo(() => {
        if (!formData.tournamentId) return null;
        const tournament = tournaments.find(t => t.id === formData.tournamentId);
        if (!tournament?.rugbyFormat) return null;

        // Map backend format to template code
        const mapCode = (code: string) => {
            if (code === 'XV') return 'RUGBY_XV';
            if (code === 'SEVENS') return 'RUGBY_7S';
            if (code === 'TENS') return 'RUGBY_10S';
            return code;
        };

        const targetCode = mapCode(tournament.rugbyFormat);
        return formatTemplates.find(f => f.formatCode === targetCode);
    }, [formData.tournamentId, tournaments, formatTemplates]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/matches')}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <PageHeader
                    title="Schedule New Match"
                    description="Set up a new fixture"
                />
            </div>

            <GlassCard className="max-w-2xl mx-auto p-8">
                <form onSubmit={handleSubmit} className="space-y-6">

                    <div className="space-y-2">
                        <Label>Tournament</Label>
                        <SearchableSelect
                            value={formData.tournamentId}
                            onChange={(value) => handleChange('tournamentId', value as string)}
                            options={[
                                { value: '', label: 'Select Tournament' },
                                ...tournaments.map(t => ({ value: t.id, label: t.name }))
                            ]}
                            placeholder="Select tournament"
                        />
                        {/* Dynamic Format Placeholder Display */}
                        {selectedFormatConfig && (
                            <div className="mt-2 p-3 bg-blue-50/10 border border-blue-500/20 rounded-md flex items-start gap-3 text-sm text-blue-200 animate-in fade-in slide-in-from-top-1">
                                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-semibold text-blue-400 mb-0.5">
                                        Match Format: {selectedFormatConfig.label}
                                    </div>
                                    <div className="text-xs text-blue-300/70">
                                        Using placeholder structure: {selectedFormatConfig.startingPlayers} starters, {selectedFormatConfig.substitutes} subs per team.
                                        Matches structured as {selectedFormatConfig.periods} x {selectedFormatConfig.periodDuration} mins.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Home Team</Label>
                            <SearchableSelect
                                value={formData.homeTeamId}
                                onChange={(value) => handleChange('homeTeamId', value as string)}
                                options={[
                                    { value: '', label: 'Select Home Team' },
                                    ...teams.map(t => ({ value: t.id, label: t.name }))
                                ]}
                                placeholder="Select home team"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Away Team</Label>
                            <SearchableSelect
                                value={formData.awayTeamId}
                                onChange={(value) => handleChange('awayTeamId', value as string)}
                                options={[
                                    { value: '', label: 'Select Away Team' },
                                    ...teams.map(t => ({ value: t.id, label: t.name }))
                                ]}
                                placeholder="Select away team"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input
                                type="date"
                                value={formData.matchDate}
                                onChange={(e) => handleChange('matchDate', e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Time</Label>
                            <Input
                                type="time"
                                value={formData.kickOffTime}
                                onChange={(e) => handleChange('kickOffTime', e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Venue</Label>
                        <Input
                            placeholder="Stadium or Field Name"
                            value={formData.venue}
                            onChange={(e) => handleChange('venue', e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                        <Button type="button" variant="cancel" onClick={() => navigate('/dashboard/matches')}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={loading}>
                            Create Match
                        </Button>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
};
