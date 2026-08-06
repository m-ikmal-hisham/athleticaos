import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Label } from '@/components/Label';
import { SearchableSelect } from '@/components/SearchableSelect';
import { Info } from '@phosphor-icons/react';
import { fetchTournaments, getTournamentTeams, getTournamentBracket } from '@/api/tournaments.api';
import { createMatch, updateMatch } from '@/api/matches.api';
import { fetchMatchFormatTemplates, MatchFormatTemplate } from '@/api/matchFormats.api';
import { Team, Match, Tournament } from '@/types';
import { useMatchesStore } from '@/store/matches.store';
import { showToast } from '@/lib/customToast';

interface MatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    mode?: 'create' | 'edit';
    initialMatch?: Match;
    defaultTournamentId?: string;
}

/** True for labels like "Pool A1" — a pool name followed by a finishing position. */
const isPoolPositionLabel = (label: string) => /^pool\s.*\d+$/i.test((label || '').trim());

export const MatchModal = ({ isOpen, onClose, onSuccess, mode = 'create', initialMatch, defaultTournamentId }: MatchModalProps) => {
    const [loading, setLoading] = useState(false);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [formatTemplates, setFormatTemplates] = useState<MatchFormatTemplate[]>([]);
    const { matches } = useMatchesStore();

    const [formData, setFormData] = useState({
        tournamentId: defaultTournamentId || '',
        homeSourceType: 'team',
        homeTeamId: '',
        homeFromWinnerOfMatchId: '',
        homeFromLoserOfMatchId: '',
        homeTeamPlaceholder: '',
        awaySourceType: 'team',
        awayTeamId: '',
        awayFromWinnerOfMatchId: '',
        awayFromLoserOfMatchId: '',
        awayTeamPlaceholder: '',
        matchDate: '',
        kickOffTime: '',
        venue: '',
        stageId: ''
    });

    useEffect(() => {
        if (isOpen) {
            // Pre-populate form in edit mode
            if (mode === 'edit' && initialMatch) {
                // Determine source logic for Home using the match's own feeder fields
                let hSource = 'team';
                let hTeam = initialMatch.homeTeamId || '';
                let hWin = '';
                let hLose = '';
                const hPlaceholder = initialMatch.homeTeamPlaceholder || '';

                if (initialMatch.homeFromWinnerOfMatchId) {
                    hSource = 'winner'; hWin = initialMatch.homeFromWinnerOfMatchId; hTeam = '';
                } else if (initialMatch.homeFromLoserOfMatchId) {
                    hSource = 'loser'; hLose = initialMatch.homeFromLoserOfMatchId; hTeam = '';
                } else if (!hTeam && hPlaceholder) {
                    // Generated brackets leave a label such as "Seed 1" until a team is known.
                    // Without this the slot rendered as an empty team picker, hiding what it holds.
                    // Detected by shape rather than by matching the pool list, because the stages
                    // load asynchronously and are not available yet on the first render.
                    hSource = isPoolPositionLabel(hPlaceholder) ? 'poolPosition' : 'placeholder';
                }

                // Determine source logic for Away using the match's own feeder fields
                let aSource = 'team';
                let aTeam = initialMatch.awayTeamId || '';
                let aWin = '';
                let aLose = '';
                const aPlaceholder = initialMatch.awayTeamPlaceholder || '';

                if (initialMatch.awayFromWinnerOfMatchId) {
                    aSource = 'winner'; aWin = initialMatch.awayFromWinnerOfMatchId; aTeam = '';
                } else if (initialMatch.awayFromLoserOfMatchId) {
                    aSource = 'loser'; aLose = initialMatch.awayFromLoserOfMatchId; aTeam = '';
                } else if (!aTeam && aPlaceholder) {
                    aSource = isPoolPositionLabel(aPlaceholder) ? 'poolPosition' : 'placeholder';
                }

                setFormData({
                    tournamentId: initialMatch.tournamentId || defaultTournamentId || '',
                    homeSourceType: hSource,
                    homeTeamId: hTeam,
                    homeFromWinnerOfMatchId: hWin,
                    homeFromLoserOfMatchId: hLose,
                    homeTeamPlaceholder: hPlaceholder,
                    awaySourceType: aSource,
                    awayTeamId: aTeam,
                    awayFromWinnerOfMatchId: aWin,
                    awayFromLoserOfMatchId: aLose,
                    awayTeamPlaceholder: aPlaceholder,
                    matchDate: initialMatch.matchDate || '',
                    kickOffTime: initialMatch.kickOffTime || '',
                    venue: initialMatch.venue || '',
                    stageId: initialMatch.stage?.id || ''
                });
            } else {
                // Reset form in create mode
                setFormData({
                    tournamentId: defaultTournamentId || '',
                    homeSourceType: 'team',
                    homeTeamId: '',
                    homeFromWinnerOfMatchId: '',
                    homeFromLoserOfMatchId: '',
                    homeTeamPlaceholder: '',
                    awaySourceType: 'team',
                    awayTeamId: '',
                    awayFromWinnerOfMatchId: '',
                    awayFromLoserOfMatchId: '',
                    awayTeamPlaceholder: '',
                    matchDate: '',
                    kickOffTime: '',
                    venue: '',
                    stageId: ''
                });
            }

            const loadReferenceData = async () => {
                try {
                    const [tournamentsRes, formatsRes] = await Promise.all([
                        fetchTournaments(),
                        fetchMatchFormatTemplates()
                    ]);
                    setTournaments(tournamentsRes.data as any);
                    setFormatTemplates(formatsRes.data as any);
                } catch (error) {
                    console.error("Failed to load reference data", error);
                }
            };
            loadReferenceData();
        }
    }, [isOpen, mode, initialMatch, defaultTournamentId, matches]);

    // Fetch teams when tournamentId changes
    useEffect(() => {
        const loadTeams = async () => {
            if (!formData.tournamentId) {
                setTeams([]);
                return;
            }

            try {
                // Try fetching tournament specific teams
                const res = await getTournamentTeams(formData.tournamentId);
                setTeams(res.data as any);
            } catch (error) {
                console.error("Failed to load tournament teams", error);
                // Fallback? Maybe not needed if requirement is strict.
                setTeams([]);
            }
        };
        loadTeams();
    }, [formData.tournamentId]);

    // Fetch stages when tournamentId changes
    const [stages, setStages] = useState<{id: string, name: string, groupStage?: boolean}[]>([]);
    useEffect(() => {
        const loadStages = async () => {
            if (!formData.tournamentId) {
                setStages([]);
                return;
            }

            try {
                const res = await getTournamentBracket(formData.tournamentId);
                const bracketStages = res.data?.stages?.map((s: any) => ({
                    id: s.stage.id,
                    name: s.stage.name,
                    groupStage: s.stage.groupStage,
                })) || [];
                setStages(bracketStages);
            } catch (error) {
                console.error("Failed to load tournament bracket stages", error);
                setStages([]);
            }
        };
        loadStages();
    }, [formData.tournamentId]);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Guard against a team being assigned to both slots of the same match
        if (
            formData.homeSourceType === 'team' &&
            formData.awaySourceType === 'team' &&
            formData.homeTeamId &&
            formData.homeTeamId === formData.awayTeamId
        ) {
            showToast.error('Home team and Away team cannot be the same.');
            return;
        }

        setLoading(true);

        const payload: any = {
            matchDate: formData.matchDate,
            kickOffTime: formData.kickOffTime,
            venue: formData.venue,
            stageId: formData.stageId || undefined
        };

        if (formData.homeSourceType === 'team') {
            payload.homeTeamId = formData.homeTeamId || undefined;
            payload.homeFromWinnerOfMatchId = null;
            payload.homeFromLoserOfMatchId = null;
        } else if (formData.homeSourceType === 'winner') {
            payload.homeTeamId = null;
            payload.homeFromWinnerOfMatchId = formData.homeFromWinnerOfMatchId || undefined;
            payload.homeFromLoserOfMatchId = null;
        } else if (formData.homeSourceType === 'loser') {
            payload.homeTeamId = null;
            payload.homeFromWinnerOfMatchId = null;
            payload.homeFromLoserOfMatchId = formData.homeFromLoserOfMatchId || undefined;
        } else if (formData.homeSourceType === 'placeholder' || formData.homeSourceType === 'poolPosition') {
            // Keep the slot unassigned but relabelled, so seeding can still fill it later.
            payload.homeFromWinnerOfMatchId = null;
            payload.homeFromLoserOfMatchId = null;
            payload.homeTeamPlaceholder = formData.homeTeamPlaceholder || undefined;
        }

        if (formData.awaySourceType === 'team') {
            payload.awayTeamId = formData.awayTeamId || undefined;
            payload.awayFromWinnerOfMatchId = null;
            payload.awayFromLoserOfMatchId = null;
        } else if (formData.awaySourceType === 'winner') {
            payload.awayTeamId = null;
            payload.awayFromWinnerOfMatchId = formData.awayFromWinnerOfMatchId || undefined;
            payload.awayFromLoserOfMatchId = null;
        } else if (formData.awaySourceType === 'loser') {
            payload.awayTeamId = null;
            payload.awayFromWinnerOfMatchId = null;
            payload.awayFromLoserOfMatchId = formData.awayFromLoserOfMatchId || undefined;
        } else if (formData.awaySourceType === 'placeholder' || formData.awaySourceType === 'poolPosition') {
            payload.awayFromWinnerOfMatchId = null;
            payload.awayFromLoserOfMatchId = null;
            payload.awayTeamPlaceholder = formData.awayTeamPlaceholder || undefined;
        }

        try {
            if (mode === 'edit' && initialMatch?.id) {
                // Update existing match
                await updateMatch(initialMatch.id, payload);
            } else {
                // Create new match
                payload.tournamentId = formData.tournamentId;
                await createMatch(payload);
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(`Failed to ${mode} match`, error);
            showToast.error(error?.response?.data?.message || `Failed to ${mode === 'edit' ? 'update' : 'create'} match`);
        } finally {
            setLoading(false);
        }
    };

    // Derive format configuration
    const selectedFormatConfig = useMemo(() => {
        if (!formData.tournamentId) return null;
        const tournament = tournaments.find(t => t.id === formData.tournamentId);
        if (!tournament?.rugbyFormat) return null;

        const mapCode = (code: string) => {
            if (code === 'XV') return 'RUGBY_XV';
            if (code === 'SEVENS') return 'RUGBY_7S';
            if (code === 'TENS') return 'RUGBY_10S';
            return code;
        };

        const targetCode = mapCode(tournament.rugbyFormat);
        return formatTemplates.find(f => f.formatCode === targetCode);
    }, [formData.tournamentId, tournaments, formatTemplates]);

    // Pools this slot can draw a finisher from. "Pool A1" means the winner of Pool A; the
    // backend resolves that label to a real team once the pool table is decided.
    const poolStageOptions = stages
        .filter(s => s.groupStage)
        .map(s => ({ value: s.name, label: s.name }));

    const POOL_POSITIONS = [1, 2, 3, 4, 5, 6, 7, 8];

    const ordinal = (n: number) => {
        if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
        switch (n % 10) {
            case 1: return `${n}st`;
            case 2: return `${n}nd`;
            case 3: return `${n}rd`;
            default: return `${n}th`;
        }
    };

    /** Splits a stored label such as "Pool A1" back into the pool and position it came from. */
    const splitPoolLabel = (label: string): { pool: string; position: number } | null => {
        const match = (label || '').match(/^(.*?)\s*(\d+)$/);
        if (!match) return null;
        return { pool: match[1].trim(), position: parseInt(match[2], 10) };
    };

    /** Keeps a stored pool visible even if the stage list has not loaded or no longer has it. */
    const poolOptionsIncluding = (current: string) => {
        const options = poolStageOptions.length > 0 ? [...poolStageOptions] : [];
        if (current && !options.some(o => o.value === current)) {
            options.unshift({ value: current, label: current });
        }
        return options.length > 0 ? options : [{ value: '', label: 'No pools in this tournament' }];
    };

    const poolSelectionFor = (placeholder: string) =>
        splitPoolLabel(placeholder) || { pool: poolStageOptions[0]?.value || '', position: 1 };

    const setPoolSelection = (side: 'home' | 'away', pool: string, position: number) => {
        handleChange(side === 'home' ? 'homeTeamPlaceholder' : 'awayTeamPlaceholder', `${pool}${position}`);
    };

    const availableMatchesOptions = matches
        .filter(m => m.id !== initialMatch?.id)
        .map(m => ({ 
            value: m.id, 
            label: `${m.matchCode || 'Match'} (${m.stage?.name || 'Unassigned'})` 
        }));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={mode === 'edit' ? 'Edit Match' : 'New Match'}>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                        disabled={mode === 'edit'}
                    />
                    {/* Dynamic Format Placeholder Display */}
                    {selectedFormatConfig && (
                        <div className="mt-2 p-3 bg-blue-50/10 border border-blue-500/20 rounded-md flex items-start gap-3 text-sm text-blue-200">
                            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                            <div>
                                <div className="font-semibold text-blue-400 mb-0.5">
                                    Match Format: {selectedFormatConfig.label}
                                </div>
                                <div className="text-xs text-blue-300/70">
                                    {selectedFormatConfig.startingPlayers} starters per side.
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-4 p-3 border border-white/10 rounded-md bg-white/5">
                        <Label>Home Opponent</Label>
                        <SearchableSelect
                            value={formData.homeSourceType}
                            onChange={(value) => {
                                handleChange('homeSourceType', value as string);
                                handleChange('homeTeamId', '');
                                handleChange('homeFromWinnerOfMatchId', '');
                                handleChange('homeFromLoserOfMatchId', '');
                            }}
                            options={[
                                { value: 'team', label: 'Specific Team' },
                                { value: 'winner', label: 'Winner of Match...' },
                                { value: 'loser', label: 'Loser of Match...' },
                                { value: 'placeholder', label: 'Seed / Placeholder' },
                                { value: 'poolPosition', label: 'Pool Position' }
                            ]}
                        />
                        {formData.homeSourceType === 'team' && (
                            <SearchableSelect
                                value={formData.homeTeamId}
                                onChange={(value) => handleChange('homeTeamId', value as string)}
                                options={[
                                    { value: '', label: 'Select Team' },
                                    ...teams.map(t => ({ value: t.id, label: t.name }))
                                ]}
                                placeholder="Select Home Team"
                            />
                        )}
                        {formData.homeSourceType === 'winner' && (
                            <SearchableSelect
                                value={formData.homeFromWinnerOfMatchId}
                                onChange={(value) => handleChange('homeFromWinnerOfMatchId', value as string)}
                                options={[{ value: '', label: 'Select Match' }, ...availableMatchesOptions]}
                                placeholder="Select Feeder Match"
                            />
                        )}
                        {formData.homeSourceType === 'loser' && (
                            <SearchableSelect
                                value={formData.homeFromLoserOfMatchId}
                                onChange={(value) => handleChange('homeFromLoserOfMatchId', value as string)}
                                options={[{ value: '', label: 'Select Match' }, ...availableMatchesOptions]}
                                placeholder="Select Feeder Match"
                            />
                        )}
                        {formData.homeSourceType === 'poolPosition' && (
                            <div className="space-y-2">
                                <SearchableSelect
                                    value={poolSelectionFor(formData.homeTeamPlaceholder).pool}
                                    onChange={(value) => setPoolSelection('home', value as string,
                                        poolSelectionFor(formData.homeTeamPlaceholder).position)}
                                    options={poolOptionsIncluding(poolSelectionFor(formData.homeTeamPlaceholder).pool)}
                                    placeholder="Select Pool"
                                />
                                <SearchableSelect
                                    value={String(poolSelectionFor(formData.homeTeamPlaceholder).position)}
                                    onChange={(value) => setPoolSelection('home',
                                        poolSelectionFor(formData.homeTeamPlaceholder).pool, Number(value))}
                                    options={POOL_POSITIONS.map(p => ({
                                        value: String(p),
                                        label: `${ordinal(p)} place`,
                                    }))}
                                    placeholder="Select Position"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Filled by Seed from Pools once that pool's table is decided.
                                </p>
                            </div>
                        )}
                        {formData.homeSourceType === 'placeholder' && (
                            <div className="space-y-1">
                                <Input
                                    value={formData.homeTeamPlaceholder}
                                    onChange={(e) => handleChange('homeTeamPlaceholder', e.target.value)}
                                    placeholder="e.g. Seed 1"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Label shown until a team is known. "Seed N" slots are filled by
                                    Seed from Pools.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4 p-3 border border-white/10 rounded-md bg-white/5">
                        <Label>Away Opponent</Label>
                        <SearchableSelect
                            value={formData.awaySourceType}
                            onChange={(value) => {
                                handleChange('awaySourceType', value as string);
                                handleChange('awayTeamId', '');
                                handleChange('awayFromWinnerOfMatchId', '');
                                handleChange('awayFromLoserOfMatchId', '');
                            }}
                            options={[
                                { value: 'team', label: 'Specific Team' },
                                { value: 'winner', label: 'Winner of Match...' },
                                { value: 'loser', label: 'Loser of Match...' },
                                { value: 'placeholder', label: 'Seed / Placeholder' },
                                { value: 'poolPosition', label: 'Pool Position' }
                            ]}
                        />
                        {formData.awaySourceType === 'team' && (
                            <SearchableSelect
                                value={formData.awayTeamId}
                                onChange={(value) => handleChange('awayTeamId', value as string)}
                                options={[
                                    { value: '', label: 'Select Team' },
                                    ...teams.map(t => ({ value: t.id, label: t.name }))
                                ]}
                                placeholder="Select Away Team"
                            />
                        )}
                        {formData.awaySourceType === 'winner' && (
                            <SearchableSelect
                                value={formData.awayFromWinnerOfMatchId}
                                onChange={(value) => handleChange('awayFromWinnerOfMatchId', value as string)}
                                options={[{ value: '', label: 'Select Match' }, ...availableMatchesOptions]}
                                placeholder="Select Feeder Match"
                            />
                        )}
                        {formData.awaySourceType === 'loser' && (
                            <SearchableSelect
                                value={formData.awayFromLoserOfMatchId}
                                onChange={(value) => handleChange('awayFromLoserOfMatchId', value as string)}
                                options={[{ value: '', label: 'Select Match' }, ...availableMatchesOptions]}
                                placeholder="Select Feeder Match"
                            />
                        )}
                        {formData.awaySourceType === 'poolPosition' && (
                            <div className="space-y-2">
                                <SearchableSelect
                                    value={poolSelectionFor(formData.awayTeamPlaceholder).pool}
                                    onChange={(value) => setPoolSelection('away', value as string,
                                        poolSelectionFor(formData.awayTeamPlaceholder).position)}
                                    options={poolOptionsIncluding(poolSelectionFor(formData.awayTeamPlaceholder).pool)}
                                    placeholder="Select Pool"
                                />
                                <SearchableSelect
                                    value={String(poolSelectionFor(formData.awayTeamPlaceholder).position)}
                                    onChange={(value) => setPoolSelection('away',
                                        poolSelectionFor(formData.awayTeamPlaceholder).pool, Number(value))}
                                    options={POOL_POSITIONS.map(p => ({
                                        value: String(p),
                                        label: `${ordinal(p)} place`,
                                    }))}
                                    placeholder="Select Position"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Filled by Seed from Pools once that pool's table is decided.
                                </p>
                            </div>
                        )}
                        {formData.awaySourceType === 'placeholder' && (
                            <div className="space-y-1">
                                <Input
                                    value={formData.awayTeamPlaceholder}
                                    onChange={(e) => handleChange('awayTeamPlaceholder', e.target.value)}
                                    placeholder="e.g. Seed 8"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Label shown until a team is known. "Seed N" slots are filled by
                                    Seed from Pools.
                                </p>
                            </div>
                        )}
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

                <div className="space-y-2">
                    <Label>Stage (Optional)</Label>
                    <SearchableSelect
                        value={formData.stageId}
                        onChange={(value) => handleChange('stageId', value as string)}
                        options={[
                            { value: '', label: 'Unassigned' },
                            ...stages.map(s => ({ value: s.id, label: s.name }))
                        ]}
                        placeholder="Select stage"
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
