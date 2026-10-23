import { useLegalLanguage } from '@/hooks/useLegalLanguage';
import { clsx } from 'clsx';

interface LanguageSwitchProps {
    className?: string;
}

export function LanguageSwitch({ className }: LanguageSwitchProps) {
    const { language, setLanguage } = useLegalLanguage();

    return (
        <div
            role="group"
            aria-label="Language"
            className={clsx(
                'inline-flex items-center p-1 rounded-xl bg-surface-sunken border border-line-subtle',
                className
            )}
        >
            <button
                type="button"
                onClick={() => setLanguage('en')}
                className={clsx(
                    'min-h-[44px] min-w-[44px] px-3.5 py-1 text-xs font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-navy-tint',
                    language === 'en'
                        ? 'bg-brand text-white shadow-sm'
                        : 'text-content-secondary hover:text-content-primary'
                )}
                aria-pressed={language === 'en'}
            >
                EN
            </button>
            <button
                type="button"
                onClick={() => setLanguage('ms')}
                className={clsx(
                    'min-h-[44px] min-w-[44px] px-3.5 py-1 text-xs font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-navy-tint',
                    language === 'ms'
                        ? 'bg-brand text-white shadow-sm'
                        : 'text-content-secondary hover:text-content-primary'
                )}
                aria-pressed={language === 'ms'}
            >
                BM
            </button>
        </div>
    );
}
