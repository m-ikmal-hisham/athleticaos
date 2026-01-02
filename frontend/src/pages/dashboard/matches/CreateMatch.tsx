import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { PageHeader } from '@/components/PageHeader';
import { Input } from '@/components/Input';
import { Label } from '@/components/Label';
import { ArrowLeft } from '@phosphor-icons/react';
import { fetchTournaments } from '@/api/tournaments.api';
import { fetchTeams } from '@/api/teams.api';
import { createMatch } from '@/api/matches.api';
import { Team, Tournament } from '@/types';

import { showToast } from '@/lib/customToast';

export const CreateMatch = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);

    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);

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
                const [tournamentsRes, teamsRes] = await Promise.all([
                    fetchTournaments(),
                    fetchTeams()
                ]);
                setTournaments(tournamentsRes.data as any);
                setTeams(teamsRes.data as any);
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
                        <select
                            className="w-full h-10 px-3 rounded-md glass-card border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                            value={formData.tournamentId}
                            onChange={(e) => handleChange('tournamentId', e.target.value)}
                            required
                            aria-label="Select Tournament"
                        >
                            <option value="">Select Tournament</option>
                            {tournaments.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Home Team</Label>
                            <select
                                className="w-full h-10 px-3 rounded-md glass-card border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                                value={formData.homeTeamId}
                                onChange={(e) => handleChange('homeTeamId', e.target.value)}
                                required
                                aria-label="Select Home Team"
                            >
                                <option value="">Select Home Team</option>
                                {teams.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label>Away Team</Label>
                            <select
                                className="w-full h-10 px-3 rounded-md glass-card border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                                value={formData.awayTeamId}
                                onChange={(e) => handleChange('awayTeamId', e.target.value)}
                                required
                                aria-label="Select Away Team"
                            >
                                <option value="">Select Away Team</option>
                                {teams.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
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
