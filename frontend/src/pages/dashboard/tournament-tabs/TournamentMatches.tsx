import { useEffect, useState, useMemo, useRef } from 'react';
import { CalendarBlank, Plus, Clock, Trash, PencilSimple, WarningCircle, DownloadSimple, MapPin, ArrowsClockwise, CaretDown } from '@phosphor-icons/react';
import { useMatchesStore } from '@/store/matches.store';
import { tournamentService } from '@/services/tournamentService';
import { exportMatches, exportResults, renumberMatches } from '@/api/tournaments.api';
import { Match, MatchResponse, TournamentCategory, TournamentStageResponse, TournamentVenue } from '@/types';
import { Button } from '@/components/Button';
import { useNavigate } from 'react-router-dom';
import { showToast } from '@/lib/customToast';
import { formatMatchStatus, formatTeamShortName } from '@/utils/formatters';
import { getImageUrl } from '@/utils/image';
import { formatMatchVenueLabel, hasMultipleVenues } from '@/utils/venue';

import { ConfirmModal } from '@/components/ConfirmModal';
import { MatchModal } from '@/components/modals/MatchModal';
import { SearchableSelect } from '@/components/SearchableSelect';
import { BracketEditor } from '@/components/content/BracketEditor';

interface TournamentMatchesProps {
    tournamentId: string;
    tournamentSlug?: string;
}

interface VenueGroup {
    venueName: string;
    matches: MatchResponse[];
}

