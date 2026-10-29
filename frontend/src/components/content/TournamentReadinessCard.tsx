import { useEffect, useState, useCallback } from 'react';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { CheckCircle, WarningCircle, ArrowsClockwise, ShieldWarning } from '@phosphor-icons/react';
import { tournamentService, TournamentReadinessResponse, TournamentReadinessIssue } from '@/services/tournamentService';
import { showToast } from '@/lib/customToast';
import { useNavigate, useLocation } from 'react-router-dom';
import { Modal } from '@/components/Modal';
import { Label } from '@/components/Label';
import { SearchableSelect } from '@/components/SearchableSelect';

interface TournamentReadinessCardProps {
    tournamentId: string;
    onEditMatch?: (matchId: string) => void;
    /** Called after a stage has been assigned to a category, so the parent can reload its data. */
    onAssignCategory?: (stageId: string) => void;
    className?: string;
}

export function TournamentReadinessCard({
    tournamentId,
    onEditMatch,
    onAssignCategory,
    className = ''
}: TournamentReadinessCardProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [readiness, setReadiness] = useState<TournamentReadinessResponse | null>(null);
    const [notFound, setNotFound] = useState(false);
    // Assigning a category is done here, so the button works wherever the card is shown.
    const [stageToAssign, setStageToAssign] = useState<{ id: string; name?: string } | null>(null);
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [assigning, setAssigning] = useState(false);

    const fetchReadiness = useCallback(async (isManual = false) => {
        if (!tournamentId) return;
        setLoading(true);
        try {
            const data = await tournamentService.getReadiness(tournamentId);
            setReadiness(data);
            setNotFound(false);
            if (isManual) {
                showToast.info('Setup check completed.');
            }
        } catch (error: any) {
            if (error?.response?.status === 404) {
                setNotFound(true);
                return;
            }
            console.error('Failed to load tournament readiness', error);
            if (isManual) {
                showToast.error('Failed to check tournament setup.');
            }
        } finally {
            setLoading(false);
        }
    }, [tournamentId]);

    useEffect(() => {
        fetchReadiness();
    }, [fetchReadiness]);

    const openAssignCategory = async (issue: TournamentReadinessIssue) => {
        if (!issue.stageId) return;
        setStageToAssign({ id: issue.stageId, name: issue.stageName });
        setSelectedCategoryId('');
        try {
            const data = await tournamentService.getCategories(tournamentId);
            setCategories(data);
            if (data.length === 1) {
                setSelectedCategoryId(data[0].id);
            }
        } catch (error) {
            console.error('Failed to load categories', error);
            showToast.error('Could not load the categories.');
            setStageToAssign(null);
        }
    };

    const handleAssignCategory = async () => {
        if (!stageToAssign || !selectedCategoryId) return;
        setAssigning(true);
        try {
            await tournamentService.updateStage(tournamentId, stageToAssign.id, { categoryId: selectedCategoryId });
            showToast.success('Category assigned.');
            const stageId = stageToAssign.id;
            setStageToAssign(null);
            await fetchReadiness();
            onAssignCategory?.(stageId);
        } catch (error) {
            const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            showToast.error(message || 'Could not assign the category.');
        } finally {
            setAssigning(false);
        }
    };

    const handleNavigate = (tab: string) => {
        const searchParams = new URLSearchParams(location.search);
        searchParams.set('tab', tab);
        navigate(`${location.pathname}?${searchParams.toString()}`, { preventScrollReset: true });
    };

    const errors = readiness?.issues?.filter(i => i.severity === 'ERROR') || [];
    const warnings = readiness?.issues?.filter(i => i.severity === 'WARNING') || [];

    const renderAction = (issue: TournamentReadinessIssue) => {
        switch (issue.code) {
            case 'STAGE_WITHOUT_CATEGORY':
                if (issue.stageId) {
                    return (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openAssignCategory(issue)}
                        >
                            Assign category
                        </Button>
                    );
                }
                return null;
            case 'SLOT_WILL_NOT_SEED':
            case 'SLOT_EMPTY':
            case 'LOSER_WINNER_LINK_DUPLICATE':
            case 'MATCH_WITHOUT_TIME':
            case 'MATCH_TIME_CLASH':
                if (onEditMatch && issue.matchId) {
                    return (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onEditMatch(issue.matchId!)}
                        >
                            Edit match
                        </Button>
                    );
                }
                return null;
            case 'FORMAT_CONFIG_MISSING':
                return (
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleNavigate('format')}
                    >
                        Format tab
                    </Button>
                );
            case 'TEAM_WITHOUT_ROSTER':
                return (
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleNavigate('rosters')}
                    >
                        Rosters
                    </Button>
                );
            default:
                return null;
        }
    };

    if (notFound) {
        return null;
    }

    return (
        <GlassCard className={`p-4 md:p-5 ${className}`}>
            <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2 min-w-0">
                    <ShieldWarning className="w-5 h-5 text-navy dark:text-navy-tint shrink-0" />
                    <h3 className="text-sm md:text-base font-bold text-[var(--text-primary)]">
                        Setup check
                    </h3>
                    {readiness && (
                        <div className="flex items-center gap-1.5 ml-2">
                            {readiness.ok ? (
                                <Badge variant="success">Ready</Badge>
                            ) : (
                                <>
                                    {errors.length > 0 && (
                                        <Badge variant="danger">{errors.length} {errors.length === 1 ? 'error' : 'errors'}</Badge>
                                    )}
                                    {warnings.length > 0 && (
                                        <Badge variant="warning">{warnings.length} {warnings.length === 1 ? 'warning' : 'warnings'}</Badge>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchReadiness(true)}
                    isLoading={loading}
                    className="shrink-0 text-xs gap-1.5"
                >
                    <ArrowsClockwise className="w-4 h-4" />
                    Check again
                </Button>
            </div>

            {readiness?.ok ? (
                <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[var(--surface-sunken)] text-sm text-[var(--text-primary)]">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" weight="fill" />
                    <span className="font-medium">Ready — no problems found</span>
                </div>
            ) : (
                <div className="space-y-3">
                    {errors.length > 0 && (
                        <div className="space-y-1.5">
                            <div className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
                                Errors ({errors.length})
                            </div>
                            <div className="space-y-1">
                                {errors.map((issue, idx) => (
                                    <div
                                        key={`err-${idx}`}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-[var(--accent)]/5 border border-[var(--accent)]/20 text-xs"
                                    >
                                        <div className="flex items-start gap-2 min-w-0">
                                            <WarningCircle className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                                            <span className="text-[var(--text-primary)] leading-relaxed">
                                                {issue.message}
                                            </span>
                                        </div>
                                        <div className="shrink-0 self-end sm:self-center">
                                            {renderAction(issue)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {warnings.length > 0 && (
                        <div className="space-y-1.5">
                            <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                                Warnings ({warnings.length})
                            </div>
                            <div className="space-y-1">
                                {warnings.map((issue, idx) => (
                                    <div
                                        key={`warn-${idx}`}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-xs"
                                    >
                                        <div className="flex items-start gap-2 min-w-0">
                                            <WarningCircle className="w-4 h-4 text-[var(--text-secondary)] shrink-0 mt-0.5" />
                                            <span className="text-[var(--text-primary)] leading-relaxed">
                                                {issue.message}
                                            </span>
                                        </div>
                                        <div className="shrink-0 self-end sm:self-center">
                                            {renderAction(issue)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
            <Modal
                isOpen={stageToAssign !== null}
                onClose={() => setStageToAssign(null)}
                title="Assign category"
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                        {stageToAssign?.name ? `"${stageToAssign.name}"` : 'This stage'} has no category, so it is hidden on the
                        public site and skipped when slots are filled from group results. Its matches get the same category.
                    </p>
                    <div className="space-y-2">
                        <Label>Category <span className="text-[var(--accent-text)]">*</span></Label>
                        <SearchableSelect
                            value={selectedCategoryId}
                            onChange={(val) => setSelectedCategoryId(val as string)}
                            options={categories.map(c => ({ value: c.id, label: c.name }))}
                            placeholder="Select category"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="cancel" onClick={() => setStageToAssign(null)}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleAssignCategory} isLoading={assigning} disabled={!selectedCategoryId}>
                            Assign category
                        </Button>
                    </div>
                </div>
            </Modal>
        </GlassCard>
    );
}
