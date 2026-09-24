import type { ReactNode } from 'react';
import { CaretDown } from '@phosphor-icons/react';

interface CollapsibleDateGroupProps {
    date: string;
    matchCount: number;
    open: boolean;
    onToggle: () => void;
    children: ReactNode;
}

const formatScheduleDate = (date: string) =>
    date
        ? new Date(date).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })
        : 'Date TBD';

/** One match day in a schedule, with a header that folds its matches away. */
export const CollapsibleDateGroup = ({ date, matchCount, open, onToggle, children }: CollapsibleDateGroupProps) => (
    <section className="space-y-3">
        <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/80 dark:bg-slate-900/60 backdrop-blur border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition-colors text-left"
        >
            <span className="flex-1 text-base font-bold text-slate-800 dark:text-white">{formatScheduleDate(date)}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                {matchCount} {matchCount === 1 ? 'match' : 'matches'}
            </span>
            <CaretDown
                weight="bold"
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
        </button>
        {open && children}
    </section>
);

interface ExpandAllToggleProps {
    allOpen: boolean;
    onChange: (open: boolean) => void;
}

export const ExpandAllToggle = ({ allOpen, onChange }: ExpandAllToggleProps) => (
    <button
        type="button"
        onClick={() => onChange(!allOpen)}
        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
    >
        {allOpen ? 'Collapse all days' : 'Expand all days'}
    </button>
);
