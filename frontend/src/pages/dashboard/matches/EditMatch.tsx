import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { PageHeader } from '@/components/PageHeader';
import { Input } from '@/components/Input';
import { Label } from '@/components/Label';
import { ArrowLeft } from '@phosphor-icons/react';
import { fetchTournaments } from '@/api/tournaments.api';
import { fetchTeams } from '@/api/teams.api';
import { updateMatch, fetchMatch } from '@/api/matches.api';
import { Team, Tournament } from '@/types';
import toast from 'react-hot-toast';

export const EditMatch = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);

    const [formData, setFormData] = useState({
        tournamentId: '',
        homeTeamId: '',
        awayTeamId: '',
        matchDate: '',
        kickOffTime: '',
        venue: ''
    });

    useEffect(() => {
        const loadData = async () => {
            if (!id) return;
            setFetching(true);
            try {
                const [tournamentsRes, teamsRes, matchRes] = await Promise.all([
                    fetchTournaments(),
                    fetchTeams(),
                    fetchMatch(id)
                ]);
                setTournaments(tournamentsRes.data as any);
                setTeams(teamsRes.data as any);

                const match = matchRes.data;
                setFormData({
                    tournamentId: match.tournamentId || '',
                    homeTeamId: match.homeTeamId || '',
                    awayTeamId: match.awayTeamId || '',
                    matchDate: match.matchDate?.split('T')[0] || '',
                    kickOffTime: match.kickOffTime || '',
                    venue: match.venue || ''
                });

            } catch (error) {
                console.error("Failed to load match data", error);
                toast.error("Failed to load match details");
                navigate('/dashboard/matches');
            } finally {
                setFetching(false);
            }
        };
        loadData();
    }, [id, navigate]);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;
        setLoading(true);

        try {
            await updateMatch(id, {
                matchDate: formData.matchDate,
                kickOffTime: formData.kickOffTime,
                venue: formData.venue,
                // Include other fields if your backend supports updating them, 
                // but the modal logic suggested mainly logistics were updated.
                // If teams/tournament can change, include them here.
                tournamentId: formData.tournamentId,
                homeTeamId: formData.homeTeamId,
                awayTeamId: formData.awayTeamId,
            });
            toast.success("Match updated successfully");
            navigate('/dashboard/matches');
        } catch (error: any) {
            console.error('Failed to update match', error);
            toast.error(error?.response?.data?.message || 'Failed to update match');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/matches')}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <PageHeader
                    title="Edit Match"
                    description="Update fixture details"
                />
            </div>

            <GlassCard className="max-w-2xl mx-auto p-8">
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Read-only tournament display vs Select - sticking to Modal logic where it used select for new but div for edit? 
                        Actually, the modal logic showed:
                        {mode === 'edit' ? ( ... Read-only Team Displays ... ) : ( ... Selects ... )}
                        But it allowed updating matchDate, kickOffTime, venue.
                        However, sometimes you DO want to reschedule or change teams (e.g. error entry).
                        I will make them Disabled Selects or Read-only inputs to be clearer, or just editable if the API supports it.
                        The modal logic seemed restrictive "Update existing match" only sent {matchDate, kickOffTime, venue}.
                        I will stick to that safe subset for now but display the other info clearly.
                    */}

                    <div className="space-y-2">
                        <Label>Tournament</Label>
                        <div className="w-full px-3 py-2 rounded-md glass-card border border-white/10 text-muted-foreground bg-white/5">
                            {tournaments.find(t => t.id === formData.tournamentId)?.name || 'Unknown Tournament'}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Home Team</Label>
                            <div className="w-full px-3 py-2 rounded-md glass-card border border-white/10 text-foreground font-medium bg-white/5">
                                {teams.find(t => t.id === formData.homeTeamId)?.name || 'Unknown Team'}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Away Team</Label>
                            <div className="w-full px-3 py-2 rounded-md glass-card border border-white/10 text-foreground font-medium bg-white/5">
                                {teams.find(t => t.id === formData.awayTeamId)?.name || 'Unknown Team'}
                            </div>
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
                            Save Changes
                        </Button>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
};
