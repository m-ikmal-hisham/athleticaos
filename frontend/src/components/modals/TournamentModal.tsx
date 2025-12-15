import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { createTournament } from '@/api/tournaments.api';
import { fetchOrganisations } from '@/api/organisations.api';
import { Organisation } from '@/types';

interface TournamentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const TournamentModal = ({ isOpen, onClose, onSuccess }: TournamentModalProps) => {
    const [loading, setLoading] = useState(false);
    const [organisations, setOrganisations] = useState<Organisation[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        seasonName: '',
        competitionType: 'LEAGUE',
        level: 'CLUB',
        startDate: '',
        endDate: '',
        venue: '',
        organiserOrgId: ''
    });

    useEffect(() => {
        if (isOpen) {
            loadOrganisations();
        }
    }, [isOpen]);

    const loadOrganisations = async () => {
        try {
            const data = await fetchOrganisations();
            setOrganisations(data as any);
        } catch (error) {
            console.error('Failed to load organisations:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createTournament(formData);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to create tournament', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create New Tournament"
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Tournament Name</label>
                        <Input
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            placeholder="e.g. Super League 2024"
                            required
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Organiser</label>
                        <select
                            value={formData.organiserOrgId}
                            onChange={(e) => handleChange('organiserOrgId', e.target.value)}
                            className="w-full px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            required
                        >
                            <option value="">Select Organisation</option>
                            {organisations.map(org => (
                                <option key={org.id} value={org.id}>{org.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Competition Format</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Season</label>
                            <Input
                                value={formData.seasonName}
                                onChange={(e) => handleChange('seasonName', e.target.value)}
                                placeholder="e.g. 2024/2025"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Type</label>
                            <select
                                value={formData.competitionType}
                                onChange={(e) => handleChange('competitionType', e.target.value)}
                                className="w-full px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="LEAGUE">League</option>
                                <option value="KNOCKOUT">Knockout</option>
                                <option value="GROUP_KNOCKOUT">Group + Knockout</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Level</label>
                            <select
                                value={formData.level}
                                onChange={(e) => handleChange('level', e.target.value)}
                                className="w-full px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="INTERNATIONAL">International</option>
                                <option value="NATIONAL">National</option>
                                <option value="STATE">State</option>
                                <option value="DIVISION">Division</option>
                                <option value="CLUB">Club</option>
                                <option value="SCHOOL">School</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Logistics</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Venue</label>
                            <Input
                                value={formData.venue}
                                onChange={(e) => handleChange('venue', e.target.value)}
                                placeholder="Primary Venue"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Start Date</label>
                            <Input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => handleChange('startDate', e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">End Date</label>
                            <Input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => handleChange('endDate', e.target.value)}
                                required
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                    <Button type="button" variant="cancel" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" isLoading={loading}>
                        Create Tournament
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
