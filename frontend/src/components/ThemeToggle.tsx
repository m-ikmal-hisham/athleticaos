import { Monitor, Moon, Sun } from '@phosphor-icons/react';
import { useUIStore } from '@/store/ui.store';

type Theme = 'light' | 'dark' | 'system';

interface ThemeToggleProps {
    orientation?: 'horizontal' | 'vertical';
}

export const ThemeToggle = ({ orientation = 'horizontal' }: ThemeToggleProps) => {
    const { theme, setTheme } = useUIStore();

    const options: { value: Theme; icon: React.ReactNode; label: string }[] = [
        { value: 'light', icon: <Sun className="w-4 h-4" />, label: 'Light' },
        { value: 'system', icon: <Monitor className="w-4 h-4" />, label: 'System' },
        { value: 'dark', icon: <Moon className="w-4 h-4" />, label: 'Dark' },
    ];

    return (
        <div className={`flex items-center gap-1 p-1 rounded-xl bg-black/4 dark:bg-white/6 border border-black/10 dark:border-white/12 ${orientation === 'vertical' ? 'flex-col' : 'flex-row'}`}>
            {options.map((option) => (
                <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={`p-2 rounded-lg transition-all duration-150 ${theme === option.value
                        ? 'bg-white dark:bg-deep-navy text-black/90 dark:text-white/92 shadow-sm'
                        : 'text-black/60 dark:text-white/60 hover:text-black/90 dark:hover:text-white/92 hover:bg-black/4 dark:hover:bg-white/6'
                        }`}
                    title={option.label}
                >
                    {option.icon}
                </button>
            ))}
        </div>
    );
};
