import { useTranslation } from 'react-i18next';
import { Moon, Sun } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { usePublicThemeToggle } from '@/hooks/usePublicThemeToggle';

interface PublicThemeToggleProps {
    className?: string;
}

/** Desktop header icon button (sun in dark mode, moon in light mode). */
export function PublicThemeToggle({ className }: PublicThemeToggleProps) {
    const { t } = useTranslation();
    const { effectiveTheme, toggleTheme } = usePublicThemeToggle();
    const isDark = effectiveTheme === 'dark';
    const Icon = isDark ? Sun : Moon;

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
            title={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
            className={clsx(
                'inline-flex items-center justify-center w-11 h-11 rounded-xl bg-surface-sunken border border-line-subtle text-content-secondary hover:text-content-primary motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-navy-tint',
                className
            )}
        >
            <Icon size={20} weight="duotone" aria-hidden="true" />
        </button>
    );
}
