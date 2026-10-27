import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Funnel, X, ArrowCounterClockwise } from '@phosphor-icons/react';
import { PublicTournamentSummary } from '@/api/public.api';
import { BottomSheet } from '@/components/public/BottomSheet';
import { formatTournamentLevel, formatCompetitionType } from '@/utils/formatters';

export interface CalendarFilterState {
    status: 'live' | 'upcoming' | 'completed' | null;
    level: string | null;
    organiser: string | null;
    competitionType: string | null;
}

interface CalendarFiltersProps {
    tournaments: PublicTournamentSummary[];
    filters: CalendarFilterState;
    onChange: (next: CalendarFilterState) => void;
    isMobileOpen: boolean;
    onMobileClose: () => void;
    onMobileOpen: () => void;
}

export function CalendarFilters({
    tournaments,
    filters,
    onChange,
    isMobileOpen,
    onMobileClose,
    onMobileOpen,
}: CalendarFiltersProps) {
    const { t } = useTranslation(['calendar', 'common']);

    // Derive distinct options from loaded tournaments
    const distinctLevels = useMemo(() => {
        const set = new Set<string>();
        tournaments.forEach(t => {
            if (t.level) set.add(t.level);
        });
        return Array.from(set).sort();
    }, [tournaments]);

    const distinctOrganisers = useMemo(() => {
        const set = new Set<string>();
        tournaments.forEach(t => {
            if (t.organiserName) set.add(t.organiserName);
        });
        return Array.from(set).sort();
    }, [tournaments]);

    const distinctCompetitionTypes = useMemo(() => {
        const set = new Set<string>();
        tournaments.forEach(t => {
            if (t.competitionType) set.add(t.competitionType);
        });
        return Array.from(set).sort();
    }, [tournaments]);

    const activeFilterCount =
        (filters.status ? 1 : 0) +
        (filters.level ? 1 : 0) +
        (filters.organiser ? 1 : 0) +
        (filters.competitionType ? 1 : 0);

    const handleClearAll = () => {
        onChange({
            status: null,
            level: null,
            organiser: null,
            competitionType: null,
        });
    };

    const getLevelLabel = (level: string) => {
        return t(`calendar:level.${level.toLowerCase()}`, { defaultValue: formatTournamentLevel(level, t) });
    };

    const getCompTypeLabel = (type: string) => {
        return t(`calendar:competitionType.${type.toLowerCase()}`, { defaultValue: formatCompetitionType(type, t) });
    };

    const renderFilterControls = (isMobile = false) => (
        <div className={isMobile ? 'space-y-4 p-2' : 'flex flex-wrap items-center gap-2'}>
            {/* Status Selector */}
            <div className={isMobile ? 'space-y-1.5' : ''}>
                {isMobile && (
                    <label className="text-xs font-semibold text-content-secondary uppercase tracking-wider">
                        {t('calendar:filterByStatus')}
                    </label>
                )}
                <select
                    value={filters.status ?? ''}
                    onChange={e => onChange({ ...filters, status: (e.target.value as CalendarFilterState['status']) || null })}
                    aria-label={t('calendar:filterByStatus')}
                    className="h-9 px-3 rounded-[10px] bg-surface-card border border-line-subtle text-xs font-medium text-content-primary focus:outline-none focus:ring-2 focus:ring-brand/50"
                >
                    <option value="">{t('calendar:allStatuses')}</option>
                    <option value="live">{t('calendar:status.live')}</option>
                    <option value="upcoming">{t('calendar:status.upcoming')}</option>
                    <option value="completed">{t('calendar:status.completed')}</option>
                </select>
            </div>

            {/* Level Selector */}
            {distinctLevels.length > 0 && (
                <div className={isMobile ? 'space-y-1.5' : ''}>
                    {isMobile && (
                        <label className="text-xs font-semibold text-content-secondary uppercase tracking-wider">
                            {t('calendar:filterByLevel')}
                        </label>
                    )}
                    <select
                        value={filters.level ?? ''}
                        onChange={e => onChange({ ...filters, level: e.target.value || null })}
                        aria-label={t('calendar:filterByLevel')}
                        className="h-9 px-3 rounded-[10px] bg-surface-card border border-line-subtle text-xs font-medium text-content-primary focus:outline-none focus:ring-2 focus:ring-brand/50"
                    >
                        <option value="">{t('calendar:allLevels')}</option>
                        {distinctLevels.map(lvl => (
                            <option key={lvl} value={lvl}>
                                {getLevelLabel(lvl)}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Competition Type Selector */}
            {distinctCompetitionTypes.length > 0 && (
                <div className={isMobile ? 'space-y-1.5' : ''}>
                    {isMobile && (
                        <label className="text-xs font-semibold text-content-secondary uppercase tracking-wider">
                            {t('calendar:filterByType')}
                        </label>
                    )}
                    <select
                        value={filters.competitionType ?? ''}
                        onChange={e => onChange({ ...filters, competitionType: e.target.value || null })}
                        aria-label={t('calendar:filterByType')}
                        className="h-9 px-3 rounded-[10px] bg-surface-card border border-line-subtle text-xs font-medium text-content-primary focus:outline-none focus:ring-2 focus:ring-brand/50"
                    >
                        <option value="">{t('calendar:allTypes')}</option>
                        {distinctCompetitionTypes.map(ct => (
                            <option key={ct} value={ct}>
                                {getCompTypeLabel(ct)}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Organiser Selector */}
            {distinctOrganisers.length > 0 && (
                <div className={isMobile ? 'space-y-1.5' : ''}>
                    {isMobile && (
                        <label className="text-xs font-semibold text-content-secondary uppercase tracking-wider">
                            {t('calendar:filterByOrganiser')}
                        </label>
                    )}
                    <select
                        value={filters.organiser ?? ''}
                        onChange={e => onChange({ ...filters, organiser: e.target.value || null })}
                        aria-label={t('calendar:filterByOrganiser')}
                        className="h-9 px-3 rounded-[10px] bg-surface-card border border-line-subtle text-xs font-medium text-content-primary focus:outline-none focus:ring-2 focus:ring-brand/50 max-w-[200px] truncate"
                    >
                        <option value="">{t('calendar:allOrganisers')}</option>
                        {distinctOrganisers.map(org => (
                            <option key={org} value={org}>
                                {org}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Clear Filters Button */}
            {activeFilterCount > 0 && (
                <button
                    type="button"
                    onClick={handleClearAll}
                    className="h-9 px-2.5 rounded-[10px] bg-surface-sunken hover:bg-line-subtle text-content-secondary hover:text-content-primary text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                >
                    <ArrowCounterClockwise size={14} />
                    <span>{t('calendar:clearFilters')}</span>
                </button>
            )}
        </div>
    );

    return (
        <div>
            {/* Desktop Filters (>= 1024px) */}
            <div className="hidden lg:block">
                {renderFilterControls(false)}
            </div>

            {/* Mobile Filter Button (< 1024px) */}
            <div className="lg:hidden">
                <button
                    type="button"
                    onClick={onMobileOpen}
                    className="min-h-[44px] px-3.5 rounded-[10px] bg-surface-card border border-line-subtle text-xs font-semibold text-content-primary hover:bg-surface-sunken inline-flex items-center gap-2 shadow-xs transition-colors"
                >
                    <Funnel size={16} />
                    <span>{t('calendar:filters')}</span>
                    {activeFilterCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-brand text-white text-[11px] font-bold inline-flex items-center justify-center">
                            {activeFilterCount}
                        </span>
                    )}
                </button>

                {/* Mobile Filter Bottom Sheet */}
                <BottomSheet
                    isOpen={isMobileOpen}
                    onClose={onMobileClose}
                    title={t('calendar:filters')}
                >
                    <div className="pb-6">
                        {renderFilterControls(true)}
                        {activeFilterCount > 0 && (
                            <div className="mt-6 pt-4 border-t border-line-subtle px-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleClearAll();
                                        onMobileClose();
                                    }}
                                    className="w-full py-2.5 rounded-[10px] bg-surface-sunken text-content-secondary text-xs font-semibold hover:bg-line-subtle transition-colors flex items-center justify-center gap-2"
                                >
                                    <X size={16} />
                                    <span>{t('calendar:clearFilters')}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </BottomSheet>
            </div>
        </div>
    );
}
