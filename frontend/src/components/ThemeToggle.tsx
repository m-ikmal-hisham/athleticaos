import { Monitor, Moon, Sun } from '@phosphor-icons/react';
import { useUIStore } from '@/store/ui.store';

type Theme = 'light' | 'dark' | 'system';

export const ThemeToggle = () => {
    const { theme, setTheme } = useUIStore();

    const options: { value: Theme; icon: React.ReactNode; label: string }[] = [
        { value: 'light', icon: <Sun className="w-4 h-4" />, label: 'Light' },
        { value: 'system', icon: <Monitor className="w-4 h-4" />, label: 'System' },
        { value: 'dark', icon: <Moon className="w-4 h-4" />, label: 'Dark' },
    ];

    return (
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5">
            {options.map((option) => (
                <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={`p-2 rounded-lg transition-all duration-200 ${theme === option.value
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                    title={option.label}
                >
                    {option.icon}
                </button>
            ))}
        </div>
    );
};