export function TournamentMatches({ tournamentId, tournamentSlug }: TournamentMatchesProps) {
    const navigate = useNavigate();
    const { matches, loadMatchesByTournament, deleteMatch, loadingList } = useMatchesStore();
    const [categories, setCategories] = useState<TournamentCategory[]>([]);
    const [tournamentVenues, setTournamentVenues] = useState<TournamentVenue[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedVenue, setSelectedVenue] = useState<string>('');
    const [exportingType, setExportingType] = useState<'matches' | 'results' | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [tournamentStages, setTournamentStages] = useState<TournamentStageResponse[]>([]);

    // Filtered matches
    const [scheduledMatches, setScheduledMatches] = useState<Match[]>([]);
    const [unscheduledMatches, setUnscheduledMatches] = useState<Match[]>([]);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editMatch, setEditMatch] = useState<Match | null>(null); // If set, shows Edit Modal
    const [clearScheduleStep, setClearScheduleStep] = useState<'NONE' | 'CONFIRM'>('NONE');
    const [renumbering, setRenumbering] = useState(false);
    const [actionsOpen, setActionsOpen] = useState(false);
    const actionsRef = useRef<HTMLDivElement>(null);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        variant: 'primary' as 'primary' | 'destructive',
        confirmText: 'Confirm'
    });

    const hasMultiVenues = useMemo(() => hasMultipleVenues(matches), [matches]);

    const handleRenumberMatches = async () => {
        const identifier = tournamentSlug || tournamentId;
        if (!identifier) return;
        setRenumbering(true);
        try {
            const previewRes = await renumberMatches(identifier, { dryRun: true });
            const preview = previewRes.data;
            if (preview.matchesChanged === 0) {
                showToast.info('Match numbers are already sequential by venue and schedule.');
                return;
            }

            const venueLines = (preview.venueBreakdown || [])
                .map((v) => `• ${v.venueName || v.venue || 'Venue TBC'}: ${v.matchCount} matches`)
                .join('\n');

            setConfirmModal({
                isOpen: true,
                title: 'Renumber matches by venue and schedule?',
                message: `This will renumber ${preview.matchesChanged} of ${preview.matchesTotal} matches sequentially per venue. Unscheduled matches will be numbered last.\n\n${venueLines}`,
                confirmText: 'Renumber Matches',
                variant: 'primary',
                onConfirm: async () => {
                    try {
                        setRenumbering(true);
                        const resultRes = await renumberMatches(identifier, { dryRun: false });
                        showToast.success(`Successfully renumbered ${resultRes.data.matchesChanged} matches.`);
                        setRefreshTrigger(prev => prev + 1);
                    } catch (err: unknown) {
                        const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to renumber matches';
                        showToast.error(message);
                    } finally {
                        setRenumbering(false);
                    }
                }
            });
        } catch (err: unknown) {
            const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to preview renumbering';
            showToast.error(message);
        } finally {
            setRenumbering(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [tournamentId, refreshTrigger]);

    // Reset selected venue when category changes
    useEffect(() => {
        setSelectedVenue('');
    }, [selectedCategoryId]);

    // Close the actions menu when clicking outside it, the way SearchableSelect does.
    useEffect(() => {
        if (!actionsOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
                setActionsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [actionsOpen]);

    // Matches filtered by category
    const categoryFilteredMatches = useMemo(() => {
        if (!selectedCategoryId) return matches;
        return matches.filter(m => m.stage?.categoryId === selectedCategoryId);
    }, [matches, selectedCategoryId]);

    // Fetch tournament venues
    useEffect(() => {
        if (!tournamentId) return;
        tournamentService.getVenues(tournamentId)
            .then(res => setTournamentVenues(res || []))
            .catch(err => {
                console.error("Failed to load tournament venues", err);
                setTournamentVenues([]);
            });
    }, [tournamentId, refreshTrigger]);

    const venueOptions = useMemo(() => {
        const registered = tournamentVenues.map(v => ({ value: v.id, label: v.name }));
        const hasTbc = categoryFilteredMatches.some(m => !m.venueId && (!m.venue || !m.venue.trim()));

        // Also check if any category-filtered match has an unlinked string venue
        const registeredIds = new Set(tournamentVenues.map(v => v.id));
        const registeredNames = new Set(tournamentVenues.map(v => v.name.toLowerCase()));
        const extraStringVenues: { value: string; label: string }[] = [];
        categoryFilteredMatches.forEach(m => {
            if (m.venueId && !registeredIds.has(m.venueId)) {
                // Not in registered list
            } else if (!m.venueId && m.venue && m.venue.trim() && !registeredNames.has(m.venue.trim().toLowerCase())) {
                const name = m.venue.trim();
                if (!extraStringVenues.some(x => x.label.toLowerCase() === name.toLowerCase())) {
                    extraStringVenues.push({ value: name, label: name });
                }
            }
        });

        const allOptions = [...registered, ...extraStringVenues];
        const total = allOptions.length + (hasTbc ? 1 : 0);
        if (total < 2) return [];

        return [
            { value: '', label: 'All venues' },
            ...allOptions,
            ...(hasTbc ? [{ value: '__TBC__', label: 'Venue TBC' }] : [])
        ];
    }, [tournamentVenues, categoryFilteredMatches]);

    useEffect(() => {
        // Filter matches by venue if selected
        let filtered = categoryFilteredMatches;
        if (selectedVenue === '__TBC__') {
            filtered = filtered.filter(m => !m.venueId && (!m.venue || !m.venue.trim()));
        } else if (selectedVenue) {
            filtered = filtered.filter(m => m.venueId === selectedVenue || m.venue?.trim() === selectedVenue);
        }

        // Split matches
        const scheduled = filtered.filter(m => m.matchDate && m.kickOffTime);
        const unscheduled = filtered.filter(m => !m.matchDate || !m.kickOffTime);

        // Sort scheduled by Date then Time
        scheduled.sort((a, b) => {
            const dateA = new Date(`${a.matchDate}T${a.kickOffTime}`);
            const dateB = new Date(`${b.matchDate}T${b.kickOffTime}`);
            return dateA.getTime() - dateB.getTime();
        });

        setScheduledMatches(scheduled);
        setUnscheduledMatches(unscheduled);
    }, [categoryFilteredMatches, selectedVenue]);

    const loadData = async () => {
        try {
            const [categoriesData, bracketData] = await Promise.all([
                tournamentService.getCategories(tournamentId),
                tournamentService.getBracket(tournamentId)
            ]);
            
            setCategories(categoriesData);
            setTournamentStages(bracketData?.stages?.map((s: any) => s.stage) || []);
            await loadMatchesByTournament(tournamentId);
        } catch (error) {
            console.error('Failed to load data:', error);
            showToast.error('Failed to load tournaments data');
        }
    };

    const handleMatchSaved = () => {
        setRefreshTrigger(prev => prev + 1);
        closeModal();
    };

    const handleDeleteMatch = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();

        setConfirmModal({
            isOpen: true,
            title: 'Delete Match',
            message: 'Are you sure you want to delete this match?',
            confirmText: 'Delete',
            variant: 'destructive',
            onConfirm: async () => {
                try {
                    await deleteMatch(id);
                    showToast.success('Match deleted');
                    // No need to trigger refresh as store updates automatically
                } catch (error) {
                    showToast.error('Failed to delete match');
                }
            }
        });
    };

    const handleClearSchedule = async (keepStructure: boolean) => {
        try {
            // TODO: Ideally clearSchedule should support categoryId too, 
            // but for now let's assume global clear or updated service invocation if supported.
            // Backend supports it now, but frontend service needs update? 
            // Let's stick to global clear for safety or full reset, 
            // unless user specifically wants "Clear This Category".
            // Current UI is "Clear Schedule", implying global.
            await tournamentService.clearSchedule(tournamentId, keepStructure);
            showToast.success(keepStructure ? 'Matches cleared (Structure kept)' : 'Schedule fully reset');
            setClearScheduleStep('NONE');
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Failed to clear schedule:', error);
            showToast.error('Failed to clear schedule');
        }
    };

    const handleExport = async (type: 'matches' | 'results') => {
        try {
            setExportingType(type);
            const response = type === 'matches'
                ? await exportMatches(tournamentId)
                : await exportResults(tournamentId);

            const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const slug = tournamentSlug || tournamentId;
            link.setAttribute('download', `${type}-${slug}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(`Failed to export ${type}:`, error);
            showToast.error(`Failed to export ${type}`);
        } finally {
            setExportingType(null);
        }
    };

    const openCreateModal = () => {
        setEditMatch(null);
        setShowCreateModal(true);
    };

    const openEditModal = (match: MatchResponse, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditMatch(match);
        setShowCreateModal(true);
    };

    const closeModal = () => {
        setShowCreateModal(false);
        setEditMatch(null);
    };

    // Grouping Logic for Scheduled Matches (By Date)
    const matchesByDate: { [key: string]: MatchResponse[] } = {};
    scheduledMatches.forEach(match => {
        const dateKey = match.matchDate; // Assuming YYYY-MM-DD
        if (!matchesByDate[dateKey]) {
            matchesByDate[dateKey] = [];
        }
        matchesByDate[dateKey].push(match);
    });

    // Sort dates (always earliest first)
    const sortedDates = Object.keys(matchesByDate).sort((a, b) => a.localeCompare(b));

    function groupDateMatchesByVenue(dateMatches: MatchResponse[]): { hasMultipleVenues: boolean; groups: VenueGroup[] } {
        const venues = new Set<string>();
        let hasTbc = false;
        dateMatches.forEach(m => {
            if (m.venue && m.venue.trim()) {
                venues.add(m.venue.trim());
            } else {
                hasTbc = true;
            }
        });

        const totalVenues = venues.size + (hasTbc ? 1 : 0);

        const sortMatches = (items: MatchResponse[]) => {
            return [...items].sort((a, b) => {
                const tA = a.kickOffTime || '';
                const tB = b.kickOffTime || '';
                return tA.localeCompare(tB);
            });
        };

        if (totalVenues < 2) {
            return {
                hasMultipleVenues: false,
                groups: [{ venueName: '', matches: sortMatches(dateMatches) }]
            };
        }

        const sortedVenueNames = Array.from(venues).sort((a, b) => a.localeCompare(b));
        const groups: VenueGroup[] = [];

        sortedVenueNames.forEach(vName => {
            const venueMatches = dateMatches.filter(m => m.venue?.trim() === vName);
            groups.push({ venueName: vName, matches: sortMatches(venueMatches) });
        });

        if (hasTbc) {
            const tbcMatches = dateMatches.filter(m => !m.venue || !m.venue.trim());
            groups.push({ venueName: 'Venue TBC', matches: sortMatches(tbcMatches) });
        }

        return { hasMultipleVenues: true, groups };
    }

    // Grouping for the Unscheduled panel — disabled with the panel itself; see the note in the
    // render below. Kept here so restoring the panel is a single uncomment in each place.
    // const unscheduledByStage: { [key: string]: MatchResponse[] } = {};
    // unscheduledMatches.forEach(match => {
    //     const stageName = match.stage?.name || 'Unassigned';
    //     if (!unscheduledByStage[stageName]) unscheduledByStage[stageName] = [];
    //     unscheduledByStage[stageName].push(match);
    // });
    // const sortedUnscheduledStages = Object.keys(unscheduledByStage).sort();

    const categoryOptions = [
        { value: '', label: 'All Categories' },
        ...categories.map(c => ({ value: c.id, label: c.name }))
    ];

    return (
        <div className="space-y-6">
            {/* Header: title and actions on one row, filters on their own row below. */}
            <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CalendarBlank className="w-6 h-6 text-primary" />
                    Matches ({matches.length})
                </h3>

                <div className="flex flex-wrap gap-2">
                    {/* Exports and renumbering live behind one menu so the row stays readable. */}
                    <div className="relative" ref={actionsRef}>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setActionsOpen(open => !open)}
                            disabled={exportingType !== null || renumbering}
                            className="flex items-center gap-2"
                        >
                            <DownloadSimple className="w-4 h-4" />
                            Actions
                            <CaretDown className="w-3 h-3" />
                        </Button>

                        {actionsOpen && (
                            <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 space-y-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-xs flex items-center gap-2"
                                    disabled={exportingType !== null}
                                    onClick={() => { setActionsOpen(false); handleExport('matches'); }}
                                >
                                    <DownloadSimple className="w-4 h-4" />
                                    Export matches (CSV)
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-xs flex items-center gap-2"
                                    disabled={exportingType !== null}
                                    onClick={() => { setActionsOpen(false); handleExport('results'); }}
                                >
                                    <DownloadSimple className="w-4 h-4" />
                                    Export results (CSV)
                                </Button>
                                {matches.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start text-xs flex items-center gap-2"
                                        disabled={renumbering}
                                        title="Renumber matches sequentially per venue in schedule order"
                                        onClick={() => { setActionsOpen(false); handleRenumberMatches(); }}
                                    >
                                        <ArrowsClockwise className={`w-4 h-4 ${renumbering ? 'animate-spin' : ''}`} />
                                        Renumber matches
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                    {matches.length > 0 && (
                        <div className="relative">
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => setClearScheduleStep('CONFIRM')}
                                className="flex items-center gap-2"
                            >
                                <Trash className="w-4 h-4" />
                                Clear Schedule
                            </Button>

                            {/* Clear Confirmation Dropdown/Popover Mockup */}
                            {clearScheduleStep === 'CONFIRM' && (
                                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 p-4 z-50">
                                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Clear Schedule?</h4>
                                    <div className="space-y-2">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="w-full justify-start text-xs"
                                            onClick={() => handleClearSchedule(true)}
                                        >
                                            Clear Matches Only (Keep Groups)
                                        </Button>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            className="w-full justify-start text-xs"
                                            onClick={() => handleClearSchedule(false)}
                                        >
                                            Reset All (Format & Matches)
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full text-xs"
                                            onClick={() => setClearScheduleStep('NONE')}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <Button onClick={openCreateModal} className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        New Match
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="w-full sm:w-64">
                    <SearchableSelect
                        options={categoryOptions}
                        value={selectedCategoryId || ''}
                        onChange={(val) => setSelectedCategoryId(val ? String(val) : null)}
                        placeholder="Filter by Category"
                        className="bg-white dark:bg-slate-800"
                    />
                </div>
                {venueOptions.length > 0 && (
                    <div className="w-full sm:w-64">
                        <SearchableSelect
                            options={venueOptions}
                            value={selectedVenue}
                            onChange={(val) => setSelectedVenue(val ? String(val) : '')}
                            placeholder="Filter by Venue"
                            className="bg-white dark:bg-slate-800"
                        />
                    </div>
                )}
            </div>
            </div>

            {/* Bracket Editor Section */}
            {!loadingList && (
                <div className="mb-8 p-6 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <BracketEditor 
                        tournamentId={tournamentId}
                        stages={tournamentStages}
                        matches={matches}
                        onMatchEdit={(match) => openEditModal(match, { stopPropagation: () => {} } as any)}
                        onRefresh={() => setRefreshTrigger(prev => prev + 1)}
                        selectedCategoryId={selectedCategoryId}
                    />
                </div>
            )}

            {loadingList ? (
                <div className="text-center py-12 text-slate-500 animate-pulse">Loading matches...</div>
            ) : matches.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                    <CalendarBlank className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">No matches scheduled</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Generate a schedule in the Format tab or create matches manually.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    {/* Main Schedule Area — full width while the Unscheduled panel is disabled. */}
                    <div className="space-y-8">
                        {/* The schedule below only lists matches that have a date and a kick-off
                            time, so without this banner an undated match would render nowhere at
                            all. That cannot happen today — the API marks both @NotNull — but if
                            those constraints are ever relaxed for "date TBC" fixtures, this makes
                            the gap visible instead of silently hiding matches. */}
                        {unscheduledMatches.length > 0 && (
                            <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10 flex items-start gap-3">
                                <WarningCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-semibold text-amber-900 dark:text-amber-200">
                                        {unscheduledMatches.length} {unscheduledMatches.length === 1 ? 'match has' : 'matches have'} no date or kick-off time
                                    </p>
                                    <p className="text-amber-800/80 dark:text-amber-200/70 mt-0.5">
                                        They are not shown in the schedule below. Open each from the Matches list and set a date and time.
                                    </p>
                                </div>
                            </div>
                        )}
                        {scheduledMatches.length === 0 && (
                            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                <p className="text-slate-500">No scheduled matches{selectedCategoryId ? ' for this category' : ''}.</p>
                            </div>
                        )}
                        {sortedDates.map(date => {
                            const dateMatches = matchesByDate[date];
                            const { hasMultipleVenues, groups } = groupDateMatchesByVenue(dateMatches);

                            return (
                                <div key={date} className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white bg-white/50 dark:bg-slate-900/50 backdrop-blur px-4 py-1 rounded-full border border-slate-200/50 dark:border-slate-700/50">
                                            {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </h3>
                                        <div className="h-px flex-1 bg-gradient-to-r from-slate-200 dark:from-slate-800 to-transparent" />
                                    </div>
                                    {hasMultipleVenues ? (
                                        <div className="space-y-6">
                                            {groups.map(group => (
                                                <div key={group.venueName} className="space-y-3">
                                                    <div className="flex items-center gap-2 px-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                        <MapPin className="w-4 h-4 text-primary" />
                                                        <span>{group.venueName}</span>
                                                        <span className="text-xs font-normal text-slate-400">({group.matches.length})</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                                        {group.matches.map(match => (
                                                            <MatchCard
                                                                key={match.id}
                                                                match={match}
                                                                onClick={() => navigate(`/dashboard/matches/${match.id}`)}
                                                                onEdit={(e) => openEditModal(match, e)}
                                                                onDelete={(e) => handleDeleteMatch(match.id, e)}
                                                                hasMultiVenues={hasMultiVenues}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                            {groups[0].matches.map(match => (
                                                <MatchCard
                                                    key={match.id}
                                                    match={match}
                                                    onClick={() => navigate(`/dashboard/matches/${match.id}`)}
                                                    onEdit={(e) => openEditModal(match, e)}
                                                    onDelete={(e) => handleDeleteMatch(match.id, e)}
                                                    hasMultiVenues={hasMultiVenues}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Unscheduled panel — DISABLED.
                        It listed matches missing a date or kick-off time, but no such match can
                        exist: MatchCreateRequest marks matchDate and kickOffTime @NotNull, and the
                        update path treats null as "leave unchanged", so neither can be cleared.
                        Across all 13 staging tournaments (844 matches) there were zero. The panel
                        only ever rendered "All matches scheduled!" while holding a quarter of the
                        width, so the schedule now spans the full row.

                        The database columns are nullable, so unscheduled matches remain
                        representable. If a "date TBC" fixture is ever wanted, relax those two
                        @NotNull constraints and restore this block along with the lg:grid-cols-4
                        wrapper and lg:col-span-3 on the schedule column above. */}
                    {/*
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800 sticky top-4">
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                                <WarningCircle className="w-4 h-4 text-amber-500" />
                                Unscheduled ({unscheduledMatches.length})
                            </h4>

                            {unscheduledMatches.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">All matches scheduled!</p>
                            ) : (
                                <div className="space-y-6">
                                    {sortedUnscheduledStages.map(stageName => (
                                        <div key={stageName} className="space-y-2">
                                            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stageName}</h5>
                                            <div className="space-y-2">
                                                {unscheduledByStage[stageName].map(match => (
                                                    <div
                                                        key={match.id}
                                                        className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:border-primary/50 transition-colors group cursor-pointer"
                                                        onClick={(e) => openEditModal(match, e)}
                                                    >
                                                        <div className="flex justify-between items-center text-sm font-medium text-slate-900 dark:text-slate-100">
                                                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                                {match.matchNumber && (
                                                                    <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 shrink-0">
                                                                        {formatMatchVenueLabel(match.matchNumber, match.venue, hasMultiVenues)}
                                                                    </span>
                                                                )}
                                                                <span className="truncate max-w-[40%]" title={match.homeTeamName || match.homeTeamPlaceholder}>{match.homeTeamName || match.homeTeamPlaceholder || 'TBD'}</span>
                                                                <span className="text-xs text-slate-400">vs</span>
                                                                <span className="truncate max-w-[40%] text-right" title={match.awayTeamName || match.awayTeamPlaceholder}>{match.awayTeamName || match.awayTeamPlaceholder || 'TBD'}</span>
                                                            </div>
                                                        </div>
                                                        <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Clock className="w-3 h-3" />
                                                            Schedule Now
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    */}
                </div>
            )}

            {/* Create/Edit Modal */}
            <MatchModal
                isOpen={showCreateModal}
                onClose={closeModal}
                onSuccess={handleMatchSaved}
                mode={editMatch ? 'edit' : 'create'}
                initialMatch={editMatch || undefined}
                defaultTournamentId={tournamentId}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                variant={confirmModal.variant}
            />
        </div>
    );
}

function TeamLogo({ url, name, className = '' }: { url?: string | null; name?: string; className?: string }) {
    return (
        <div className={`w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center overflow-hidden shrink-0 ${className}`}>
            {url ? (
                <img src={getImageUrl(url)} alt={name || ''} className="w-full h-full object-contain p-0.5" />
            ) : (
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    {name?.slice(0, 2)?.toUpperCase() || '?'}
                </span>
            )}
        </div>
    );
}

function MatchCard({ match, onClick, onEdit, onDelete, hasMultiVenues }: { match: MatchResponse, onClick: () => void, onEdit: (e: React.MouseEvent) => void, onDelete: (e: React.MouseEvent) => void, hasMultiVenues?: boolean }) {
    return (
        <div
            className="group relative bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-5 transition-all hover:shadow-xl hover:-translate-y-1 block overflow-hidden cursor-pointer"
            onClick={onClick}
        >
            {/* Admin Controls */}
            <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={onEdit}
                    className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400"
                    title="Edit Match"
                >
                    <PencilSimple className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={onDelete}
                    className="p-1.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded text-red-500 dark:text-red-400"
                    title="Delete Match"
                >
                    <Trash className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Status Indicator */}
            {['LIVE', 'ONGOING'].includes(match.status) && (
                <div className="absolute top-0 right-0 px-3 py-1 bg-red-600 text-white text-[10px] font-bold uppercase rounded-bl-xl shadow-lg animate-pulse z-0">
                    {formatMatchStatus(match.status)}
                </div>
            )}

            {/* Completed Indicator */}
            {['COMPLETED'].includes(match.status) && (
                <div className="absolute top-0 right-0 px-3 py-1 bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 text-[10px] font-bold uppercase rounded-bl-xl z-0">
                    {formatMatchStatus(match.status)}
                </div>
            )}


            <div className="flex justify-between items-start gap-2 mb-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider min-w-0">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span className="shrink-0">{match.kickOffTime}</span>
                    <span className="text-slate-500 truncate" title={match.venue?.trim() || 'Venue TBC'}>
                        • {match.venue?.trim() ? match.venue.trim() : 'Venue TBC'}
                    </span>
                </div>
                {/*
                  Match number, code and stage. Generated codes are long by construction
                  (20 characters of the tournament slug plus category and round abbreviations), so the
                  code and stage truncate with the full value in a tooltip. The number is the primary
                  identifier and never truncates.
                */}
                <div className="flex items-center justify-end gap-1.5 min-w-0">
                    {match.matchNumber !== undefined && match.matchNumber !== null && (
                        <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded font-bold shrink-0 whitespace-nowrap">
                            {formatMatchVenueLabel(match.matchNumber, match.venue, hasMultiVenues)}
                        </div>
                    )}
                    {match.matchCode && (
                        <div
                            className="text-[10px] font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded font-bold truncate max-w-[7rem]"
                            title={match.matchCode}
                        >
                            {match.matchCode}
                        </div>
                    )}
                    {match.stage?.name && (
                        <div
                            className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded truncate max-w-[7rem]"
                            title={match.stage.name}
                        >
                            {match.stage.name}
                        </div>
                    )}
                </div>
            </div>

            {/* Score Block */}
            <div className="flex items-center justify-between gap-4">
                {/* Home */}
                <div className="flex-1 flex items-center gap-2 min-w-0">
                    <TeamLogo url={match.homeTeamLogoUrl} name={match.homeTeamName || match.homeTeamName || match.homeTeamPlaceholder} />
                    <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-bold text-slate-900 dark:text-white text-base leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate" title={match.homeTeamName || match.homeTeamName || match.homeTeamPlaceholder}>
                            {formatTeamShortName(match.homeTeamShortName, match.homeTeamName || match.homeTeamName || match.homeTeamPlaceholder)}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Home</span>
                    </div>
                </div>

                {/* Score */}
                <div className="flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 min-w-[3.5rem] py-2 rounded-lg font-mono font-black text-xl text-slate-800 dark:text-white shrink-0">
                    {(match.status !== 'SCHEDULED' && match.homeScore !== undefined && match.awayScore !== undefined) ? (
                        <div className="flex gap-1">
                            <span>{match.homeScore}</span>
                            <span className="text-slate-400 opacity-50">:</span>
                            <span>{match.awayScore}</span>
                        </div>
                    ) : (
                        <span className="text-slate-400 text-sm">VS</span>
                    )}
                </div>

                {/* Away */}
                <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
                    <div className="flex flex-col items-end gap-0.5 min-w-0">
                        <span className="font-bold text-slate-900 dark:text-white text-base leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate text-right" title={match.awayTeamName || match.awayTeamName || match.awayTeamPlaceholder}>
                            {formatTeamShortName(match.awayTeamShortName, match.awayTeamName || match.awayTeamName || match.awayTeamPlaceholder)}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Away</span>
                    </div>
                    <TeamLogo url={match.awayTeamLogoUrl} name={match.awayTeamName || match.awayTeamName || match.awayTeamPlaceholder} />
                </div>
            </div>
        </div>
    );
}

