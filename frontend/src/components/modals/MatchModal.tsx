import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Label } from '@/components/Label';
import { fetchTournaments } from '@/api/tournaments.api';
import { fetchTeams } from '@/api/teams.api';
import { createMatch } from '@/api/matches.api';
import { Team } from '@/types';

interface MatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const MatchModal = ({ isOpen, onClose, onSuccess }: MatchModalProps) => {
    const [loading, setLoading] = useState(false);
    const [tournaments, setTournaments] = useState<any[]>([]);
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
        if (isOpen) {
            const loadData = async () => {
                try {
                    const [tournamentsRes, teamsRes] = await Promise.all([
                        fetchTournaments(),
                        fetchTeams()
                    ]);
                    setTournaments(tournamentsRes.data);
                    setTeams(teamsRes.data);
                } catch (error) {
                    console.error("Failed to load form data", error);
                }
            };
            loadData();
        }
    }, [isOpen]);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await createMatch(formData);
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to create match", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="New Match">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label>Tournament</Label>
                    <select
                        className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        value={formData.tournamentId}
                        onChange={(e) => handleChange('tournamentId', e.target.value)}
                        required
                    >
                        <option value="">Select Tournament</option>
                        {tournaments.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Home Team</Label>
                        <select
                            className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            value={formData.homeTeamId}
                            onChange={(e) => handleChange('homeTeamId', e.target.value)}
                            required
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
                            className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            value={formData.awayTeamId}
                            onChange={(e) => handleChange('awayTeamId', e.target.value)}
                            required
                        >
                            <option value="">Select Away Team</option>
                            {teams.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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

                <div className="flex justify-end pt-4">
                    <Button type="button" variant="cancel" className="mr-2" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={loading}>
                        Create Match
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
