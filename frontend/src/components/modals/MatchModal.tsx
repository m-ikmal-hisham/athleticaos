import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Label } from '@/components/Label';
import { SearchableSelect } from '@/components/SearchableSelect';
import { fetchTournaments } from '@/api/tournaments.api';
import { fetchTeams } from '@/api/teams.api';
import { createMatch, updateMatch } from '@/api/matches.api';
import { Team, Match } from '@/types';

interface MatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    mode?: 'create' | 'edit';
    initialMatch?: Match;
}

export const MatchModal = ({ isOpen, onClose, onSuccess, mode = 'create', initialMatch }: MatchModalProps) => {
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
            // Pre-populate form in edit mode
            if (mode === 'edit' && initialMatch) {
                setFormData({
                    tournamentId: initialMatch.tournamentId || '',
                    homeTeamId: initialMatch.homeTeamId || '',
                    awayTeamId: initialMatch.awayTeamId || '',
                    matchDate: initialMatch.matchDate || '',
                    kickOffTime: initialMatch.kickOffTime || '',
                    venue: initialMatch.venue || ''
                });
            } else {
                // Reset form in create mode
                setFormData({
                    tournamentId: '',
                    homeTeamId: '',
                    awayTeamId: '',
                    matchDate: '',
                    kickOffTime: '',
                    venue: ''
                });
            }

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
    }, [isOpen, mode, initialMatch]);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (mode === 'edit' && initialMatch?.id) {
                // Update existing match
                await updateMatch(initialMatch.id, {
                    matchDate: formData.matchDate,
                    kickOffTime: formData.kickOffTime,
                    venue: formData.venue
                });
            } else {
                // Create new match
                await createMatch(formData);
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error(`Failed to ${mode} match`, error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={mode === 'edit' ? 'Edit Match' : 'New Match'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'edit' ? (
                    <>
                        {/* Read-only team display in edit mode */}
                        <div className="space-y-2">
                            <Label>Tournament</Label>
                            <div className="w-full px-3 py-2 rounded-md glass-card border border-white/10 text-muted-foreground">
                                {tournaments.find(t => t.id === formData.tournamentId)?.name || 'Loading...'}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Home Team</Label>
                                <div className="w-full px-3 py-2 rounded-md glass-card border border-white/10 text-foreground font-medium">
                                    {teams.find(t => t.id === formData.homeTeamId)?.name || 'Loading...'}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Away Team</Label>
                                <div className="w-full px-3 py-2 rounded-md glass-card border border-white/10 text-foreground font-medium">
                                    {teams.find(t => t.id === formData.awayTeamId)?.name || 'Loading...'}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Editable dropdowns in create mode */}
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
                        </div>

                        <div className="grid grid-cols-2 gap-4">
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
                    </>
                )}

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

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="cancel" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={loading}>
                        {mode === 'edit' ? 'Save Changes' : 'Create Match'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
