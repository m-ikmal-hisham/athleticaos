import { useState, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Funnel } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { BottomSheet } from '@/components/public/BottomSheet';
import { Button } from '@/components/Button';

export interface FilterSheetButtonProps {
    /** Number of active filters (e.g. non-default category, state, etc.) */
    activeCount?: number;
    /** Content of the filters sheet */
    children: ReactNode;
    /** Called when the user taps Apply ("Guna" / "Apply") */
    onApply?: () => void;
    /** Called when the user taps Clear ("Kosongkan" / "Clear") */
    onClear?: () => void;
    /** Sheet title (defaults to "Filters" / "Penapis") */
    title?: string;
    /** Optional class on the trigger button */
    className?: string;
}

/**
 * Filter trigger button on phones (< 768px).
 * Displays "Penapis (n)" or "Filters (n)" and opens a BottomSheet containing the page's
 * filter fields with Apply and Clear actions.
 */
export function FilterSheetButton({
    activeCount = 0,
    children,
    onApply,
    onClear,
    title,
    className,
}: FilterSheetButtonProps) {
    const { t } = useTranslation(['common']);
    const [isOpen, setIsOpen] = useState(false);

    const sheetTitle = title || t('common:actions.filterButton', 'Filters');
    const buttonLabel =
        activeCount > 0
            ? t('common:actions.filterWithCount', { count: activeCount, defaultValue: `Filters (${activeCount})` })
            : t('common:actions.filterButton', { defaultValue: 'Filters' });

    const handleApply = () => {
        onApply?.();
        setIsOpen(false);
    };

    const handleClear = () => {
        onClear?.();
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={clsx(
                    'inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors',
                    activeCount > 0
                        ? 'bg-navy text-white shadow-xs border border-navy'
                        : 'bg-white/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-navy-tint',
                    className
                )}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
            >
                <Funnel size={18} weight={activeCount > 0 ? 'fill' : 'regular'} />
                <span>{buttonLabel}</span>
            </button>

            <BottomSheet
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title={sheetTitle}
            >
                <div className="space-y-5 px-2 pb-2">
                    {/* Filter fields */}
                    <div className="space-y-4 pt-1">{children}</div>

                    {/* Bottom action bar */}
                    <div className="flex items-center gap-3 pt-4 border-t border-line-subtle">
                        <Button
                            variant="secondary"
                            onClick={handleClear}
                            className="flex-1 min-h-[44px]"
                        >
                            {t('common:actions.clear', { defaultValue: 'Clear' })}
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleApply}
                            className="flex-1 min-h-[44px]"
                        >
                            {t('common:actions.apply', { defaultValue: 'Apply' })}
                        </Button>
                    </div>
                </div>
            </BottomSheet>
        </>
    );
}
