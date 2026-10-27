import { CaretLeft, CaretRight, CalendarBlank } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { getDateLocale } from '@/utils/malaysiaDate';

interface CalendarHeaderProps {
    currentDate: Date;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    isMonthView?: boolean;
}

export function CalendarHeader({
    currentDate,
    onPrev,
    onNext,
    onToday,
    isMonthView = true,
}: CalendarHeaderProps) {
    const { t, i18n } = useTranslation(['calendar', 'common']);
    const locale = getDateLocale(i18n.language);

    const title = format(currentDate, 'MMMM yyyy', { locale });
    const prevLabel = isMonthView ? t('calendar:previousMonth') : t('calendar:previousWeek');
    const nextLabel = isMonthView ? t('calendar:nextMonth') : t('calendar:nextWeek');

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-[14px] bg-surface-card border border-line-subtle shadow-xs">
            {/* Title & Navigation */}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={onPrev}
                    aria-label={prevLabel}
                    className="min-w-[40px] min-h-[40px] sm:min-w-[36px] sm:min-h-[36px] inline-flex items-center justify-center rounded-[10px] bg-surface-sunken hover:bg-line-subtle text-content-primary border border-line-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                    <CaretLeft size={18} />
                </button>

                <h2 className="text-base sm:text-lg font-bold text-content-primary min-w-[150px] sm:min-w-[170px] text-center select-none capitalize">
                    {title}
                </h2>

                <button
                    type="button"
                    onClick={onNext}
                    aria-label={nextLabel}
                    className="min-w-[40px] min-h-[40px] sm:min-w-[36px] sm:min-h-[36px] inline-flex items-center justify-center rounded-[10px] bg-surface-sunken hover:bg-line-subtle text-content-primary border border-line-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                    <CaretRight size={18} />
                </button>

                <button
                    type="button"
                    onClick={onToday}
                    aria-label={t('calendar:today')}
                    className="min-h-[40px] sm:min-h-[36px] px-3 ml-1 sm:ml-2 rounded-[10px] bg-surface-sunken hover:bg-line-subtle text-content-primary border border-line-subtle text-xs font-semibold inline-flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                    <CalendarBlank size={16} />
                    <span>{t('calendar:today')}</span>
                </button>
            </div>
        </div>
    );
}
