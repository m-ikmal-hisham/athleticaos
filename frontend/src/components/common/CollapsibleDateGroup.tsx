import type { ReactNode } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { parseCalendarDate, getDateLocale } from '@/utils/malaysiaDate';

interface CollapsibleDateGroupProps {
    date: string;
    matchCount: number;
    open: boolean;
    onToggle: () => void;
    children: ReactNode;
}

/** One match day in a schedule, with a header that folds its matches away. */
export const CollapsibleDateGroup = ({ date, matchCount, open, onToggle, children }: CollapsibleDateGroupProps) => {
    const { t, i18n } = useTranslation('common');

    const dateObj = parseCalendarDate(date);
    const dateLabel = dateObj
        ? format(dateObj, 'EEEE, d MMMM', { locale: getDateLocale(i18n.language) })
        : t('actions.dateTbd');

    return (
        <section className="space-y-3">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={open}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/80 dark:bg-slate-900/60 backdrop-blur border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-navy transition-colors text-left"
            >
                <span className="flex-1 text-base font-bold text-slate-800 dark:text-white">{dateLabel}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    {t('counts.matchCount', { count: matchCount })}
                </span>
                <CaretDown
                    className={`w-4 h-4 text-black/60 dark:text-white/60 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </button>
            {open && children}
        </section>
    );
};

interface ExpandAllToggleProps {
    allOpen: boolean;
    onChange: (open: boolean) => void;
    /** What the groups are called: "days" for a schedule, "pools" for standings. */
    noun?: string;
}

export const ExpandAllToggle = ({ allOpen, onChange, noun = 'days' }: ExpandAllToggleProps) => {
    const { t } = useTranslation('common');
    const label = noun === 'days'
        ? (allOpen ? t('actions.collapseAllDays') : t('actions.expandAllDays'))
        : (allOpen ? t('actions.collapseAll', { noun }) : t('actions.expandAll', { noun }));

    return (
        <button
            type="button"
            onClick={() => onChange(!allOpen)}
            className="text-xs font-semibold text-navy dark:text-navy-tint hover:underline whitespace-nowrap"
        >
            {label}
        </button>
    );
};
